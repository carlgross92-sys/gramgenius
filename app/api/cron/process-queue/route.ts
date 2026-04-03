import prisma from "@/lib/prisma";
import { generateContentBrief } from "@/lib/content-brief";
import { searchAnimalVideo, downloadAndSaveVideo } from "@/lib/pexels";
import { generateImage } from "@/lib/openai";
import { generateVoiceover, generateVoiceoverScript, checkCredits } from "@/lib/elevenlabs";

export const maxDuration = 300;

const MAX_CHAINS = 10;

export async function GET(request: Request) {
  try {
    // ── Find next queued job — process regardless of engine state ───────
    const job = await prisma.contentJob.findFirst({
      where: {
        status: "QUEUED",
        retryCount: { lt: 3 },
      },
      orderBy: { createdAt: "asc" },
    });

    if (!job) {
      return Response.json({ message: "No jobs in queue", processed: 0 });
    }

    console.log(`[ProcessQueue] Job: ${job.topic?.substring(0, 60)}`);

    // Mark as processing
    await prisma.contentJob.update({
      where: { id: job.id },
      data: { status: "PROCESSING", startedAt: new Date() },
    });

    // ── Determine brand type from topic content ──────────────────────────
    const topicLower = (job.topic || "").toLowerCase();
    const isConservative =
      topicLower.includes("patriot") ||
      topicLower.includes("american") ||
      topicLower.includes("conservative") ||
      topicLower.includes("trump") ||
      topicLower.includes("maga") ||
      topicLower.includes("freedom") ||
      topicLower.includes("faith") ||
      topicLower.includes("woman in") ||
      topicLower.includes("women") ||
      topicLower.includes("flag") ||
      topicLower.includes("bible") ||
      topicLower.includes("prayer") ||
      topicLower.includes("sundress") ||
      topicLower.includes("blazer");

    // Also check brand profile
    let brandIsConservative = false;
    if (job.brandProfileId) {
      const brand = await prisma.brandProfile.findUnique({
        where: { id: job.brandProfileId },
      });
      if (brand) {
        brandIsConservative =
          brand.instagramHandle === "karinagarcia5019" ||
          brand.name.toLowerCase().includes("karina");
      }
    }

    const brandType =
      isConservative || brandIsConservative ? "conservative" : "funny_animals";
    const brandVoice =
      brandType === "conservative" ? "Bold & Direct" : "Humorous";
    const audience =
      brandType === "conservative"
        ? "Conservative Americans who love patriotism and traditional values"
        : "Animal lovers who want funny and cute pet content";

    console.log(`[ProcessQueue] Brand type: ${brandType}`);

    // ── STEP 1: Generate unified content brief ───────────────────────────
    console.log("[ProcessQueue] Generating content brief...");
    const brief = await generateContentBrief(brandType, brandVoice, audience);
    console.log(
      `[ProcessQueue] Brief: query="${brief.pexelsQuery}" hook="${brief.hook}"`
    );

    // ── STEP 2: Find matching video from Pexels ─────────────────────────
    let videoUrl: string | null = null;
    let imageUrl: string | null = null;
    let animal: string | null = null;
    const qualityNotes: string[] = [];

    // Extract search terms from the brief
    const pexelsQuery = brief.pexelsQuery || "funny animal";
    animal = pexelsQuery.split(" ").pop() || "animal";

    try {
      console.log(`[ProcessQueue] Searching Pexels: "${pexelsQuery}"`);
      const pexelsResult = await searchAnimalVideo(
        brief.visualDescription,
        pexelsQuery
      );
      const savedUrl = await downloadAndSaveVideo(
        pexelsResult.url,
        `content-${job.id}-${Date.now()}`
      );
      videoUrl = savedUrl;
      qualityNotes.push(`video: pexels ok (query: ${pexelsQuery})`);
      console.log("[ProcessQueue] Video found");
    } catch (videoErr) {
      qualityNotes.push(
        `video: pexels failed - ${videoErr instanceof Error ? videoErr.message : "unknown"}`
      );
      console.log("[ProcessQueue] Pexels failed, trying DALL-E...");
      try {
        const imageResult = await generateImage(
          `${brief.visualDescription}. Photorealistic, cinematic, portrait 9:16, no text.`,
          "1024x1792",
          "hd",
          "vivid"
        );
        imageUrl = imageResult.imageUrl;
        qualityNotes.push("image: dalle ok");
      } catch (imgErr) {
        qualityNotes.push(
          `image: dalle failed - ${imgErr instanceof Error ? imgErr.message : "unknown"}`
        );
      }
    }

    // ── STEP 3: Generate voiceover from brief ────────────────────────────
    let voiceoverUrl: string | null = null;
    try {
      const credits = await checkCredits();
      if (credits >= 100) {
        // Use the brief's voiceover script (coherent with video + caption)
        const script =
          brief.voiceoverScript ||
          generateVoiceoverScript(job.topic, "", animal || "animal");
        console.log(`[ProcessQueue] Voiceover script: "${script}"`);
        const voResult = await generateVoiceover(script);
        if (voResult.url) {
          voiceoverUrl = voResult.url;
          qualityNotes.push("voiceover: ok");
        } else {
          qualityNotes.push(
            `voiceover: skipped - ${voResult.error || "no url"}`
          );
        }
      } else {
        qualityNotes.push(`voiceover: skipped - low credits (${credits})`);
      }
    } catch (voErr) {
      qualityNotes.push(
        `voiceover: failed - ${voErr instanceof Error ? voErr.message : "unknown"}`
      );
    }

    // ── STEP 4: Build caption from brief ─────────────────────────────────
    const caption = [brief.captionHook, "", brief.captionBody, "", brief.captionCta]
      .join("\n")
      .trim();
    const hashtags = brief.hashtags;

    qualityNotes.push(`caption: ${caption.length} chars`);
    qualityNotes.push(`brief: hook="${brief.hook}" trigger=${brief.emotionalTrigger}`);

    // ── STEP 5: Calculate quality score ──────────────────────────────────
    let qualityScore = 0;
    if (videoUrl) qualityScore += 50;
    else if (imageUrl) qualityScore += 25;
    if (voiceoverUrl) qualityScore += 25;
    if (caption.length > 50) qualityScore += 15;
    if (hashtags && hashtags.length > 50) qualityScore += 10;

    const passed = (videoUrl !== null || imageUrl !== null) && qualityScore >= 25;
    const finalStatus = passed ? "COMPLETED" : "QUALITY_FAILED";

    console.log(
      `[ProcessQueue] Quality: ${qualityScore} - ${passed ? "PASSED" : "FAILED"}`
    );

    // ── STEP 6: Save to MediaLibrary ─────────────────────────────────────
    try {
      await prisma.mediaLibrary.create({
        data: {
          type: videoUrl ? "VIDEO" : "IMAGE",
          url: videoUrl || imageUrl || "",
          thumbnailUrl: undefined,
          topic: job.topic || brief.hook,
          caption,
          hashtags,
          postType: videoUrl ? "REEL" : "FEED",
          status: "SAVED",
          voiceoverUrl: voiceoverUrl || undefined,
          videoSource: videoUrl ? "PEXELS" : "DALLE",
          brandProfileId: job.brandProfileId || undefined,
        },
      });
    } catch {
      // Non-critical
    }

    // ── STEP 7: Update job ───────────────────────────────────────────────
    await prisma.contentJob.update({
      where: { id: job.id },
      data: {
        status: finalStatus,
        caption,
        hashtags,
        animal,
        videoUrl,
        imageUrl,
        voiceoverUrl,
        voiceStatus: voiceoverUrl ? "OK" : "FAILED",
        modelUsed: "content-brief + pexels + elevenlabs",
        qualityScore,
        qualityNotes: qualityNotes.join("; "),
        completedAt: new Date(),
        failReason: !passed
          ? `Quality score ${qualityScore} below threshold`
          : null,
      },
    });

    // ── Chain: publish completed jobs ─────────────────────────────────────
    try {
      const publishUrl = new URL(
        "/api/cron/publish-scheduled",
        request.url
      ).toString();
      fetch(publishUrl, {
        headers: {
          authorization: request.headers.get("authorization") || "",
        },
      }).catch(() => {});
    } catch {}

    // ── Chain: process next queued job ────────────────────────────────────
    const url = new URL(request.url);
    const currentChain = parseInt(url.searchParams.get("chain") || "0", 10);

    if (currentChain < MAX_CHAINS) {
      const moreQueued = await prisma.contentJob.count({
        where: { status: "QUEUED", retryCount: { lt: 3 } },
      });

      if (moreQueued > 0) {
        await new Promise((r) => setTimeout(r, 3000));
        try {
          const nextUrl = new URL("/api/cron/process-queue", request.url);
          nextUrl.searchParams.set("chain", String(currentChain + 1));
          fetch(nextUrl.toString(), {
            headers: {
              authorization: request.headers.get("authorization") || "",
            },
          }).catch(() => {});
        } catch {}
      }
    }

    return Response.json({
      success: true,
      passed,
      qualityScore,
      hasVideo: !!videoUrl,
      hasImage: !!imageUrl,
      hasVoiceover: !!voiceoverUrl,
      pexelsQuery: brief.pexelsQuery,
      hook: brief.hook,
      voiceoverScript: brief.voiceoverScript,
      qualityNotes,
    });
  } catch (error) {
    console.error("[ProcessQueue] Error:", error);

    // Reset stuck processing jobs
    await prisma.contentJob
      .updateMany({
        where: { status: "PROCESSING" },
        data: { status: "QUEUED", retryCount: { increment: 1 } },
      })
      .catch(() => {});

    return Response.json(
      {
        error: error instanceof Error ? error.message : "Queue processing failed",
      },
      { status: 500 }
    );
  }
}

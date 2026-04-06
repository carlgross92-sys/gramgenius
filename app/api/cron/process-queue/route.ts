import prisma from "@/lib/prisma";
import {
  generateContentBrief,
  KARINA_PEXELS_QUERIES,
} from "@/lib/content-brief";
import { searchAnimalVideo, downloadAndSaveVideo } from "@/lib/pexels";
import { generateImage } from "@/lib/openai";
import { generateVoiceover, checkCredits } from "@/lib/elevenlabs";

export const maxDuration = 300;

const MAX_CHAINS = 10;

export async function GET(request: Request) {
  try {
    // ── Find next queued job ─────────────────────────────────────────────
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

    await prisma.contentJob.update({
      where: { id: job.id },
      data: { status: "PROCESSING", startedAt: new Date() },
    });

    // ── Determine brand type ─────────────────────────────────────────────
    const topicLower = (job.topic || "").toLowerCase();
    const isConservativeByTopic =
      topicLower.includes("patriot") ||
      topicLower.includes("american") ||
      topicLower.includes("conservative") ||
      topicLower.includes("trump") ||
      topicLower.includes("maga") ||
      topicLower.includes("freedom") ||
      topicLower.includes("faith") ||
      topicLower.includes("woman") ||
      topicLower.includes("women") ||
      topicLower.includes("flag") ||
      topicLower.includes("bible") ||
      topicLower.includes("prayer") ||
      topicLower.includes("sundress") ||
      topicLower.includes("blazer") ||
      topicLower.includes("church") ||
      topicLower.includes("god");

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

    const isConservative = isConservativeByTopic || brandIsConservative;
    const brandType = isConservative ? "conservative" : "funny_animals";

    console.log(`[ProcessQueue] Brand type: ${brandType}`);

    // ── STEP 1: Generate matched content brief ───────────────────────────
    const brief = await generateContentBrief(brandType, "", "");
    console.log(
      `[ProcessQueue] Brief: useDalle=${brief.useDallePrimary} hook="${brief.hook}" idx=${brief.templateIndex}`
    );

    let videoUrl: string | null = null;
    let imageUrl: string | null = null;
    const qualityNotes: string[] = [];

    // ── STEP 2: Get media ────────────────────────────────────────────────
    if (brief.useDallePrimary) {
      // ── CONSERVATIVE: DALL-E first, Pexels fallback ────────────────────
      console.log("[ProcessQueue] DALL-E primary for conservative brand");
      try {
        const dalleResult = await generateImage(
          brief.visualDescription,
          "1024x1792",
          "hd",
          "vivid"
        );
        imageUrl = dalleResult.imageUrl;
        qualityNotes.push(
          `image: dalle ok (template ${brief.templateIndex})`
        );
        console.log("[ProcessQueue] DALL-E image generated");
      } catch (dalleErr) {
        qualityNotes.push(
          `image: dalle failed - ${dalleErr instanceof Error ? dalleErr.message : "unknown"}`
        );
        console.log("[ProcessQueue] DALL-E failed, trying Pexels backup...");

        // Pexels backup with curated queries
        const pexelsQuery =
          KARINA_PEXELS_QUERIES[
            Math.floor(Math.random() * KARINA_PEXELS_QUERIES.length)
          ];
        try {
          const pexelsResult = await searchAnimalVideo(
            brief.visualDescription,
            pexelsQuery
          );
          const savedUrl = await downloadAndSaveVideo(
            pexelsResult.url,
            `content-${job.id}-${Date.now()}`
          );
          videoUrl = savedUrl;
          qualityNotes.push(`video: pexels backup ok (query: ${pexelsQuery})`);
        } catch (pexErr) {
          qualityNotes.push(
            `video: pexels backup failed - ${pexErr instanceof Error ? pexErr.message : "unknown"}`
          );
        }
      }
    } else {
      // ── ANIMALS: Pexels first, DALL-E fallback ─────────────────────────
      console.log("[ProcessQueue] Pexels primary for animal brand");
      const pexelsQuery = brief.pexelsQuery || "funny dog";
      try {
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
      } catch (videoErr) {
        qualityNotes.push(
          `video: pexels failed - ${videoErr instanceof Error ? videoErr.message : "unknown"}`
        );
        console.log("[ProcessQueue] Pexels failed, trying DALL-E fallback...");
        try {
          const dalleResult = await generateImage(
            `A hilarious viral-worthy photo of ${job.topic}. Bright colors, expressive animal face, Instagram-ready. Photorealistic portrait 9:16.`,
            "1024x1792",
            "hd",
            "vivid"
          );
          imageUrl = dalleResult.imageUrl;
          qualityNotes.push("image: dalle fallback ok");
        } catch (imgErr) {
          qualityNotes.push(
            `image: dalle fallback failed - ${imgErr instanceof Error ? imgErr.message : "unknown"}`
          );
        }
      }
    }

    // ── STEP 3: Voiceover ────────────────────────────────────────────────
    let voiceoverUrl: string | null = null;
    try {
      const credits = await checkCredits();
      if (credits >= 100) {
        const script = brief.voiceoverScript;
        console.log(`[ProcessQueue] Voice: "${script}"`);
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

    // ── STEP 4: Caption from brief templates ─────────────────────────────
    const caption = [brief.captionHook, "", brief.captionBody, "", brief.captionCta]
      .join("\n")
      .trim();
    const hashtags = brief.hashtags;

    qualityNotes.push(`caption: ${caption.length} chars`);
    qualityNotes.push(
      `brief: hook="${brief.hook}" trigger=${brief.emotionalTrigger} dalleIdx=${brief.templateIndex}`
    );

    // ── STEP 5: Quality score ────────────────────────────────────────────
    let qualityScore = 0;
    if (videoUrl) qualityScore += 50;
    else if (imageUrl) qualityScore += 40; // DALL-E images are high quality
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
        animal: videoUrl ? brief.pexelsQuery : null,
        videoUrl,
        imageUrl,
        voiceoverUrl,
        voiceStatus: voiceoverUrl ? "OK" : "FAILED",
        modelUsed: brief.useDallePrimary
          ? "dalle-3 + elevenlabs"
          : "pexels + elevenlabs",
        qualityScore,
        qualityNotes: qualityNotes.join("; "),
        completedAt: new Date(),
        failReason: !passed
          ? `Quality score ${qualityScore} below threshold`
          : null,
      },
    });

    // ── Chain: publish then process next ──────────────────────────────────
    try {
      fetch(
        new URL("/api/cron/publish-scheduled", request.url).toString(),
        { headers: { authorization: request.headers.get("authorization") || "" } }
      ).catch(() => {});
    } catch {}

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
            headers: { authorization: request.headers.get("authorization") || "" },
          }).catch(() => {});
        } catch {}
      }
    }

    return Response.json({
      success: true,
      passed,
      qualityScore,
      brandType,
      usedDalle: brief.useDallePrimary,
      dallePrompt: brief.useDallePrimary
        ? brief.visualDescription.substring(0, 120)
        : null,
      hasVideo: !!videoUrl,
      hasImage: !!imageUrl,
      imageUrl: imageUrl || null,
      hasVoiceover: !!voiceoverUrl,
      pexelsQuery: brief.pexelsQuery,
      hook: brief.hook,
      voiceoverScript: brief.voiceoverScript,
      caption: caption.substring(0, 200),
      qualityNotes,
    });
  } catch (error) {
    console.error("[ProcessQueue] Error:", error);
    await prisma.contentJob
      .updateMany({
        where: { status: "PROCESSING" },
        data: { status: "QUEUED", retryCount: { increment: 1 } },
      })
      .catch(() => {});
    return Response.json(
      { error: error instanceof Error ? error.message : "Queue processing failed" },
      { status: 500 }
    );
  }
}

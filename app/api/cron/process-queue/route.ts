import prisma from "@/lib/prisma";
import {
  generateContentBrief,
  KARINA_PEXELS_QUERIES,
  KARINA_RUNWAY_PROMPT,
} from "@/lib/content-brief";
import { searchAnimalVideo, downloadAndSaveVideo } from "@/lib/pexels";
import { generateImage } from "@/lib/openai";
import { imageToVideo, pollTask, downloadVideo } from "@/lib/runway";
import { generateVoiceover, checkCredits } from "@/lib/elevenlabs";

export const maxDuration = 300;

const MAX_CHAINS = 10;

export async function GET(request: Request) {
  try {
    // ── Find next queued job ─────────────────────────────────────────────
    const job = await prisma.contentJob.findFirst({
      where: { status: "QUEUED", retryCount: { lt: 3 } },
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

    // ── Generate matched content brief ───────────────────────────────────
    const brief = await generateContentBrief(brandType, "", "");
    console.log(
      `[ProcessQueue] Brief idx=${brief.templateIndex} hook="${brief.hook}"`
    );

    let videoUrl: string | null = null;
    let imageUrl: string | null = null;
    const qualityNotes: string[] = [];
    let runwayTaskId: string | null = null;

    // ══════════════════════════════════════════════════════════════════════
    // CONSERVATIVE: DALL-E image → Runway ML video → ElevenLabs voice
    // ══════════════════════════════════════════════════════════════════════
    if (brief.useDallePrimary) {
      console.log("[ProcessQueue] CONSERVATIVE pipeline: DALL-E → Runway → Voice");

      // ── Step A: DALL-E image ───────────────────────────────────────────
      let dalleImageUrl: string | null = null;
      try {
        console.log(`[ProcessQueue] DALL-E prompt: ${brief.visualDescription.substring(0, 80)}...`);
        const dalleResult = await generateImage(
          brief.visualDescription,
          "1024x1792",
          "hd",
          "vivid"
        );
        dalleImageUrl = dalleResult.imageUrl;
        imageUrl = dalleImageUrl; // Keep as fallback if Runway fails
        qualityNotes.push(`dalle: ok (template ${brief.templateIndex})`);
        console.log(`[ProcessQueue] DALL-E image: ${dalleImageUrl.substring(0, 60)}...`);
      } catch (dalleErr) {
        qualityNotes.push(
          `dalle: failed - ${dalleErr instanceof Error ? dalleErr.message : "unknown"}`
        );
        console.error("[ProcessQueue] DALL-E failed:", dalleErr);
      }

      // ── Step B: Runway ML animate image → video ────────────────────────
      if (dalleImageUrl) {
        try {
          console.log("[ProcessQueue] Sending to Runway ML for animation...");
          runwayTaskId = await imageToVideo(
            dalleImageUrl,
            KARINA_RUNWAY_PROMPT,
            5,
            "720:1280"
          );
          console.log(`[ProcessQueue] Runway task: ${runwayTaskId}`);
          qualityNotes.push(`runway: task ${runwayTaskId}`);

          // Poll for completion (max ~3 min to stay within 300s function limit)
          const result = await pollTask(runwayTaskId, 180000);

          if (result.status === "SUCCEEDED" && result.outputUrl) {
            console.log(`[ProcessQueue] Runway SUCCEEDED: ${result.outputUrl.substring(0, 60)}...`);
            // Download and save to Vercel Blob
            const savedUrl = await downloadVideo(
              result.outputUrl,
              `karina-${job.id}-${Date.now()}.mp4`
            );
            videoUrl = savedUrl;
            qualityNotes.push("runway: video saved");
            console.log(`[ProcessQueue] Video saved: ${savedUrl.substring(0, 60)}...`);
          } else {
            qualityNotes.push(`runway: status=${result.status}`);
          }
        } catch (runwayErr) {
          qualityNotes.push(
            `runway: failed - ${runwayErr instanceof Error ? runwayErr.message : "unknown"}`
          );
          console.error("[ProcessQueue] Runway failed:", runwayErr);
          // imageUrl still set as fallback — will post as FEED image
        }
      }

      // ── Step B fallback: Pexels if both DALL-E and Runway failed ───────
      if (!videoUrl && !imageUrl) {
        const pexelsQuery = KARINA_PEXELS_QUERIES[
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
          qualityNotes.push(`pexels fallback: ok (query: ${pexelsQuery})`);
        } catch (pexErr) {
          qualityNotes.push(
            `pexels fallback: failed - ${pexErr instanceof Error ? pexErr.message : "unknown"}`
          );
        }
      }

    // ══════════════════════════════════════════════════════════════════════
    // ANIMALS: Pexels video → ElevenLabs voice
    // ══════════════════════════════════════════════════════════════════════
    } else {
      console.log("[ProcessQueue] ANIMAL pipeline: Pexels → Voice");
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
        // DALL-E fallback for animals
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

    // ── Voiceover ────────────────────────────────────────────────────────
    let voiceoverUrl: string | null = null;
    try {
      const credits = await checkCredits();
      if (credits >= 100) {
        console.log(`[ProcessQueue] Voice: "${brief.voiceoverScript}"`);
        const voResult = await generateVoiceover(brief.voiceoverScript);
        if (voResult.url) {
          voiceoverUrl = voResult.url;
          qualityNotes.push("voiceover: ok");
        } else {
          qualityNotes.push(`voiceover: skipped - ${voResult.error || "no url"}`);
        }
      } else {
        qualityNotes.push(`voiceover: low credits (${credits})`);
      }
    } catch (voErr) {
      qualityNotes.push(
        `voiceover: failed - ${voErr instanceof Error ? voErr.message : "unknown"}`
      );
    }

    // ── Caption from brief templates ─────────────────────────────────────
    const caption = [brief.captionHook, "", brief.captionBody, "", brief.captionCta]
      .join("\n")
      .trim();
    const hashtags = brief.hashtags;
    qualityNotes.push(`caption: ${caption.length} chars`);

    // ── Quality score ────────────────────────────────────────────────────
    let qualityScore = 0;
    if (videoUrl) qualityScore += 50;
    else if (imageUrl) qualityScore += 35;
    if (voiceoverUrl) qualityScore += 25;
    if (caption.length > 50) qualityScore += 15;
    if (hashtags && hashtags.length > 50) qualityScore += 10;

    const passed = (videoUrl !== null || imageUrl !== null) && qualityScore >= 25;
    // Post as REEL if we have video, FEED if only image
    const postType = videoUrl ? "REEL" : "FEED";

    console.log(
      `[ProcessQueue] Quality: ${qualityScore} | ${postType} | ${passed ? "PASSED" : "FAILED"}`
    );

    // ── Save to MediaLibrary ─────────────────────────────────────────────
    try {
      await prisma.mediaLibrary.create({
        data: {
          type: videoUrl ? "VIDEO" : "IMAGE",
          url: videoUrl || imageUrl || "",
          topic: job.topic || brief.hook,
          caption,
          hashtags,
          postType,
          status: "SAVED",
          voiceoverUrl: voiceoverUrl || undefined,
          videoSource: videoUrl
            ? brief.useDallePrimary
              ? "RUNWAY"
              : "PEXELS"
            : "DALLE",
          brandProfileId: job.brandProfileId || undefined,
        },
      });
    } catch {}

    // ── Update job ───────────────────────────────────────────────────────
    await prisma.contentJob.update({
      where: { id: job.id },
      data: {
        status: passed ? "COMPLETED" : "QUALITY_FAILED",
        postType,
        caption,
        hashtags,
        animal: videoUrl && !brief.useDallePrimary ? brief.pexelsQuery : null,
        videoUrl,
        imageUrl,
        voiceoverUrl,
        voiceStatus: voiceoverUrl ? "OK" : "FAILED",
        modelUsed: brief.useDallePrimary
          ? `dalle-3 + runway${videoUrl ? " (video)" : " (image only)"} + elevenlabs`
          : "pexels + elevenlabs",
        qualityScore,
        qualityNotes: qualityNotes.join("; "),
        completedAt: new Date(),
        failReason: !passed ? `Quality ${qualityScore} below threshold` : null,
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
      postType,
      usedDalle: brief.useDallePrimary,
      dallePrompt: brief.useDallePrimary
        ? brief.visualDescription.substring(0, 150)
        : null,
      runwayTaskId,
      hasVideo: !!videoUrl,
      videoUrl: videoUrl || null,
      hasImage: !!imageUrl,
      imageUrl: imageUrl || null,
      hasVoiceover: !!voiceoverUrl,
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

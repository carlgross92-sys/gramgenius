import prisma from "@/lib/prisma";
import { generateWithClaudeJSON, generateWithClaude } from "@/lib/anthropic";
import { searchAnimalVideo, downloadAndSaveVideo } from "@/lib/pexels";
import { generateImage } from "@/lib/openai";
import { checkCredits, generateVoiceoverScript, generateVoiceover } from "@/lib/elevenlabs";

export const maxDuration = 300;

const MAX_CHAINS = 3;

export async function GET(request: Request) {
  try {
    // ── Load engine config ──────────────────────────────────────────────
    const engine = await prisma.continuousEngine.findFirst();
    if (!engine || !engine.enabled) {
      return Response.json({ skipped: true, reason: "Engine not enabled" });
    }

    // ── Find next queued job ────────────────────────────────────────────
    const now = new Date();
    const job = await prisma.contentJob.findFirst({
      where: {
        status: "QUEUED",
        retryCount: { lt: 3 },
        OR: [
          { scheduledFor: { lte: now } },
          { scheduledFor: null },
        ],
      },
      orderBy: { scheduledFor: "asc" },
    });

    if (!job) {
      return Response.json({ message: "No jobs in queue" });
    }

    // ── Mark as processing ──────────────────────────────────────────────
    await prisma.contentJob.update({
      where: { id: job.id },
      data: { status: "PROCESSING", startedAt: now },
    });

    // ── Load brand profile ──────────────────────────────────────────────
    const brand = await prisma.brandProfile.findFirst();
    const brandName = brand?.instagramHandle || "funny animals";
    const brandNiche = brand?.niche || "funny animal content";

    let caption: string | null = null;
    let hashtags: string | null = null;
    let animal: string | null = null;
    let videoUrl: string | null = null;
    let imageUrl: string | null = null;
    let voiceoverUrl: string | null = null;
    const qualityNotes: string[] = [];

    // ── Step 1: Generate caption ────────────────────────────────────────
    try {
      caption = await generateWithClaude(
        `You write short, punchy Instagram captions for @${brandName} in the ${brandNiche} niche. Keep it under 150 characters. Include a call-to-action like "Follow for more" or "Tag someone who needs this". No hashtags.`,
        `Write a caption for this topic: ${job.topic}`,
        512
      );
      caption = caption.replace(/^["']|["']$/g, "").trim();
      qualityNotes.push("caption: ok");
    } catch (err) {
      qualityNotes.push(`caption: failed - ${err instanceof Error ? err.message : "unknown"}`);
    }

    // ── Step 2: Generate hashtags ───────────────────────────────────────
    try {
      const hashtagResult = await generateWithClaudeJSON<string[]>(
        `You are a hashtag strategist. Generate exactly 20 Instagram hashtags for the given topic. Mix sizes: 5 large (1M+ posts), 10 medium (100K-1M), 5 small/niche (<100K). Return a JSON array of strings, each starting with #.`,
        `Generate 20 hashtags for: ${job.topic}\nNiche: ${brandNiche}`,
        1024
      );
      const tags = Array.isArray(hashtagResult) ? hashtagResult : [];
      hashtags = tags.slice(0, 20).join(" ");
      qualityNotes.push("hashtags: ok");
    } catch (err) {
      qualityNotes.push(`hashtags: failed - ${err instanceof Error ? err.message : "unknown"}`);
    }

    // ── Step 3: Extract animal name ─────────────────────────────────────
    try {
      animal = await generateWithClaude(
        `Extract the main animal name from the given topic. Return ONLY the animal name in lowercase, nothing else. Example: "cat", "dog", "parrot".`,
        job.topic,
        64
      );
      animal = animal.trim().toLowerCase().replace(/[^a-z\s]/g, "");
      qualityNotes.push(`animal: ${animal}`);
    } catch (err) {
      animal = "animal";
      qualityNotes.push(`animal: fallback - ${err instanceof Error ? err.message : "unknown"}`);
    }

    // ── Step 4: Get media (Pexels video or DALL-E image) ────────────────
    try {
      const pexelsResult = await searchAnimalVideo(job.topic, animal || "animal");
      const savedUrl = await downloadAndSaveVideo(
        pexelsResult.url,
        `content-${job.id}-${Date.now()}`
      );
      videoUrl = savedUrl;
      qualityNotes.push("video: pexels ok");
    } catch (videoErr) {
      qualityNotes.push(`video: pexels failed - ${videoErr instanceof Error ? videoErr.message : "unknown"}`);
      // Fallback to DALL-E image
      try {
        const imageResult = await generateImage(
          `A hilarious, viral-worthy photo of ${job.topic}. Bright colors, expressive animal face, Instagram-ready, professional quality.`,
          "1024x1792",
          "hd",
          "vivid"
        );
        imageUrl = imageResult.imageUrl;
        qualityNotes.push("image: dalle ok");
      } catch (imgErr) {
        qualityNotes.push(`image: dalle failed - ${imgErr instanceof Error ? imgErr.message : "unknown"}`);
      }
    }

    // ── Step 5: Generate voiceover if REEL ──────────────────────────────
    if (job.postType === "REEL") {
      try {
        const credits = await checkCredits();
        if (credits >= 100) {
          const script = generateVoiceoverScript(
            job.topic,
            caption || job.topic,
            animal || "animal"
          );
          const voResult = await generateVoiceover(script);
          if (voResult.url) {
            voiceoverUrl = voResult.url;
            qualityNotes.push("voiceover: ok");
          } else {
            qualityNotes.push(`voiceover: skipped - ${voResult.error || "no url returned"}`);
          }
        } else {
          qualityNotes.push(`voiceover: skipped - low credits (${credits})`);
        }
      } catch (voErr) {
        qualityNotes.push(`voiceover: failed - ${voErr instanceof Error ? voErr.message : "unknown"}`);
      }
    }

    // ── Step 6: Calculate quality score ─────────────────────────────────
    let qualityScore = 0;
    if (videoUrl) qualityScore += 40;
    else if (imageUrl) qualityScore += 25;
    if (voiceoverUrl) qualityScore += 30;
    if (caption && caption.length > 50) qualityScore += 20;
    if (hashtags && hashtags.length > 50) qualityScore += 10;

    const minScore = engine.minQualityScore ?? 70;
    let finalStatus = "COMPLETED";

    if (qualityScore < minScore) {
      finalStatus = "QUALITY_FAILED";
      qualityNotes.push(`quality: ${qualityScore} < min ${minScore}`);
    }

    // If REEL without voiceover and voiceover is required, fail quality
    if (
      job.postType === "REEL" &&
      !voiceoverUrl &&
      engine.requireVoiceover
    ) {
      finalStatus = "QUALITY_FAILED";
      qualityNotes.push("quality: REEL requires voiceover");
    }

    // ── Update job with results ─────────────────────────────────────────
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
        qualityScore,
        qualityNotes: qualityNotes.join("; "),
        completedAt: new Date(),
      },
    });

    // ── Chain to process next job if COMPLETED ──────────────────────────
    if (finalStatus === "COMPLETED") {
      const url = new URL(request.url);
      const currentChain = parseInt(url.searchParams.get("chain") || "0", 10);

      if (currentChain < MAX_CHAINS) {
        // Check if more queued jobs exist
        const moreJobs = await prisma.contentJob.count({
          where: {
            status: "QUEUED",
            retryCount: { lt: 3 },
            OR: [
              { scheduledFor: { lte: new Date() } },
              { scheduledFor: null },
            ],
          },
        });

        if (moreJobs > 0) {
          try {
            const nextUrl = new URL("/api/cron/process-queue", request.url);
            nextUrl.searchParams.set("chain", String(currentChain + 1));
            fetch(nextUrl.toString(), {
              headers: { authorization: request.headers.get("authorization") || "" },
            }).catch(() => {});
          } catch {
            // Non-critical
          }
        }
      }
    }

    return Response.json({
      success: true,
      jobId: job.id,
      status: finalStatus,
      qualityScore,
      qualityNotes,
      media: { videoUrl, imageUrl, voiceoverUrl },
    });
  } catch (error) {
    console.error("[process-queue] Error:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Queue processing failed" },
      { status: 500 }
    );
  }
}

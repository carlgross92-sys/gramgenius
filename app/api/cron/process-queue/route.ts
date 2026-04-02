import prisma from "@/lib/prisma";
import { generateWithClaudeJSON, generateWithClaude } from "@/lib/anthropic";
import { searchAnimalVideo, downloadAndSaveVideo } from "@/lib/pexels";
import { generateImage } from "@/lib/openai";
import { checkCredits, generateVoiceoverScript, generateVoiceover } from "@/lib/elevenlabs";
import { buildCaptionPrompt, buildVoiceoverPrompt, type ReelStyle } from "@/lib/prompt-templates";

export const maxDuration = 300;

const MAX_CHAINS = 10; // Process up to 10 jobs per invocation

export async function GET(request: Request) {
  try {
    // ── Get ALL enabled engines (not just first one) ────────────────────
    const engines = await prisma.continuousEngine.findMany({
      where: { enabled: true },
    });

    // ── Find next queued job — process regardless of engine state ───────
    // Engine enabled/disabled only gates content GENERATION, not processing
    const job = await prisma.contentJob.findFirst({
      where: {
        status: "QUEUED",
        retryCount: { lt: 3 },
      },
      orderBy: { createdAt: "asc" },
    });

    if (!job) {
      return Response.json({ message: "No jobs in queue" });
    }

    // Find the engine for this job's brand (for config like minQualityScore)
    const engine = engines.find((e) => e.brandProfileId === job.brandProfileId)
      || engines[0]
      || await prisma.continuousEngine.findFirst();

    // ── Mark as processing ──────────────────────────────────────────────
    await prisma.contentJob.update({
      where: { id: job.id },
      data: { status: "PROCESSING", startedAt: new Date() },
    });

    // ── Load brand profile for THIS JOB's brand ─────────────────────────
    const brand = job.brandProfileId
      ? await prisma.brandProfile.findUnique({ where: { id: job.brandProfileId } })
      : await prisma.brandProfile.findFirst();
    const brandHandle = brand?.instagramHandle || "funny_animals";
    const brandVoice = brand?.brandVoice || "Humorous";
    const brandAudience = brand?.targetAudience || "animal lovers 18-45";
    const brandNiche = brand?.niche || "funny animals";

    let caption: string | null = null;
    let hashtags: string | null = null;
    let animal: string | null = null;
    let videoUrl: string | null = null;
    let imageUrl: string | null = null;
    let voiceoverUrl: string | null = null;
    let voiceStatus: "OK" | "FAILED" | "RETRY_OK" | "MISSING" = "MISSING";
    const modelUsed = "claude-sonnet + pexels + elevenlabs";
    const qualityNotes: string[] = [];

    // ── Step 1: Generate caption using Brand Brain + Prompt Templates ──
    const reelStyle = (job.reelStyle || "funny") as ReelStyle;
    try {
      const captionPrompt = buildCaptionPrompt({
        brandName: brand?.name || "Funny Animals",
        brandHandle,
        niche: brandNiche,
        pillar: job.topic,
        brandVoice,
        reelStyle,
        topic: job.topic,
        targetAudience: brandAudience,
      });
      caption = await generateWithClaude(
        captionPrompt,
        `Write a ${brandVoice.toLowerCase()} caption for: "${job.topic}"`,
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
            voiceStatus = "OK";
            qualityNotes.push("voiceover: ok");
          } else {
            voiceStatus = "FAILED";
            qualityNotes.push(`voiceover: skipped - ${voResult.error || "no url returned"}`);
          }
        } else {
          voiceStatus = "FAILED";
          qualityNotes.push(`voiceover: skipped - low credits (${credits})`);
        }
      } catch (voErr) {
        voiceStatus = "FAILED";
        qualityNotes.push(`voiceover: failed - ${voErr instanceof Error ? voErr.message : "unknown"}`);
      }
    }

    // ── Step 5B: Audio merge removed — videos post as-is from Pexels ──
    // Voiceover URL is kept on the job for future use.
    if (voiceoverUrl) {
      qualityNotes.push("voiceover: saved separately (no merge needed)");
    }

    // ── Step 6: Calculate quality score ─────────────────────────────────
    let qualityScore = 0;
    if (videoUrl) qualityScore += 40;
    else if (imageUrl) qualityScore += 25;
    if (voiceoverUrl) qualityScore += 30;
    if (caption && caption.length > 50) qualityScore += 20;
    if (hashtags && hashtags.length > 50) qualityScore += 10;

    const minScore = engine?.minQualityScore ?? 10;
    let finalStatus = "COMPLETED";
    let qualityFailed = false;

    if (qualityScore < minScore) {
      finalStatus = "QUALITY_FAILED";
      qualityFailed = true;
      qualityNotes.push(`quality: ${qualityScore} < min ${minScore}`);
    }

    // Voice is nice-to-have, not required — never fail just for missing voiceover
    if ((job.postType === "REEL" || job.mediaType === "video") && !voiceoverUrl) {
      qualityNotes.push("VOICE_NOTE: No voiceover — posting without voice");
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
        voiceStatus: voiceoverUrl ? "OK" : "FAILED",
        modelUsed,
        qualityScore,
        qualityNotes: qualityNotes.join("; "),
        completedAt: new Date(),
      },
    });

    // ── Chain to process next job (regardless of this job's result) ─────
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
      } else {
        // No queued jobs — check if we need to backfill to reach daily target
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const postedToday = await prisma.contentJob.count({
          where: { status: "COMPLETED", completedAt: { gte: today } },
        });
        const dailyTarget = engine?.postsPerDay || 30;

        if (postedToday < dailyTarget) {
          console.log(`[Process Queue] Backfill needed: ${postedToday}/${dailyTarget} — triggering content generation`);
          try {
            const genUrl = new URL("/api/cron/generate-content", request.url);
            fetch(genUrl.toString(), {
              headers: { authorization: request.headers.get("authorization") || "" },
            }).catch(() => {});
          } catch {}
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

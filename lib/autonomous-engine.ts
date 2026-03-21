import prisma from "@/lib/prisma";
import { generateWithClaudeJSON } from "@/lib/anthropic";
import { generateImage } from "@/lib/openai";
import { runContentSwarm, SwarmInput } from "@/lib/swarm";
import { imageToVideo, pollTask, downloadVideo } from "@/lib/runway";
import { textToSpeech, saveAudio } from "@/lib/elevenlabs";
import {
  createImageContainer,
  createReelContainer,
  pollContainerStatus,
  publishContainer,
} from "@/lib/meta";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface Topic {
  topic: string;
  category: string;
  trendScore: number;
  postType: "FEED" | "REEL";
}

export interface EngineResult {
  success: boolean;
  feedPostsScheduled: number;
  reelsScheduled: number;
  totalScheduled: number;
  scheduledTimes: string[];
  topics: string[];
  errors: string[];
  durationMs: number;
}

export interface PublishResult {
  processed: number;
  succeeded: number;
  failed: number;
  errors: string[];
}

interface ReelScene {
  sceneNumber: number;
  duration: number;
  voiceoverLine: string;
  visualDescription: string;
}

interface ReelScript {
  hookText: string;
  scenes: ReelScene[];
  caption: string;
  hashtags: string;
}

// ─── Timezone Helpers ───────────────────────────────────────────────────────

const TIMEZONE_OFFSETS: Record<string, number> = {
  "America/Los_Angeles": -7,
  "America/Denver": -6,
  "America/Chicago": -5,
  "America/New_York": -4,
  "America/Phoenix": -7,
  "Pacific/Honolulu": -10,
  "America/Anchorage": -8,
  "Europe/London": 1,
  "Europe/Paris": 2,
  "Asia/Tokyo": 9,
  "Australia/Sydney": 11,
};

function getOffsetHours(timezone: string): number {
  return TIMEZONE_OFFSETS[timezone] ?? -7; // Default to Pacific
}

// ─── Research Trending Topics ───────────────────────────────────────────────

export async function researchTrendingTopics(
  count: number
): Promise<Topic[]> {
  const topics = await generateWithClaudeJSON<Topic[]>(
    `You are a viral content researcher for funny animal Instagram accounts. Generate trending topics for @chewy_sacramento. Each topic should be specific and actionable. Mix categories: funny_fails, cute_moments, reactions, wild_animals, baby_animals, human_things, seasonal, viral. Return JSON array of {topic, category, trendScore (1-10), postType ('FEED' or 'REEL' — assign REEL to 30% of topics)}.`,
    `Generate exactly ${count} trending funny animal content topics for today. Return a JSON array only.`
  );

  return topics;
}

// ─── Calculate Schedule Times ───────────────────────────────────────────────

export function calculateScheduleTimes(
  postsCount: number,
  timezone: string
): Date[] {
  const offsetHours = getOffsetHours(timezone);

  // Priority slots in local hours (24h format)
  const prioritySlots = [19, 21, 17, 15, 12, 7, 20, 18, 8, 10];

  // Filter out times between 11pm-6am (23, 0, 1, 2, 3, 4, 5)
  const validSlots = prioritySlots.filter(
    (hour) => hour >= 6 && hour <= 22
  );

  const now = new Date();
  const dates: Date[] = [];

  for (let i = 0; i < Math.min(postsCount, validSlots.length); i++) {
    const localHour = validSlots[i];

    // Create a Date for today at the given local hour, converted to UTC
    const utcHour = localHour - offsetHours;

    const scheduledDate = new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate(),
        utcHour,
        0,
        0,
        0
      )
    );

    // If the time is already past, still schedule it (engine may run early morning)
    // but skip times more than 1 hour in the past
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    if (scheduledDate > oneHourAgo) {
      dates.push(scheduledDate);
    }
  }

  // If we didn't get enough slots (some were in the past), return what we have
  return dates.slice(0, postsCount);
}

// ─── Generate and Schedule Feed Post ────────────────────────────────────────

export async function generateAndScheduleFeedPost(
  topic: Topic,
  scheduledAt: Date,
  brandProfileId: string
): Promise<string> {
  try {
    // Run the content swarm
    const swarmInput: SwarmInput = {
      topic: topic.topic,
      brandProfileId,
      postType: "FEED",
      recentHashtagsUsed: [],
      postGoal: "engagement",
    };

    const swarmOutput = await runContentSwarm(swarmInput);

    // Save the post as a draft first
    const firstCaption =
      (swarmOutput.captions || [])[0]?.text ?? topic.topic;
    const hashtagStr = (swarmOutput.hashtags?.fullSet || []).join(" ");

    const post = await prisma.post.create({
      data: {
        topic: topic.topic,
        caption: firstCaption,
        hashtags: hashtagStr,
        postType: "FEED",
        platform: "INSTAGRAM",
        status: "DRAFT",
        brandProfileId,
        imagePrompt: swarmOutput.visualConcept?.dallePrompt || null,
        engagementNotes: JSON.stringify(swarmOutput.swarmMetrics || {}),
      },
    });

    // Generate image using the swarm's visual concept
    let imageUrl: string | null = null;
    if (swarmOutput.visualConcept?.dallePrompt) {
      const imageResult = await generateImage(
        swarmOutput.visualConcept.dallePrompt
      );
      imageUrl = imageResult.imageUrl;
    }

    // Update post: set imageUrl, scheduledAt, status SCHEDULED
    await prisma.post.update({
      where: { id: post.id },
      data: {
        imageUrl,
        scheduledAt,
        status: "SCHEDULED",
      },
    });

    console.log(
      `[Engine] Feed post scheduled: ${post.id} for ${scheduledAt.toISOString()}`
    );
    return post.id;
  } catch (error) {
    console.error(`[Engine] Failed to generate feed post for "${topic.topic}":`, error);
    return "";
  }
}

// ─── Generate and Schedule Reel ─────────────────────────────────────────────

export async function generateAndScheduleReel(
  topic: Topic,
  scheduledAt: Date,
  brandProfileId: string
): Promise<string> {
  try {
    // Run the content swarm
    const swarmInput: SwarmInput = {
      topic: topic.topic,
      brandProfileId,
      postType: "REEL",
      recentHashtagsUsed: [],
      postGoal: "engagement",
    };

    const swarmOutput = await runContentSwarm(swarmInput);

    // Save the post as a draft first
    const firstCaption =
      (swarmOutput.captions || [])[0]?.text ?? topic.topic;
    const hashtagStr = (swarmOutput.hashtags?.fullSet || []).join(" ");

    const post = await prisma.post.create({
      data: {
        topic: topic.topic,
        caption: firstCaption,
        hashtags: hashtagStr,
        postType: "REEL",
        platform: "INSTAGRAM",
        status: "DRAFT",
        brandProfileId,
        imagePrompt: swarmOutput.visualConcept?.dallePrompt || null,
        engagementNotes: JSON.stringify(swarmOutput.swarmMetrics || {}),
      },
    });

    // Generate reel script via Claude
    const reelScript = await generateWithClaudeJSON<ReelScript>(
      `You are a viral Reels director for funny animal Instagram accounts. Create a short-form video script. Return JSON: {hookText: string, scenes: [{sceneNumber: number, duration: 5, voiceoverLine: string, visualDescription: string}], caption: string, hashtags: string}. Keep it to 3 scenes max. Each visual description should be a detailed image prompt suitable for AI image generation — funny, cute animals, no text overlay.`,
      `Create a Reel script for this topic: "${topic.topic}". Brand: @chewy_sacramento (funny animal content). The swarm research suggests: ${swarmOutput.strategy?.leadHook || "make it funny and relatable"}.`
    );

    // Limit to 3 scenes to save API costs
    const scenes = (reelScript.scenes || []).slice(0, 3);

    let videoUrl: string | null = null;
    let voiceoverUrl: string | null = null;

    // Generate video for each scene
    const sceneVideoUrls: string[] = [];
    for (const scene of scenes) {
      try {
        // Generate base image for the scene
        const imageResult = await generateImage(scene.visualDescription);

        // Convert image to video via Runway
        const taskId = await imageToVideo(
          imageResult.imageUrl,
          scene.voiceoverLine || topic.topic,
          5,
          "720:1280"
        );

        // Poll until video is ready
        const taskResult = await pollTask(taskId);
        if (taskResult.outputUrl) {
          const downloadedUrl = await downloadVideo(taskResult.outputUrl);
          sceneVideoUrls.push(downloadedUrl);
        }
      } catch (sceneError) {
        console.error(
          `[Engine] Failed to generate scene ${scene.sceneNumber} for reel:`,
          sceneError
        );
        // Continue with remaining scenes — partial Reels are OK
      }
    }

    // Use the first scene video as the main video
    if (sceneVideoUrls.length > 0) {
      videoUrl = sceneVideoUrls[0];
    }

    // Generate voiceover from all scene lines
    try {
      const voiceoverText = [
        reelScript.hookText || "",
        ...scenes.map((s) => s.voiceoverLine || ""),
      ]
        .filter(Boolean)
        .join(". ");

      if (voiceoverText) {
        const audioBuffer = await textToSpeech(voiceoverText);
        voiceoverUrl = await saveAudio(audioBuffer);
      }
    } catch (voiceError) {
      console.error("[Engine] Failed to generate voiceover:", voiceError);
      // Continue without voiceover — partial Reels are OK
    }

    // Update the post with all generated assets
    await prisma.post.update({
      where: { id: post.id },
      data: {
        videoUrl,
        voiceoverUrl,
        reelScript: JSON.stringify(reelScript),
        scheduledAt,
        status: "SCHEDULED",
      },
    });

    console.log(
      `[Engine] Reel scheduled: ${post.id} for ${scheduledAt.toISOString()} (${sceneVideoUrls.length} scenes)`
    );
    return post.id;
  } catch (error) {
    console.error(`[Engine] Failed to generate reel for "${topic.topic}":`, error);
    return "";
  }
}

// ─── Run Daily Engine ───────────────────────────────────────────────────────

export async function runDailyEngine(): Promise<EngineResult> {
  const startTime = Date.now();
  const errors: string[] = [];
  const scheduledTimes: string[] = [];
  const topicNames: string[] = [];
  let feedPostsScheduled = 0;
  let reelsScheduled = 0;

  try {
    // Load or create engine config
    let config = await prisma.engineConfig.findFirst();
    if (!config) {
      config = await prisma.engineConfig.create({
        data: {
          enabled: true,
          feedPostsPerDay: 7,
          reelsPerDay: 3,
          maxPostsPerDay: 10,
          autoResearch: true,
          autoGenerate: true,
          autoPublish: true,
        },
      });
    }

    // Check if engine is enabled
    if (!config.enabled) {
      return {
        success: false,
        feedPostsScheduled: 0,
        reelsScheduled: 0,
        totalScheduled: 0,
        scheduledTimes: [],
        topics: [],
        errors: ["Engine is disabled"],
        durationMs: Date.now() - startTime,
      };
    }

    // Check if engine is paused
    if (config.pausedUntil && config.pausedUntil > new Date()) {
      return {
        success: false,
        feedPostsScheduled: 0,
        reelsScheduled: 0,
        totalScheduled: 0,
        scheduledTimes: [],
        topics: [],
        errors: [
          `Engine paused until ${config.pausedUntil.toISOString()}`,
        ],
        durationMs: Date.now() - startTime,
      };
    }

    // Load brand profile
    const brandProfile = await prisma.brandProfile.findFirst();
    if (!brandProfile) {
      return {
        success: false,
        feedPostsScheduled: 0,
        reelsScheduled: 0,
        totalScheduled: 0,
        scheduledTimes: [],
        topics: [],
        errors: ["No brand profile found. Set up your Brand Brain first."],
        durationMs: Date.now() - startTime,
      };
    }

    // Check how many posts are already scheduled for today
    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setUTCHours(23, 59, 59, 999);

    const existingScheduled = await prisma.post.count({
      where: {
        status: "SCHEDULED",
        scheduledAt: {
          gte: todayStart,
          lte: todayEnd,
        },
      },
    });

    const feedTarget = Math.max(0, config.feedPostsPerDay - existingScheduled);
    const reelTarget = config.reelsPerDay;
    const totalNeeded = feedTarget + reelTarget;

    if (totalNeeded <= 0) {
      return {
        success: true,
        feedPostsScheduled: 0,
        reelsScheduled: 0,
        totalScheduled: 0,
        scheduledTimes: [],
        topics: [],
        errors: ["Daily targets already met"],
        durationMs: Date.now() - startTime,
      };
    }

    // Research trending topics
    console.log(
      `[Engine] Researching ${totalNeeded} trending topics...`
    );
    const topics = await researchTrendingTopics(totalNeeded);

    // Split topics into feed and reel
    const feedTopics = topics
      .filter((t) => t.postType === "FEED")
      .slice(0, feedTarget);
    const reelTopics = topics
      .filter((t) => t.postType === "REEL")
      .slice(0, reelTarget);

    // If we don't have enough of one type, fill from the other
    const remainingFeedSlots = feedTarget - feedTopics.length;
    const remainingReelSlots = reelTarget - reelTopics.length;

    if (remainingFeedSlots > 0) {
      const extraFeed = topics
        .filter(
          (t) =>
            t.postType === "REEL" &&
            !reelTopics.includes(t)
        )
        .slice(0, remainingFeedSlots);
      for (const t of extraFeed) {
        feedTopics.push({ ...t, postType: "FEED" });
      }
    }

    if (remainingReelSlots > 0) {
      const extraReels = topics
        .filter(
          (t) =>
            t.postType === "FEED" &&
            !feedTopics.includes(t)
        )
        .slice(0, remainingReelSlots);
      for (const t of extraReels) {
        reelTopics.push({ ...t, postType: "REEL" });
      }
    }

    // Calculate schedule times for all posts
    const allPostsCount = feedTopics.length + reelTopics.length;
    const times = calculateScheduleTimes(
      allPostsCount,
      brandProfile.timezone || "America/Los_Angeles"
    );

    let timeIndex = 0;

    // Generate and schedule feed posts
    for (const topic of feedTopics) {
      if (timeIndex >= times.length) break;
      const schedTime = times[timeIndex];
      timeIndex++;

      const postId = await generateAndScheduleFeedPost(
        topic,
        schedTime,
        brandProfile.id
      );

      if (postId) {
        feedPostsScheduled++;
        scheduledTimes.push(schedTime.toISOString());
        topicNames.push(topic.topic);
      } else {
        errors.push(`Failed to schedule feed post: ${topic.topic}`);
      }
    }

    // Generate and schedule reels
    for (const topic of reelTopics) {
      if (timeIndex >= times.length) break;
      const schedTime = times[timeIndex];
      timeIndex++;

      const postId = await generateAndScheduleReel(
        topic,
        schedTime,
        brandProfile.id
      );

      if (postId) {
        reelsScheduled++;
        scheduledTimes.push(schedTime.toISOString());
        topicNames.push(topic.topic);
      } else {
        errors.push(`Failed to schedule reel: ${topic.topic}`);
      }
    }

    const durationMs = Date.now() - startTime;

    // Update engine config
    const tomorrow = new Date();
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    tomorrow.setUTCHours(
      new Date().getUTCHours(),
      new Date().getUTCMinutes(),
      0,
      0
    );

    await prisma.engineConfig.update({
      where: { id: config.id },
      data: {
        lastRunAt: new Date(),
        nextRunAt: tomorrow,
      },
    });

    // Log to EngineLog
    await prisma.engineLog.create({
      data: {
        feedScheduled: feedPostsScheduled,
        reelsScheduled,
        published: 0,
        failed: errors.length,
        errors: JSON.stringify(errors),
        durationMs,
      },
    });

    console.log(
      `[Engine] Daily run complete: ${feedPostsScheduled} feed + ${reelsScheduled} reels in ${durationMs}ms`
    );

    return {
      success: true,
      feedPostsScheduled,
      reelsScheduled,
      totalScheduled: feedPostsScheduled + reelsScheduled,
      scheduledTimes,
      topics: topicNames,
      errors,
      durationMs,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown engine error";
    console.error("[Engine] Daily run failed:", error);

    return {
      success: false,
      feedPostsScheduled,
      reelsScheduled,
      totalScheduled: feedPostsScheduled + reelsScheduled,
      scheduledTimes,
      topics: topicNames,
      errors: [...errors, message],
      durationMs: Date.now() - startTime,
    };
  }
}

// ─── Publish Due Posts ──────────────────────────────────────────────────────

export async function publishDuePosts(): Promise<PublishResult> {
  const errors: string[] = [];
  let processed = 0;
  let succeeded = 0;
  let failed = 0;
  let consecutiveFailures = 0;

  try {
    // Query posts that are due for publishing
    const duePosts = await prisma.post.findMany({
      where: {
        status: "SCHEDULED",
        scheduledAt: {
          lte: new Date(),
        },
      },
      orderBy: {
        scheduledAt: "asc",
      },
    });

    for (const post of duePosts) {
      processed++;

      // Format caption: caption + hashtags (max 2200 chars)
      const fullCaption = `${post.caption}\n\n${post.hashtags}`.slice(
        0,
        2200
      );

      let publishSuccess = false;

      // Attempt publishing (with one retry on failure)
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          let instagramPostId: string | undefined;

          if (post.postType === "REEL" && post.videoUrl) {
            // Publish as Reel
            const containerId = await createReelContainer(
              post.videoUrl,
              fullCaption
            );
            await pollContainerStatus(containerId);
            instagramPostId = await publishContainer(containerId);
          } else if (post.postType === "FEED" && post.imageUrl) {
            // Publish as Feed image
            const containerId = await createImageContainer(
              post.imageUrl,
              fullCaption
            );
            instagramPostId = await publishContainer(containerId);
          } else {
            throw new Error(
              `Cannot publish post ${post.id}: missing ${post.postType === "REEL" ? "videoUrl" : "imageUrl"}`
            );
          }

          // Success: update post
          await prisma.post.update({
            where: { id: post.id },
            data: {
              status: "PUBLISHED",
              publishedAt: new Date(),
              instagramPostId,
            },
          });

          publishSuccess = true;
          succeeded++;
          consecutiveFailures = 0;
          console.log(
            `[Engine] Published post ${post.id} (${post.postType})`
          );
          break;
        } catch (publishError) {
          if (attempt === 0) {
            // First failure: wait 5 seconds and retry
            console.warn(
              `[Engine] Publish attempt 1 failed for ${post.id}, retrying in 5s...`,
              publishError
            );
            await new Promise((resolve) => setTimeout(resolve, 5000));
          } else {
            // Second failure: mark as failed
            const reason =
              publishError instanceof Error
                ? publishError.message
                : "Unknown publish error";

            await prisma.post.update({
              where: { id: post.id },
              data: {
                status: "FAILED",
                failureReason: reason,
              },
            });

            failed++;
            consecutiveFailures++;
            errors.push(`Post ${post.id}: ${reason}`);
            console.error(
              `[Engine] Failed to publish post ${post.id}:`,
              publishError
            );
          }
        }
      }

      // Update engine config counters
      if (publishSuccess) {
        await prisma.engineConfig.updateMany({
          data: {
            totalPublished: { increment: 1 },
          },
        });
      } else {
        await prisma.engineConfig.updateMany({
          data: {
            totalFailed: { increment: 1 },
          },
        });
      }

      // If 3+ consecutive failures, pause the engine for 1 hour
      if (consecutiveFailures >= 3) {
        const pauseUntil = new Date(Date.now() + 60 * 60 * 1000);
        await prisma.engineConfig.updateMany({
          data: {
            pausedUntil: pauseUntil,
          },
        });
        console.warn(
          `[Engine] 3+ consecutive failures — pausing until ${pauseUntil.toISOString()}`
        );
        errors.push(
          `Engine paused until ${pauseUntil.toISOString()} due to consecutive failures`
        );
        break;
      }
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error";
    errors.push(message);
    console.error("[Engine] publishDuePosts failed:", error);
  }

  return {
    processed,
    succeeded,
    failed,
    errors,
  };
}

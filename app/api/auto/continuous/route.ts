import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { generateWithClaudeJSON } from "@/lib/anthropic";
import { runContentSwarm } from "@/lib/swarm";
import { runMediaAgent } from "@/lib/media-agent";

export const maxDuration = 300; // 5 min max for Vercel

interface ContinuousInput {
  theme?: string;
  postsPerDay: number;
  mediaType: "image" | "video" | "both";
  schedule: "immediate" | "scheduled" | "queue";
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ContinuousInput;
    const { theme, postsPerDay = 3, mediaType = "image", schedule = "queue" } = body;

    // Load brand profile
    const brand = await prisma.brandProfile.findFirst();
    if (!brand) {
      return Response.json({ error: "No brand profile found." }, { status: 400 });
    }

    // Parse content pillars
    let pillars: string[] = [];
    try { pillars = JSON.parse(brand.contentPillars); } catch { pillars = []; }

    const effectiveTheme = theme || pillars.join(", ") || brand.niche;
    const count = Math.min(postsPerDay, 10);

    // Generate unique topics via Claude
    const topics = await generateWithClaudeJSON<string[]>(
      `You are a trending content researcher for the Instagram account @${brand.instagramHandle} in the ${brand.niche} niche. Generate unique, specific, viral-worthy content topics. Each must describe a visual scene. Return a JSON array of strings.`,
      `Generate ${count} unique funny animal content topics.\nBrand theme: ${effectiveTheme}\nEach topic must be specific, visual, funny, relatable, and different from each other.`,
      2048
    );

    const topicList = Array.isArray(topics) ? topics.slice(0, count) : [];
    if (topicList.length === 0) {
      return Response.json({ error: "Failed to generate topics" }, { status: 500 });
    }

    // Calculate schedule times if needed
    const scheduleTimes: Date[] = [];
    if (schedule === "scheduled") {
      const priorityHours = [19, 21, 17, 15, 12, 7, 20, 18, 8, 10];
      const now = new Date();
      const tzOffset = -7; // LA time
      for (let i = 0; i < topicList.length && i < priorityHours.length; i++) {
        const d = new Date(now);
        d.setUTCHours(priorityHours[i] - tzOffset, 0, 0, 0);
        if (d <= now) d.setDate(d.getDate() + 1);
        scheduleTimes.push(d);
      }
      scheduleTimes.sort((a, b) => a.getTime() - b.getTime());
    }

    const results: Array<{
      topic: string;
      status: string;
      postId?: string;
      imageUrl?: string;
      errors: string[];
    }> = [];

    // Process each topic
    for (let i = 0; i < topicList.length; i++) {
      const currentTopic = topicList[i];
      const entry: (typeof results)[0] = { topic: currentTopic, status: "generating", errors: [] };

      try {
        // Run text swarm
        const swarmOutput = await runContentSwarm({
          topic: currentTopic,
          brandProfileId: brand.id,
          postType: mediaType === "video" ? "REEL" : "FEED",
          recentHashtagsUsed: [],
          postGoal: "engagement",
        });

        const caption = (swarmOutput.captions || [])[0]?.text ?? currentTopic;
        const hashtags = (swarmOutput.hashtags?.fullSet || []).join(" ");
        const postType = mediaType === "video" ? "REEL" : "FEED";

        // Determine status and scheduledAt
        let postStatus = "DRAFT";
        let scheduledAt: Date | null = null;
        if (schedule === "immediate") {
          postStatus = "DRAFT"; // Media agent will auto-post
        } else if (schedule === "scheduled" && scheduleTimes[i]) {
          postStatus = "SCHEDULED";
          scheduledAt = scheduleTimes[i];
        }

        // Create post record
        const post = await prisma.post.create({
          data: {
            topic: currentTopic,
            caption,
            hashtags,
            postType,
            platform: "INSTAGRAM",
            status: postStatus,
            scheduledAt,
            brandProfileId: brand.id,
            imagePrompt: swarmOutput.visualConcept?.dallePrompt || null,
          },
        });

        entry.postId = post.id;

        // Run Media Agent
        try {
          const mediaResult = await runMediaAgent({
            postType: postType as "FEED" | "REEL",
            topic: currentTopic,
            caption,
            hashtags: swarmOutput.hashtags?.fullSet || [],
            visualConcept: swarmOutput.visualConcept || { dallePrompt: currentTopic },
            strategy: swarmOutput.strategy || {},
            autoPost: schedule === "immediate",
            postId: post.id,
          });

          entry.imageUrl = mediaResult.imageUrl || mediaResult.videoUrl || mediaResult.thumbnailUrl;
          if (mediaResult.errors?.length) {
            entry.errors.push(...mediaResult.errors);
          }
          if (mediaResult.instagramPostId) {
            entry.status = "posted";
          } else if (scheduledAt) {
            entry.status = "scheduled";
          } else {
            entry.status = "saved";
          }
        } catch (mediaErr) {
          entry.errors.push(mediaErr instanceof Error ? mediaErr.message : "Media generation failed");
          entry.status = "saved";
        }
      } catch (err) {
        entry.errors.push(err instanceof Error ? err.message : "Generation failed");
        entry.status = "failed";
      }

      results.push(entry);
    }

    const succeeded = results.filter((r) => r.status !== "failed").length;

    return Response.json({
      success: true,
      total: topicList.length,
      succeeded,
      failed: topicList.length - succeeded,
      results,
    });
  } catch (error) {
    console.error("[Continuous] Error:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Continuous mode failed" },
      { status: 500 }
    );
  }
}

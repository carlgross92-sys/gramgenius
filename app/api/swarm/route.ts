import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { runContentSwarm } from "@/lib/swarm";
import type { SwarmInput } from "@/lib/swarm-types";
import { runMediaAgent } from "@/lib/media-agent";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    let { topic, brandProfileId, postType, recentHashtagsUsed, postGoal } =
      body as SwarmInput & { autoPost?: boolean };
    const autoPost = body.autoPost === true;

    if (!topic) {
      return Response.json(
        { error: "Missing required field: topic" },
        { status: 400 }
      );
    }

    // Single-user app: fallback to first brand profile
    if (!brandProfileId) {
      const defaultBrand = await prisma.brandProfile.findFirst();
      if (!defaultBrand) {
        return Response.json(
          { error: "No brand profile found. Set up your Brand Brain first." },
          { status: 400 }
        );
      }
      brandProfileId = defaultBrand.id;
    }

    const swarmOutput = await runContentSwarm({
      topic,
      brandProfileId,
      postType: postType || "FEED",
      recentHashtagsUsed: recentHashtagsUsed || [],
      postGoal: postGoal || "engagement",
    });

    // Save post as draft
    const firstCaption = (swarmOutput.captions || [])[0]?.text ?? topic;
    const hashtagStr = (swarmOutput.hashtags?.fullSet || []).join(" ");
    const effectivePostType = swarmOutput.strategy?.format || postType || "FEED";

    const post = await prisma.post.create({
      data: {
        topic,
        caption: firstCaption,
        hashtags: hashtagStr,
        postType: effectivePostType,
        platform: swarmOutput.strategy?.platform || "INSTAGRAM",
        status: "DRAFT",
        brandProfileId,
        engagementNotes: JSON.stringify(swarmOutput.swarmMetrics || {}),
        imagePrompt: swarmOutput.visualConcept?.dallePrompt || null,
      },
    });

    // Run Media Agent (image/video generation + optional Instagram posting)
    let mediaResult: {
      imageUrl?: string;
      sceneImages?: string[];
      sceneVideos?: string[];
      voiceoverUrl?: string;
      instagramPostId?: string;
      instagramUrl?: string;
      mediaLibraryIds?: string[];
      errors?: string[];
    } = {};

    try {
      mediaResult = await runMediaAgent({
        postType: effectivePostType as "FEED" | "CAROUSEL" | "REEL" | "STORY",
        topic,
        caption: firstCaption,
        hashtags: swarmOutput.hashtags?.fullSet || [],
        visualConcept: swarmOutput.visualConcept || { dallePrompt: topic },
        strategy: swarmOutput.strategy || {},
        autoPost,
        postId: post.id,
      });
    } catch (mediaError) {
      console.error("[Swarm] Media Agent failed:", mediaError);
      (mediaResult.errors ??= []).push(
        mediaError instanceof Error ? mediaError.message : "Media agent failed"
      );
    }

    return Response.json({
      ...swarmOutput,
      postId: post.id,
      generatedImageUrl: mediaResult.imageUrl || null,
      sceneImages: mediaResult.sceneImages || [],
      sceneVideos: mediaResult.sceneVideos || [],
      voiceoverUrl: mediaResult.voiceoverUrl || null,
      instagramPostId: mediaResult.instagramPostId || null,
      instagramUrl: mediaResult.instagramUrl || null,
      mediaLibraryIds: mediaResult.mediaLibraryIds || [],
      mediaErrors: mediaResult.errors || [],
    });
  } catch (error) {
    console.error("Swarm execution failed:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Swarm execution failed" },
      { status: 500 }
    );
  }
}

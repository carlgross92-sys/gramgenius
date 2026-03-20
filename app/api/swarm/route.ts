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
    // User's explicit postType takes priority over Claude's strategy suggestion
    const effectivePostType = (postType || swarmOutput.strategy?.format || "FEED").toUpperCase();

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

    const mediaStatus = {
      agentRan: true,
      postType: effectivePostType,
      imageGenerated: !!mediaResult.imageUrl,
      imageUrl: mediaResult.imageUrl || null,
      scenesGenerated: (mediaResult.sceneImages || []).length,
      sceneImages: mediaResult.sceneImages || [],
      videosGenerated: (mediaResult.sceneVideos || []).length,
      sceneVideos: mediaResult.sceneVideos || [],
      voiceoverGenerated: !!mediaResult.voiceoverUrl,
      voiceoverUrl: mediaResult.voiceoverUrl || null,
      postedToInstagram: !!mediaResult.instagramPostId,
      instagramPostId: mediaResult.instagramPostId || null,
      instagramUrl: mediaResult.instagramUrl || null,
      mediaLibraryIds: mediaResult.mediaLibraryIds || [],
      errors: mediaResult.errors || [],
    };

    console.log("[Swarm] Media Agent result:", JSON.stringify(mediaStatus, null, 2));

    return Response.json({
      ...swarmOutput,
      postId: post.id,
      generatedImageUrl: mediaStatus.imageUrl,
      sceneImages: mediaStatus.sceneImages,
      sceneVideos: mediaStatus.sceneVideos,
      voiceoverUrl: mediaStatus.voiceoverUrl,
      instagramPostId: mediaStatus.instagramPostId,
      instagramUrl: mediaStatus.instagramUrl,
      mediaLibraryIds: mediaStatus.mediaLibraryIds,
      mediaErrors: mediaStatus.errors,
      mediaStatus,
    });
  } catch (error) {
    console.error("Swarm execution failed:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Swarm execution failed" },
      { status: 500 }
    );
  }
}

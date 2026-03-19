import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { runContentSwarm, type SwarmInput } from "@/lib/swarm";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { topic, brandProfileId, postType, recentHashtagsUsed, postGoal } =
      body as SwarmInput;

    if (!topic || !brandProfileId) {
      return Response.json(
        { error: "Missing required fields: topic, brandProfileId" },
        { status: 400 }
      );
    }

    const swarmOutput = await runContentSwarm({
      topic,
      brandProfileId,
      postType: postType || "FEED",
      recentHashtagsUsed: recentHashtagsUsed || [],
      postGoal: postGoal || "engagement",
    });

    // Save the first refined caption as a draft Post
    const firstCaption = swarmOutput.captions[0]?.text ?? "";

    const post = await prisma.post.create({
      data: {
        topic: topic,
        caption: firstCaption,
        hashtags: swarmOutput.hashtags.fullSet.join(" "),
        postType: swarmOutput.strategy.format || postType || "FEED",
        platform: swarmOutput.strategy.platform || "INSTAGRAM",
        status: "DRAFT",
        brandProfileId: brandProfileId,
        engagementNotes: JSON.stringify(swarmOutput.swarmMetrics),
        imagePrompt: swarmOutput.visualConcept.dallePrompt || null,
      },
    });

    return Response.json({ ...swarmOutput, postId: post.id });
  } catch (error) {
    console.error("Swarm execution failed:", error);
    return Response.json(
      {
        error:
          error instanceof Error ? error.message : "Swarm execution failed",
      },
      { status: 500 }
    );
  }
}

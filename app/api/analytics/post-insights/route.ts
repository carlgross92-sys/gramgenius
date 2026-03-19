import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPostInsights } from "@/lib/meta";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { postId } = body;

    if (!postId) {
      return Response.json(
        { error: "Missing required field: postId" },
        { status: 400 }
      );
    }

    const post = await prisma.post.findUnique({
      where: { id: postId },
      include: { analytics: true },
    });

    if (!post) {
      return Response.json({ error: "Post not found" }, { status: 404 });
    }

    let insights = post.analytics;

    if (post.instagramPostId) {
      try {
        const igInsights = await getPostInsights(post.instagramPostId);

        insights = await prisma.postAnalytics.upsert({
          where: { postId },
          update: {
            likes: igInsights.likes ?? insights?.likes ?? 0,
            comments: igInsights.comments ?? insights?.comments ?? 0,
            reach: igInsights.reach ?? insights?.reach ?? 0,
            impressions:
              igInsights.impressions ?? insights?.impressions ?? 0,
            saves: igInsights.saves ?? insights?.saves ?? 0,
            shares: igInsights.shares ?? insights?.shares ?? 0,
            fetchedAt: new Date(),
          },
          create: {
            postId,
            likes: igInsights.likes ?? 0,
            comments: igInsights.comments ?? 0,
            reach: igInsights.reach ?? 0,
            impressions: igInsights.impressions ?? 0,
            saves: igInsights.saves ?? 0,
            shares: igInsights.shares ?? 0,
            fetchedAt: new Date(),
          },
        });
      } catch (igError) {
        console.error("Failed to fetch Instagram insights:", igError);
        if (!insights) {
          return Response.json(
            { error: "Failed to fetch insights from Instagram" },
            { status: 502 }
          );
        }
      }
    }

    if (!insights) {
      return Response.json(
        {
          error:
            "No analytics available. Post has not been published to Instagram yet.",
        },
        { status: 404 }
      );
    }

    return Response.json({ analytics: insights });
  } catch (error) {
    console.error("Failed to fetch post insights:", error);
    return Response.json(
      { error: "Failed to fetch post insights" },
      { status: 500 }
    );
  }
}

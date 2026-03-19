import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const brandProfileId = searchParams.get("brandProfileId");
    const used = searchParams.get("used");

    const where: Record<string, unknown> = {};

    if (brandProfileId) {
      where.brandProfileId = brandProfileId;
    }

    if (used === "true") {
      where.used = true;
    } else if (used === "false") {
      where.used = false;
    }

    const ideas = await prisma.contentIdea.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    return Response.json({ ideas });
  } catch (error) {
    console.error("Failed to list content ideas:", error);
    return Response.json(
      { error: "Failed to list content ideas" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { ideas } = body;

    if (!ideas || !Array.isArray(ideas) || ideas.length === 0) {
      return Response.json(
        { error: "Must provide an array of ideas" },
        { status: 400 }
      );
    }

    const created = await prisma.contentIdea.createMany({
      data: ideas.map(
        (idea: {
          title: string;
          description: string;
          trendingReason: string;
          captionAngle: string;
          suggestedHashtags: string;
          postTypeRecommendation?: string;
          trendScore?: number;
          brandProfileId: string;
        }) => ({
          title: idea.title,
          description: idea.description,
          trendingReason: idea.trendingReason,
          captionAngle: idea.captionAngle,
          suggestedHashtags: idea.suggestedHashtags,
          postTypeRecommendation: idea.postTypeRecommendation ?? "FEED",
          trendScore: idea.trendScore ?? 5,
          brandProfileId: idea.brandProfileId,
        })
      ),
    });

    return Response.json({ count: created.count }, { status: 201 });
  } catch (error) {
    console.error("Failed to save content ideas:", error);
    return Response.json(
      { error: "Failed to save content ideas" },
      { status: 500 }
    );
  }
}

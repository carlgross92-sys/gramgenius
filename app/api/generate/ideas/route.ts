import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateWithClaudeJSON } from "@/lib/anthropic";

interface IdeaResult {
  title: string;
  description: string;
  trendingReason: string;
  captionAngle: string;
  suggestedHashtags: string;
  postTypeRecommendation: string;
  trendScore: number;
}

interface IdeasResponse {
  ideas: IdeaResult[];
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { niche, contentPillars, targetAudience, brandProfileId } = body;

    if (!niche || !contentPillars || !targetAudience || !brandProfileId) {
      return Response.json(
        {
          error:
            "Missing required fields: niche, contentPillars, targetAudience, brandProfileId",
        },
        { status: 400 }
      );
    }

    const systemPrompt = `You are GramGenius, an Instagram content research specialist. You study trending content, viral formats, and audience engagement patterns.

Return valid JSON with this structure:
{
  "ideas": [
    {
      "title": "Short catchy title",
      "description": "2-3 sentence description of the content idea",
      "trendingReason": "Why this is trending or timely right now",
      "captionAngle": "The angle/approach for the caption",
      "suggestedHashtags": "comma-separated relevant hashtags without #",
      "postTypeRecommendation": "FEED or REEL or CAROUSEL or STORY",
      "trendScore": 7
    }
  ]
}

Rules:
- Generate 8-10 unique content ideas
- Mix of post types (FEED, REEL, CAROUSEL, STORY)
- trendScore is 1-10 (10 = extremely trending/timely)
- Ideas should be specific and actionable, not generic
- Include a mix of educational, entertaining, and inspirational content
- Consider current social media trends and viral formats`;

    const userPrompt = `Research and generate content ideas for:
Niche: ${niche}
Content Pillars: ${JSON.stringify(contentPillars)}
Target Audience: ${targetAudience}

Generate 8-10 highly specific, trending content ideas that would perform well on Instagram right now.`;

    const result = await generateWithClaudeJSON<IdeasResponse>(
      systemPrompt,
      userPrompt,
      3000
    );

    const savedIdeas = await Promise.all(
      result.ideas.map((idea) =>
        prisma.contentIdea.create({
          data: {
            title: idea.title,
            description: idea.description,
            trendingReason: idea.trendingReason,
            captionAngle: idea.captionAngle,
            suggestedHashtags: idea.suggestedHashtags,
            postTypeRecommendation: idea.postTypeRecommendation,
            trendScore: idea.trendScore,
            brandProfileId,
          },
        })
      )
    );

    return Response.json({ ideas: savedIdeas }, { status: 201 });
  } catch (error) {
    console.error("Failed to generate ideas:", error);
    return Response.json(
      { error: "Failed to generate ideas" },
      { status: 500 }
    );
  }
}

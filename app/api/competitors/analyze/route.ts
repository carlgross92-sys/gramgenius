import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateWithClaudeJSON } from "@/lib/anthropic";

interface CompetitorInsight {
  handle: string;
  contentTypes: string[];
  topTopics: string[];
  postingFrequency: string;
  hashtagStrategy: string;
  bioApproach: string;
  strengthNotes: string;
  weaknessNotes: string;
}

interface CompetitorAnalysisResponse {
  competitors: CompetitorInsight[];
  contentGaps: string[];
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { handles, brandProfileId } = body;

    if (
      !handles ||
      !Array.isArray(handles) ||
      handles.length === 0 ||
      !brandProfileId
    ) {
      return Response.json(
        {
          error:
            "Missing required fields: handles (array of strings), brandProfileId",
        },
        { status: 400 }
      );
    }

    const brand = await prisma.brandProfile.findUnique({
      where: { id: brandProfileId },
    });
    if (!brand) {
      return Response.json(
        { error: "Brand profile not found" },
        { status: 404 }
      );
    }

    const systemPrompt = `You are GramGenius, a competitive intelligence analyst for Instagram marketing.

BRAND CONTEXT:
- Brand: ${brand.name} (@${brand.instagramHandle})
- Niche: ${brand.niche}
- Target Audience: ${brand.targetAudience}

Return valid JSON:
{
  "competitors": [
    {
      "handle": "@competitor",
      "contentTypes": ["reels", "carousels", "stories"],
      "topTopics": ["topic1", "topic2", "topic3"],
      "postingFrequency": "e.g., 5-7 posts/week, daily stories",
      "hashtagStrategy": "Description of their hashtag approach",
      "bioApproach": "How they position their bio/profile",
      "strengthNotes": "What they do well",
      "weaknessNotes": "Where they could improve / your opportunity"
    }
  ],
  "contentGaps": [
    "Content opportunity they're missing that you could fill",
    "Topic/format gap in the niche"
  ]
}

Rules:
- Analyze each competitor handle thoroughly
- Identify specific content types, topics, and strategies
- Find actionable content gaps between competitors and your brand
- Be specific with posting frequency estimates
- Content gaps should be specific opportunities, not generic advice
- Include 3-5 content gaps`;

    const userPrompt = `Analyze these Instagram competitors in the ${brand.niche} niche:
${handles.map((h: string) => `- @${h.replace("@", "")}`).join("\n")}

Provide detailed competitive intelligence and identify content gaps relative to @${brand.instagramHandle}.`;

    const result = await generateWithClaudeJSON<CompetitorAnalysisResponse>(
      systemPrompt,
      userPrompt,
      4000
    );

    for (const competitor of result.competitors) {
      await prisma.competitor.upsert({
        where: {
          id: await prisma.competitor
            .findFirst({
              where: {
                handle: competitor.handle.replace("@", ""),
                brandProfileId,
              },
            })
            .then((c) => c?.id ?? "nonexistent"),
        },
        update: {
          niche: brand.niche,
          lastAnalyzedAt: new Date(),
          insightsJson: JSON.stringify(competitor),
        },
        create: {
          handle: competitor.handle.replace("@", ""),
          niche: brand.niche,
          lastAnalyzedAt: new Date(),
          insightsJson: JSON.stringify(competitor),
          brandProfileId,
        },
      });
    }

    return Response.json({
      competitors: result.competitors,
      contentGaps: result.contentGaps,
    });
  } catch (error) {
    console.error("Failed to analyze competitors:", error);
    return Response.json(
      { error: "Failed to analyze competitors" },
      { status: 500 }
    );
  }
}

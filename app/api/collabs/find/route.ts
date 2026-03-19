import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateWithClaudeJSON } from "@/lib/anthropic";

interface ProspectResult {
  handle: string;
  estimatedFollowers: number;
  engagementRate: number;
  contentNiche: string;
  whyGoodFit: string;
  pitchDraft: string;
}

interface CollabResponse {
  prospects: ProspectResult[];
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { niche, sizeRange, brandProfileId } = body;

    if (!niche || !brandProfileId) {
      return Response.json(
        { error: "Missing required fields: niche, brandProfileId" },
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

    const systemPrompt = `You are GramGenius, an influencer outreach and collaboration specialist.

BRAND CONTEXT:
- Brand: ${brand.name} (@${brand.instagramHandle})
- Niche: ${brand.niche}
- Target Audience: ${brand.targetAudience}
- Brand Voice: ${brand.brandVoice}

Return valid JSON:
{
  "prospects": [
    {
      "handle": "influencer_handle",
      "estimatedFollowers": 25000,
      "engagementRate": 4.5,
      "contentNiche": "Their specific content focus",
      "whyGoodFit": "Why this creator would be a great collab partner",
      "pitchDraft": "A personalized DM pitch to reach out"
    }
  ]
}

Rules:
- Generate 8-12 realistic collaboration prospects
- ${sizeRange ? `Focus on creators in the ${sizeRange} follower range` : "Mix of nano (1k-10k), micro (10k-50k), and mid-tier (50k-200k) creators"}
- Each prospect should have a unique content angle
- Engagement rates should be realistic (2-8% typically)
- whyGoodFit should reference specific brand alignment
- pitchDraft should be personalized, warm, and professional (3-5 sentences)
- Pitches should mention specific content of theirs and propose a clear collaboration idea
- Handles should be realistic Instagram-style usernames`;

    const userPrompt = `Find collaboration prospects for @${brand.instagramHandle} in the ${niche} niche.
${sizeRange ? `Target size range: ${sizeRange}` : "Mix of sizes for diverse reach."}

Generate a curated list of ideal collaboration partners with personalized pitches.`;

    const result = await generateWithClaudeJSON<CollabResponse>(
      systemPrompt,
      userPrompt,
      4000
    );

    const savedProspects = await Promise.all(
      result.prospects.map((prospect) =>
        prisma.collabProspect.create({
          data: {
            handle: prospect.handle,
            estimatedFollowers: prospect.estimatedFollowers,
            engagementRate: prospect.engagementRate,
            contentNiche: prospect.contentNiche,
            whyGoodFit: prospect.whyGoodFit,
            pitchDraft: prospect.pitchDraft,
            status: "NOT_CONTACTED",
            brandProfileId,
          },
        })
      )
    );

    return Response.json({ prospects: savedProspects }, { status: 201 });
  } catch (error) {
    console.error("Failed to find collab prospects:", error);
    return Response.json(
      { error: "Failed to find collab prospects" },
      { status: 500 }
    );
  }
}

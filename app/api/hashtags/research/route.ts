import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateWithClaudeJSON } from "@/lib/anthropic";

interface HashtagResearchResponse {
  hashtags: {
    mega: string[];
    mid: string[];
    niche: string[];
    micro: string[];
  };
  recommendedSet: string[];
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { keyword } = body;

    if (!keyword) {
      return Response.json(
        { error: "Missing required field: keyword" },
        { status: 400 }
      );
    }

    const systemPrompt = `You are GramGenius, a hashtag research specialist for Instagram.

Return valid JSON:
{
  "hashtags": {
    "mega": ["hashtag1", "hashtag2", "..."],
    "mid": ["hashtag1", "hashtag2", "..."],
    "niche": ["hashtag1", "hashtag2", "..."],
    "micro": ["hashtag1", "hashtag2", "..."]
  },
  "recommendedSet": ["hashtag1", "hashtag2", "...(20 total)"]
}

Rules:
- Research 80 total hashtags related to the keyword
- Categorize by estimated size:
  - Mega: 1M+ posts (broad reach, high competition) - ~20 hashtags
  - Mid: 100k-1M posts (good balance) - ~25 hashtags
  - Niche: 10k-100k posts (targeted, lower competition) - ~25 hashtags
  - Micro: <10k posts (very targeted, highest engagement rate) - ~10 hashtags
- recommendedSet: Auto-select the optimal 20 hashtags with this split: 5 mega, 8 mid, 5 niche, 2 micro
- Do NOT include the # symbol
- All hashtags should be lowercase
- No spaces in hashtags (use no separator or underscores)
- Focus on hashtags that are currently active and relevant
- Include a mix of evergreen and trending hashtags`;

    const userPrompt = `Research 80 Instagram hashtags for the keyword: "${keyword}"

Categorize by size and auto-select the optimal 20.`;

    const result = await generateWithClaudeJSON<HashtagResearchResponse>(
      systemPrompt,
      userPrompt,
      4000
    );

    const allHashtags = [
      ...result.hashtags.mega.map((tag) => ({
        tag: tag.toLowerCase(),
        sizeCategory: "mega",
      })),
      ...result.hashtags.mid.map((tag) => ({
        tag: tag.toLowerCase(),
        sizeCategory: "mid",
      })),
      ...result.hashtags.niche.map((tag) => ({
        tag: tag.toLowerCase(),
        sizeCategory: "niche",
      })),
      ...result.hashtags.micro.map((tag) => ({
        tag: tag.toLowerCase(),
        sizeCategory: "micro",
      })),
    ];

    for (const hashtag of allHashtags) {
      await prisma.hashtag.upsert({
        where: { tag: hashtag.tag },
        update: { sizeCategory: hashtag.sizeCategory },
        create: {
          tag: hashtag.tag,
          sizeCategory: hashtag.sizeCategory,
        },
      });
    }

    return Response.json(result);
  } catch (error) {
    console.error("Failed to research hashtags:", error);
    return Response.json(
      { error: "Failed to research hashtags" },
      { status: 500 }
    );
  }
}

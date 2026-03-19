import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateWithClaudeJSON } from "@/lib/anthropic";

interface CaptionResponse {
  captions: {
    shortPunchy: string;
    mediumStorytelling: string;
    longValueAdd: string;
  };
  hookAlternatives: string[];
  hashtags: {
    mega: string[];
    mid: string[];
    niche: string[];
    micro: string[];
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { topic, postType, platform, ideaContext, hookType } = body;

    if (!topic || !postType || !platform) {
      return Response.json(
        { error: "Missing required fields: topic, postType, platform" },
        { status: 400 }
      );
    }

    const brand = await prisma.brandProfile.findFirst();
    if (!brand) {
      return Response.json(
        { error: "No brand profile found. Please set up your brand first." },
        { status: 400 }
      );
    }

    const contentPillars = (() => {
      try {
        return JSON.parse(brand.contentPillars);
      } catch {
        return brand.contentPillars;
      }
    })();

    const systemPrompt = `You are GramGenius, an elite Instagram content strategist and copywriter.

BRAND CONTEXT:
- Brand: ${brand.name} (@${brand.instagramHandle})
- Niche: ${brand.niche}
- Target Audience: ${brand.targetAudience}
- Brand Voice: ${brand.brandVoice}
- Content Pillars: ${JSON.stringify(contentPillars)}

You must return valid JSON matching this exact structure:
{
  "captions": {
    "shortPunchy": "Short & punchy caption (1-3 lines, high impact)",
    "mediumStorytelling": "Medium storytelling caption (4-8 lines, narrative hook)",
    "longValueAdd": "Long value-add caption (8-15 lines, educational/inspirational)"
  },
  "hookAlternatives": ["hook1", "hook2", "hook3"],
  "hashtags": {
    "mega": ["tag1", "tag2", "tag3", "tag4", "tag5"],
    "mid": ["tag1", "tag2", "tag3", "tag4", "tag5", "tag6", "tag7", "tag8"],
    "niche": ["tag1", "tag2", "tag3", "tag4", "tag5"],
    "micro": ["tag1", "tag2"]
  }
}

Rules:
- Each caption must be authentic to the brand voice
- Include a strong hook in the first line
- Add a clear call-to-action
- Hashtags should NOT include the # symbol
- Mega hashtags: 1M+ posts, Mid: 100k-1M, Niche: 10k-100k, Micro: <10k
- Exactly 5 mega, 8 mid, 5 niche, 2 micro hashtags (20 total)
- Hook alternatives should be different styles (question, bold statement, statistic)`;

    const userPrompt = `Generate 3 caption variations + hooks + hashtags for:
Topic: ${topic}
Post Type: ${postType}
Platform: ${platform}
${ideaContext ? `Context: ${ideaContext}` : ""}
${hookType ? `Preferred Hook Style: ${hookType}` : ""}`;

    const result = await generateWithClaudeJSON<CaptionResponse>(
      systemPrompt,
      userPrompt,
      2048
    );

    return Response.json(result);
  } catch (error) {
    console.error("Failed to generate captions:", error);
    return Response.json(
      { error: "Failed to generate captions" },
      { status: 500 }
    );
  }
}

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateWithClaudeJSON } from "@/lib/anthropic";

interface Scene {
  sceneNumber: number;
  duration: string;
  onScreenText: string;
  voiceoverLine: string;
  visualDescription: string;
  bRollSuggestion: string;
}

interface ReelScriptResponse {
  hookText: string;
  hookType: string;
  scenes: Scene[];
  musicMood: string;
  coverFrameSuggestion: string;
  caption: string;
  hashtags: string[];
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { topic, reelStyle, targetDuration, brandProfileId } = body;

    if (!topic || !reelStyle || !brandProfileId) {
      return Response.json(
        { error: "Missing required fields: topic, reelStyle, brandProfileId" },
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

    const contentPillars = (() => {
      try {
        return JSON.parse(brand.contentPillars);
      } catch {
        return brand.contentPillars;
      }
    })();

    const durationSec = targetDuration || 30;

    const systemPrompt = `You are GramGenius, an expert Instagram Reels scriptwriter and director.

BRAND CONTEXT:
- Brand: ${brand.name} (@${brand.instagramHandle})
- Niche: ${brand.niche}
- Target Audience: ${brand.targetAudience}
- Brand Voice: ${brand.brandVoice}
- Content Pillars: ${JSON.stringify(contentPillars)}

Return valid JSON:
{
  "hookText": "The opening hook text (first 1-3 seconds)",
  "hookType": "question|bold_claim|shocking_stat|relatable_moment",
  "scenes": [
    {
      "sceneNumber": 1,
      "duration": "0:00-0:03",
      "onScreenText": "Text overlay for this scene",
      "voiceoverLine": "What to say during this scene",
      "visualDescription": "Detailed description of the visual/footage",
      "bRollSuggestion": "Supplementary footage idea"
    }
  ],
  "musicMood": "Description of ideal background music mood/genre",
  "coverFrameSuggestion": "What the thumbnail/cover frame should show",
  "caption": "Full caption for the reel",
  "hashtags": ["hashtag1", "hashtag2"]
}

Rules:
- Reel style: ${reelStyle}
- Target duration: ${durationSec} seconds
- Scene timings must add up to approximately ${durationSec} seconds
- Hook must grab attention in the first 1-3 seconds
- Each scene needs clear visual direction and voiceover
- On-screen text should be concise (max 8 words per scene)
- Include 4-8 scenes depending on duration
- Voiceover should sound natural and conversational
- Caption should be engaging with a CTA
- Include 20 hashtags without # symbol`;

    const userPrompt = `Write a complete scene-by-scene Reel script for:
Topic: ${topic}
Style: ${reelStyle}
Duration: ~${durationSec} seconds

Create a viral-worthy Reel script with detailed scene breakdowns.`;

    const result = await generateWithClaudeJSON<ReelScriptResponse>(
      systemPrompt,
      userPrompt,
      3000
    );

    return Response.json({ script: result });
  } catch (error) {
    console.error("Failed to generate reel script:", error);
    return Response.json(
      { error: "Failed to generate reel script" },
      { status: 500 }
    );
  }
}

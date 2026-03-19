import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateWithClaudeJSON } from "@/lib/anthropic";

interface StorySlide {
  slideNumber: number;
  type: string;
  contentText: string;
  stickerSuggestion: string;
  ctaText?: string;
}

interface StoryResponse {
  slides: StorySlide[];
  publishingTips: string[];
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { theme, brandProfileId } = body;

    if (!theme || !brandProfileId) {
      return Response.json(
        { error: "Missing required fields: theme, brandProfileId" },
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

    const systemPrompt = `You are GramGenius, an Instagram Stories strategist.

BRAND CONTEXT:
- Brand: ${brand.name} (@${brand.instagramHandle})
- Niche: ${brand.niche}
- Target Audience: ${brand.targetAudience}
- Brand Voice: ${brand.brandVoice}
- Content Pillars: ${JSON.stringify(contentPillars)}

Return valid JSON:
{
  "slides": [
    {
      "slideNumber": 1,
      "type": "poll|question|quiz|content|behind_the_scenes|tip|cta",
      "contentText": "Main text content for this story slide",
      "stickerSuggestion": "Suggestion for interactive sticker (poll, question box, quiz, slider, etc.)",
      "ctaText": "Optional CTA text (only for CTA slides)"
    }
  ],
  "publishingTips": [
    "Tip about timing, sticker usage, etc."
  ]
}

Rules:
- Generate 3-7 story slides
- Slide 1: Opening engagement (poll, question, or quiz to boost interaction)
- Middle slides: Content delivery (tips, behind-the-scenes, educational)
- Final slide: CTA (swipe up, visit link, DM, follow, etc.)
- Each slide should use Instagram's interactive features (polls, questions, quizzes, sliders)
- Content text should be concise (Stories are visual, not text-heavy)
- Sticker suggestions should be specific (e.g., "Poll: Option A vs Option B")
- Include 3-5 practical publishing tips`;

    const userPrompt = `Create an Instagram Story sequence about: ${theme}

Generate 3-7 story slides with interactive elements and a clear narrative arc.`;

    const result = await generateWithClaudeJSON<StoryResponse>(
      systemPrompt,
      userPrompt,
      2048
    );

    const storySequence = await prisma.storySequence.create({
      data: {
        theme,
        slidesJson: JSON.stringify(result.slides),
        status: "DRAFT",
        brandProfileId,
      },
    });

    return Response.json(
      {
        storyId: storySequence.id,
        slides: result.slides,
        publishingTips: result.publishingTips,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Failed to generate story:", error);
    return Response.json(
      { error: "Failed to generate story" },
      { status: 500 }
    );
  }
}

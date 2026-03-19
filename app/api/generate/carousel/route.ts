import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateWithClaudeJSON } from "@/lib/anthropic";

interface CarouselSlideResult {
  slideNumber: number;
  headline: string;
  bodyText: string;
  visualSuggestion: string;
}

interface CarouselResponse {
  slides: CarouselSlideResult[];
  caption: string;
  hashtags: string[];
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { topic, brandProfileId } = body;

    if (!topic || !brandProfileId) {
      return Response.json(
        { error: "Missing required fields: topic, brandProfileId" },
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

    const systemPrompt = `You are GramGenius, a carousel content expert for Instagram.

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
      "headline": "Hook slide headline (scroll-stopping)",
      "bodyText": "Supporting text for this slide",
      "visualSuggestion": "Description of visual/design for this slide"
    }
  ],
  "caption": "Full caption for the carousel post",
  "hashtags": ["hashtag1", "hashtag2"]
}

Rules:
- Slide 1: Hook slide - bold, attention-grabbing headline that makes people swipe
- Slides 2-7: Content slides - one key point per slide, clear and scannable
- Slide 8: CTA slide - clear call to action (save, share, follow, comment)
- Each slide headline should be 3-8 words
- Body text should be 1-3 short sentences max
- Visual suggestions should be specific and actionable
- Caption should reference the carousel and encourage saving/sharing
- Include 20 relevant hashtags without # symbol
- Total of exactly 8 slides`;

    const userPrompt = `Create a full Instagram carousel about: ${topic}

Generate an 8-slide carousel (hook + 6 content + CTA) with caption and hashtags.`;

    const result = await generateWithClaudeJSON<CarouselResponse>(
      systemPrompt,
      userPrompt,
      3000
    );

    const post = await prisma.post.create({
      data: {
        topic,
        caption: result.caption,
        hashtags: result.hashtags.join(", "),
        postType: "CAROUSEL",
        platform: "INSTAGRAM",
        brandProfileId,
      },
    });

    const carouselSlides = await Promise.all(
      result.slides.map((slide) =>
        prisma.carouselSlide.create({
          data: {
            postId: post.id,
            slideNumber: slide.slideNumber,
            headline: slide.headline,
            bodyText: slide.bodyText,
            visualSuggestion: slide.visualSuggestion,
          },
        })
      )
    );

    return Response.json(
      {
        postId: post.id,
        slides: carouselSlides,
        caption: result.caption,
        hashtags: result.hashtags,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Failed to generate carousel:", error);
    return Response.json(
      { error: "Failed to generate carousel" },
      { status: 500 }
    );
  }
}

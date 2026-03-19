import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateWithClaudeJSON } from "@/lib/anthropic";

interface RepurposeResponse {
  formats: {
    carousel: {
      slides: { slideNumber: number; headline: string; bodyText: string }[];
      caption: string;
    };
    reel: {
      hookText: string;
      scenes: {
        sceneNumber: number;
        onScreenText: string;
        voiceoverLine: string;
        visualDescription: string;
      }[];
      caption: string;
    };
    story: {
      slides: {
        slideNumber: number;
        type: string;
        contentText: string;
        stickerSuggestion: string;
      }[];
    };
    twitter: {
      thread: string[];
    };
    linkedin: {
      post: string;
    };
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { postId, caption, topic } = body;

    if (!topic) {
      return Response.json(
        { error: "Missing required field: topic" },
        { status: 400 }
      );
    }

    let sourceCaption = caption || "";
    let sourceTopic = topic;

    if (postId) {
      const post = await prisma.post.findUnique({
        where: { id: postId },
        include: { carouselSlides: true },
      });
      if (post) {
        sourceCaption = post.caption;
        sourceTopic = post.topic;
      }
    }

    if (!sourceCaption && !sourceTopic) {
      return Response.json(
        { error: "Must provide postId (with existing post) or caption" },
        { status: 400 }
      );
    }

    const systemPrompt = `You are GramGenius, a content repurposing specialist. You transform one piece of content into multiple formats while maintaining the core message and value.

Return valid JSON:
{
  "formats": {
    "carousel": {
      "slides": [
        { "slideNumber": 1, "headline": "Hook headline", "bodyText": "Supporting text" }
      ],
      "caption": "Caption for carousel post"
    },
    "reel": {
      "hookText": "Opening hook for the reel",
      "scenes": [
        {
          "sceneNumber": 1,
          "onScreenText": "Text overlay",
          "voiceoverLine": "What to say",
          "visualDescription": "What to show"
        }
      ],
      "caption": "Caption for reel"
    },
    "story": {
      "slides": [
        {
          "slideNumber": 1,
          "type": "poll|question|content|cta",
          "contentText": "Story slide text",
          "stickerSuggestion": "Interactive element"
        }
      ]
    },
    "twitter": {
      "thread": ["Tweet 1 (max 280 chars)", "Tweet 2", "Tweet 3"]
    },
    "linkedin": {
      "post": "Full LinkedIn post (professional tone, 1300 chars max)"
    }
  }
}

Rules:
- Carousel: 5-8 slides, educational format
- Reel: 4-6 scenes, 15-30 second format
- Story: 3-5 slides with interactive elements
- Twitter thread: 3-7 tweets, each under 280 characters, conversational
- LinkedIn post: Professional tone, actionable insights, uses line breaks
- Each format should feel native to its platform, not a copy-paste
- Adapt tone, length, and structure for each platform`;

    const userPrompt = `Repurpose this content into 5 different formats:

Topic: ${sourceTopic}
Original Caption: ${sourceCaption}

Transform this into carousel, reel script, story sequence, Twitter thread, and LinkedIn post.`;

    const result = await generateWithClaudeJSON<RepurposeResponse>(
      systemPrompt,
      userPrompt,
      4000
    );

    return Response.json(result);
  } catch (error) {
    console.error("Failed to repurpose content:", error);
    return Response.json(
      { error: "Failed to repurpose content" },
      { status: 500 }
    );
  }
}

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateWithClaudeJSON } from "@/lib/anthropic";

interface HookResult {
  hooks: {
    type: string;
    text: string;
    category: string;
  }[];
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { topic, captionText } = body;

    if (!topic || !captionText) {
      return Response.json(
        { error: "Missing required fields: topic, captionText" },
        { status: 400 }
      );
    }

    const hookTemplates = await prisma.hookTemplate.findMany({
      where: { isActive: true },
      orderBy: { avgEngagementRate: "desc" },
      take: 20,
    });

    const templatesContext =
      hookTemplates.length > 0
        ? `\n\nAvailable hook templates to choose from and customize:\n${hookTemplates
            .map(
              (h) =>
                `- [${h.category}] "${h.template}" (engagement: ${h.avgEngagementRate})`
            )
            .join("\n")}`
        : "";

    const systemPrompt = `You are GramGenius, a hook-writing specialist for Instagram. You know exactly how to write opening lines that stop the scroll.

Return valid JSON:
{
  "hooks": [
    {
      "type": "question",
      "text": "The actual hook text ready to use",
      "category": "curiosity"
    }
  ]
}

Hook types: question, bold_statement, statistic, story_opener, controversial, how_to, list
Categories: curiosity, fear_of_missing, social_proof, authority, urgency, relatability

Rules:
- Select and customize the 3 BEST hooks for this specific content
- Each hook must be different in type and approach
- Hooks should be 1-2 sentences max
- They must be scroll-stopping and create an open loop
- Customize templates to fit the exact topic${templatesContext}`;

    const userPrompt = `Generate 3 customized hooks for:
Topic: ${topic}
Caption context: ${captionText.substring(0, 500)}`;

    const result = await generateWithClaudeJSON<HookResult>(
      systemPrompt,
      userPrompt,
      1024
    );

    if (hookTemplates.length > 0) {
      for (const template of hookTemplates) {
        const wasUsed = result.hooks.some(
          (h) =>
            h.category.toLowerCase() === template.category.toLowerCase()
        );
        if (wasUsed) {
          await prisma.hookTemplate.update({
            where: { id: template.id },
            data: { timesUsed: template.timesUsed + 1 },
          });
        }
      }
    }

    return Response.json(result);
  } catch (error) {
    console.error("Failed to generate hooks:", error);
    return Response.json(
      { error: "Failed to generate hooks" },
      { status: 500 }
    );
  }
}

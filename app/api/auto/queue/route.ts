import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateWithClaudeJSON } from "@/lib/anthropic";

const QUEUE_SYSTEM_PROMPT =
  "You are a trending content researcher for a funny animals Instagram account (@chewy_sacramento). Generate unique, specific, viral-worthy content topics. Each must be distinct. Return JSON array of objects with: topic (string, specific and actionable), category (one of: funny_fails, cute_moments, reactions, wild_animals, baby_animals, human_things, seasonal, viral), trendScore (integer 5-10).";

interface QueueTopic {
  topic: string;
  category: string;
  trendScore: number;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const unusedOnly = searchParams.get("unused") === "true";

    const where: Record<string, unknown> = {};
    if (unusedOnly) {
      where.used = false;
    }

    const items = await prisma.contentQueue.findMany({
      where,
      orderBy: { trendScore: "desc" },
    });

    return Response.json({ items, total: items.length });
  } catch (error) {
    console.error("[AutoQueue] Failed to fetch queue:", error);
    return Response.json(
      { error: "Failed to fetch content queue" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, topics } = body as {
      action: "seed" | "add" | "refill";
      topics?: QueueTopic[];
    };

    if (!action || !["seed", "add", "refill"].includes(action)) {
      return Response.json(
        { error: "action must be one of: seed, add, refill" },
        { status: 400 }
      );
    }

    let topicsToInsert: QueueTopic[] = [];

    if (action === "seed") {
      const generated = await generateWithClaudeJSON<QueueTopic[]>(
        QUEUE_SYSTEM_PROMPT,
        "Generate 30 unique funny animal content topics spread across all 8 categories: funny_fails, cute_moments, reactions, wild_animals, baby_animals, human_things, seasonal, viral. Make each topic specific, actionable, and viral-worthy."
      );
      topicsToInsert = generated;
    } else if (action === "add") {
      if (!topics || !Array.isArray(topics) || topics.length === 0) {
        return Response.json(
          { error: "topics array is required for add action" },
          { status: 400 }
        );
      }
      topicsToInsert = topics;
    } else if (action === "refill") {
      const unusedCount = await prisma.contentQueue.count({
        where: { used: false },
      });

      if (unusedCount < 10) {
        const generated = await generateWithClaudeJSON<QueueTopic[]>(
          QUEUE_SYSTEM_PROMPT,
          "Generate 20 unique funny animal content topics spread across all 8 categories: funny_fails, cute_moments, reactions, wild_animals, baby_animals, human_things, seasonal, viral. Make each topic specific, actionable, and viral-worthy."
        );
        topicsToInsert = generated;
      } else {
        const totalInQueue = await prisma.contentQueue.count();
        return Response.json({
          action,
          topicsAdded: 0,
          totalInQueue,
          message: `Queue has ${unusedCount} unused topics, no refill needed`,
        });
      }
    }

    if (topicsToInsert.length > 0) {
      await prisma.contentQueue.createMany({
        data: topicsToInsert.map((t) => ({
          topic: t.topic,
          category: t.category,
          trendScore: Math.min(10, Math.max(1, t.trendScore || 5)),
        })),
      });
    }

    const totalInQueue = await prisma.contentQueue.count();

    return Response.json({
      action,
      topicsAdded: topicsToInsert.length,
      totalInQueue,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown queue error";
    console.error("[AutoQueue] Queue operation failed:", error);
    return Response.json(
      { error: `Queue operation failed: ${message}` },
      { status: 500 }
    );
  }
}

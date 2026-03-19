import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const sort = searchParams.get("sort");

    let orderBy: Record<string, string> = { createdAt: "desc" };
    if (sort === "timesUsed") {
      orderBy = { timesUsed: "desc" };
    } else if (sort === "avgReach") {
      orderBy = { avgReach: "desc" };
    }

    const hashtags = await prisma.hashtag.findMany({
      orderBy,
    });

    return Response.json({ hashtags });
  } catch (error) {
    console.error("Failed to list hashtags:", error);
    return Response.json(
      { error: "Failed to list hashtags" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tag, sizeCategory, timesUsed, avgReach } = body;

    if (!tag || !sizeCategory) {
      return Response.json(
        { error: "Missing required fields: tag, sizeCategory" },
        { status: 400 }
      );
    }

    const cleanTag = tag.replace(/^#/, "").trim().toLowerCase();

    const hashtag = await prisma.hashtag.upsert({
      where: { tag: cleanTag },
      update: {
        sizeCategory,
        timesUsed: timesUsed ?? undefined,
        avgReach: avgReach ?? undefined,
      },
      create: {
        tag: cleanTag,
        sizeCategory,
        timesUsed: timesUsed ?? 0,
        avgReach: avgReach ?? 0,
      },
    });

    return Response.json({ hashtag }, { status: 201 });
  } catch (error) {
    console.error("Failed to create/update hashtag:", error);
    return Response.json(
      { error: "Failed to create/update hashtag" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { tag, isBanned } = body;

    if (!tag) {
      return Response.json(
        { error: "Missing required field: tag" },
        { status: 400 }
      );
    }

    const cleanTag = tag.replace(/^#/, "").trim().toLowerCase();

    const existing = await prisma.hashtag.findUnique({
      where: { tag: cleanTag },
    });

    if (!existing) {
      return Response.json(
        { error: "Hashtag not found" },
        { status: 404 }
      );
    }

    const hashtag = await prisma.hashtag.update({
      where: { tag: cleanTag },
      data: {
        isBanned: isBanned ?? true,
      },
    });

    return Response.json({ hashtag });
  } catch (error) {
    console.error("Failed to retire hashtag:", error);
    return Response.json(
      { error: "Failed to retire hashtag" },
      { status: 500 }
    );
  }
}

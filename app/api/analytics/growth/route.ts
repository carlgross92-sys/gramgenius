import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const brandProfileId = searchParams.get("brandProfileId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    if (!brandProfileId) {
      return Response.json(
        { error: "Missing required query parameter: brandProfileId" },
        { status: 400 }
      );
    }

    const where: Record<string, unknown> = { brandProfileId };

    if (startDate || endDate) {
      const dateFilter: Record<string, Date> = {};
      if (startDate) {
        dateFilter.gte = new Date(startDate);
      }
      if (endDate) {
        dateFilter.lte = new Date(endDate);
      }
      where.date = dateFilter;
    }

    const metrics = await prisma.growthMetric.findMany({
      where,
      orderBy: { date: "desc" },
    });

    return Response.json({ metrics });
  } catch (error) {
    console.error("Failed to fetch growth metrics:", error);
    return Response.json(
      { error: "Failed to fetch growth metrics" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      date,
      followerCount,
      newFollowers,
      postsPublished,
      avgEngagementRate,
      topPostId,
      brandProfileId,
    } = body;

    if (!date || !brandProfileId) {
      return Response.json(
        { error: "Missing required fields: date, brandProfileId" },
        { status: 400 }
      );
    }

    const metric = await prisma.growthMetric.create({
      data: {
        date: new Date(date),
        followerCount: followerCount ?? 0,
        newFollowers: newFollowers ?? 0,
        postsPublished: postsPublished ?? 0,
        avgEngagementRate: avgEngagementRate ?? 0,
        topPostId: topPostId ?? null,
        brandProfileId,
      },
    });

    return Response.json({ metric }, { status: 201 });
  } catch (error) {
    console.error("Failed to record growth metric:", error);
    return Response.json(
      { error: "Failed to record growth metric" },
      { status: 500 }
    );
  }
}

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const brand = await prisma.brandProfile.findUnique({
      where: { id },
    });

    if (!brand) {
      return Response.json({ error: "Brand not found" }, { status: 404 });
    }

    const [postCount, jobCount] = await Promise.all([
      prisma.post.count({ where: { brandProfileId: id } }),
      prisma.contentJob.count({ where: { brandProfileId: id } }),
    ]);

    let parsedPillars: string[] = [];
    try {
      parsedPillars = JSON.parse(brand.contentPillars);
    } catch {
      parsedPillars = [];
    }

    return Response.json({
      brand: {
        ...brand,
        contentPillars: parsedPillars,
      },
      stats: {
        postCount,
        jobCount,
      },
    });
  } catch (error) {
    console.error("Failed to load brand:", error);
    return Response.json(
      { error: "Failed to load brand" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const existing = await prisma.brandProfile.findUnique({ where: { id } });
    if (!existing) {
      return Response.json({ error: "Brand not found" }, { status: 404 });
    }

    const updatableFields = [
      "name",
      "instagramHandle",
      "niche",
      "targetAudience",
      "brandVoice",
      "postingGoal",
      "autoPostEnabled",
      "timezone",
      "bestTimesJson",
    ];

    const data: Record<string, unknown> = {};
    for (const field of updatableFields) {
      if (body[field] !== undefined) {
        data[field] = body[field];
      }
    }

    // Handle contentPillars serialization
    if (body.contentPillars !== undefined) {
      data.contentPillars = Array.isArray(body.contentPillars)
        ? JSON.stringify(body.contentPillars)
        : body.contentPillars;
    }

    const brand = await prisma.brandProfile.update({
      where: { id },
      data,
    });

    let parsedPillars: string[] = [];
    try {
      parsedPillars = JSON.parse(brand.contentPillars);
    } catch {
      parsedPillars = [];
    }

    return Response.json({
      brand: {
        ...brand,
        contentPillars: parsedPillars,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Failed to update brand:", message);
    return Response.json(
      { error: `Failed to update brand: ${message}` },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existing = await prisma.brandProfile.findUnique({ where: { id } });
    if (!existing) {
      return Response.json({ error: "Brand not found" }, { status: 404 });
    }

    // Delete associated ContentJobs first (cascade)
    await prisma.contentJob.deleteMany({ where: { brandProfileId: id } });

    // Delete the brand (related models with foreign keys will need cleanup too)
    await prisma.collabProspect.deleteMany({ where: { brandProfileId: id } });
    await prisma.growthMetric.deleteMany({ where: { brandProfileId: id } });
    await prisma.storySequence.deleteMany({ where: { brandProfileId: id } });
    await prisma.competitor.deleteMany({ where: { brandProfileId: id } });
    await prisma.contentIdea.deleteMany({ where: { brandProfileId: id } });

    // Delete posts and their related data
    const posts = await prisma.post.findMany({
      where: { brandProfileId: id },
      select: { id: true },
    });
    const postIds = posts.map((p) => p.id);

    if (postIds.length > 0) {
      await prisma.carouselSlide.deleteMany({
        where: { postId: { in: postIds } },
      });
      await prisma.postAnalytics.deleteMany({
        where: { postId: { in: postIds } },
      });
      await prisma.post.deleteMany({ where: { brandProfileId: id } });
    }

    await prisma.brandProfile.delete({ where: { id } });

    return Response.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Failed to delete brand:", message);
    return Response.json(
      { error: `Failed to delete brand: ${message}` },
      { status: 500 }
    );
  }
}

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const brands = await prisma.brandProfile.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: {
            posts: true,
            ideas: true,
          },
        },
      },
    });

    // Also fetch engine configs to check enabled status per brand
    const engines = await prisma.continuousEngine.findMany();
    const engineMap = new Map(
      engines.map((e) => [e.brandProfileId, e.enabled])
    );

    // Get active ContentJob counts per brand
    const jobCounts = await prisma.contentJob.groupBy({
      by: ["brandProfileId"],
      where: {
        brandProfileId: { not: null },
        status: { in: ["QUEUED", "PROCESSING", "PENDING"] },
      },
      _count: { id: true },
    });

    const jobCountMap = new Map(
      jobCounts.map((j) => [j.brandProfileId, j._count.id])
    );

    const brandsWithCounts = brands.map((brand) => {
      let parsedPillars: string[] = [];
      try {
        parsedPillars = JSON.parse(brand.contentPillars);
      } catch {
        parsedPillars = [];
      }

      return {
        id: brand.id,
        name: brand.name,
        handle: brand.instagramHandle,
        niche: brand.niche,
        brandVoice: brand.brandVoice,
        targetAudience: brand.targetAudience,
        contentPillars: parsedPillars,
        postingGoal: brand.postingGoal,
        autoPostEnabled: brand.autoPostEnabled,
        timezone: brand.timezone,
        postCount: brand._count.posts,
        pillarCount: parsedPillars.length,
        activeJobCount: jobCountMap.get(brand.id) ?? 0,
        engineEnabled: engineMap.get(brand.id) ?? false,
        createdAt: brand.createdAt,
      };
    });

    return Response.json({ brands: brandsWithCounts });
  } catch (error) {
    console.error("Failed to load brands:", error);
    return Response.json(
      { error: "Failed to load brands" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const name = body.name || body.brandName;
    const instagramHandle = (body.instagramHandle || body.handle || "").replace(/^@/, "");
    const niche = body.niche;
    const targetAudience = body.targetAudience || "";
    const brandVoice = body.brandVoice || "Casual & Friendly";
    const contentPillars = body.contentPillars;
    const postingGoal = body.postingGoal;
    const timezone = body.timezone;

    if (!name || !instagramHandle || !niche) {
      return Response.json(
        { error: "Name, handle, and niche are required" },
        { status: 400 }
      );
    }

    const pillarsStr = Array.isArray(contentPillars)
      ? JSON.stringify(contentPillars)
      : contentPillars ?? "[]";

    const brand = await prisma.brandProfile.create({
      data: {
        name,
        instagramHandle,
        niche,
        targetAudience,
        brandVoice,
        contentPillars: pillarsStr,
        postingGoal: postingGoal ?? 3,
        autoPostEnabled: false,
        timezone: timezone ?? "America/Los_Angeles",
        bestTimesJson: "[]",
      },
    });

    let parsedPillars: string[] = [];
    try {
      parsedPillars = JSON.parse(brand.contentPillars);
    } catch {
      parsedPillars = [];
    }

    return Response.json(
      {
        brand: {
          id: brand.id,
          name: brand.name,
          handle: brand.instagramHandle,
          niche: brand.niche,
          brandVoice: brand.brandVoice,
          targetAudience: brand.targetAudience,
          contentPillars: parsedPillars,
          postingGoal: brand.postingGoal,
          autoPostEnabled: brand.autoPostEnabled,
          timezone: brand.timezone,
          postCount: 0,
          pillarCount: parsedPillars.length,
          activeJobCount: 0,
          engineEnabled: false,
          createdAt: brand.createdAt,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Failed to create brand:", message);
    return Response.json(
      { error: `Failed to create brand: ${message}` },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return Response.json({ error: "Brand ID is required" }, { status: 400 });
    }

    // Delete related records first to avoid foreign key errors
    await prisma.collabProspect.deleteMany({ where: { brandProfileId: id } });
    await prisma.growthMetric.deleteMany({ where: { brandProfileId: id } });
    await prisma.storySequence.deleteMany({ where: { brandProfileId: id } });
    await prisma.competitor.deleteMany({ where: { brandProfileId: id } });
    await prisma.contentIdea.deleteMany({ where: { brandProfileId: id } });
    await prisma.contentJob.deleteMany({ where: { brandProfileId: id } });
    await prisma.continuousEngine.deleteMany({ where: { brandProfileId: id } });

    // Delete posts (and their analytics/carousel slides)
    const posts = await prisma.post.findMany({
      where: { brandProfileId: id },
      select: { id: true },
    });
    const postIds = posts.map((p) => p.id);
    if (postIds.length > 0) {
      await prisma.postAnalytics.deleteMany({ where: { postId: { in: postIds } } });
      await prisma.carouselSlide.deleteMany({ where: { postId: { in: postIds } } });
    }
    await prisma.post.deleteMany({ where: { brandProfileId: id } });

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

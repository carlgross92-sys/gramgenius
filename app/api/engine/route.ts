import prisma from "@/lib/prisma";

async function getActiveBrand(request: Request) {
  const url = new URL(request.url);
  const brandId =
    request.headers.get("x-brand-id") ||
    url.searchParams.get("brandId") ||
    null;

  if (brandId) {
    const brand = await prisma.brandProfile.findUnique({ where: { id: brandId } });
    if (brand) return brand;
  }

  // Fallback to most recently updated brand
  return prisma.brandProfile.findFirst({ orderBy: { updatedAt: "desc" } });
}

export async function GET(request: Request) {
  try {
    const brand = await getActiveBrand(request);

    // Find or create engine for this brand
    let engine = brand
      ? await prisma.continuousEngine.findFirst({ where: { brandProfileId: brand.id } })
      : await prisma.continuousEngine.findFirst();

    if (!engine && brand) {
      engine = await prisma.continuousEngine.create({
        data: {
          brandProfileId: brand.id,
          enabled: false,
          postsPerDay: 7,
          reelsPerDay: 5,
          requireVoiceover: false,
          minQualityScore: 20,
        },
      });
    }

    let brandInfo = null;
    if (brand) {
      let parsedPillars: string[] = [];
      try { parsedPillars = JSON.parse(brand.contentPillars); } catch { parsedPillars = []; }
      let parsedTimes: unknown[] = [];
      try { parsedTimes = JSON.parse(brand.bestTimesJson); } catch { parsedTimes = []; }
      brandInfo = {
        id: brand.id,
        handle: brand.instagramHandle,
        name: brand.name,
        voice: brand.brandVoice,
        niche: brand.niche,
        audience: brand.targetAudience,
        pillars: parsedPillars,
        postingGoal: brand.postingGoal,
        bestTimes: parsedTimes,
      };
    }

    // Jobs for this brand only
    const brandFilter = brand ? { brandProfileId: brand.id } : {};
    const recentJobs = await prisma.contentJob.findMany({
      where: brandFilter,
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [queued, processing, completed, failed, postedToInstagram, voiceFailed, postedToday] =
      await Promise.all([
        prisma.contentJob.count({ where: { ...brandFilter, status: "QUEUED" } }),
        prisma.contentJob.count({ where: { ...brandFilter, status: "PROCESSING" } }),
        prisma.contentJob.count({ where: { ...brandFilter, status: "COMPLETED" } }),
        prisma.contentJob.count({ where: { ...brandFilter, status: { in: ["FAILED", "QUALITY_FAILED"] } } }),
        prisma.contentJob.count({ where: { ...brandFilter, instagramPostId: { not: null } } }),
        prisma.contentJob.count({ where: { ...brandFilter, voiceStatus: "FAILED" } }),
        prisma.contentJob.count({ where: { ...brandFilter, instagramPostId: { not: null }, completedAt: { gte: today } } }),
      ]);

    return Response.json({
      engine: engine || null,
      brand: brandInfo,
      jobs: recentJobs,
      recentJobs,
      stats: {
        queued, processing, completed, failed, postedToInstagram,
        postedToday, dailyTarget: engine?.postsPerDay || 10, voiceFailed,
      },
    });
  } catch (error) {
    console.error("[engine GET] Error:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to load engine" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const brand = await getActiveBrand(request);
    const brandId = brand?.id || body.brandProfileId || null;

    // Find engine for this brand
    let engine = brandId
      ? await prisma.continuousEngine.findFirst({ where: { brandProfileId: brandId } })
      : await prisma.continuousEngine.findFirst();

    const data: Record<string, unknown> = {};
    if (body.enabled !== undefined) data.enabled = Boolean(body.enabled);
    if (body.theme !== undefined) data.theme = body.theme;
    if (body.postsPerDay !== undefined) data.postsPerDay = Number(body.postsPerDay);
    if (body.reelsPerDay !== undefined) data.reelsPerDay = Number(body.reelsPerDay);
    if (body.mediaType !== undefined) data.mediaType = String(body.mediaType);
    if (body.reelStyle !== undefined) data.reelStyle = String(body.reelStyle);
    if (body.requireVoiceover !== undefined) data.requireVoiceover = Boolean(body.requireVoiceover);
    if (body.minQualityScore !== undefined) data.minQualityScore = Number(body.minQualityScore);

    if (engine) {
      engine = await prisma.continuousEngine.update({
        where: { id: engine.id },
        data: { ...data, brandProfileId: brandId },
      });
    } else {
      engine = await prisma.continuousEngine.create({
        data: {
          enabled: false,
          postsPerDay: 7,
          reelsPerDay: 5,
          mediaType: "video",
          requireVoiceover: false,
          minQualityScore: 20,
          brandProfileId: brandId,
          ...data,
        },
      });
    }

    return Response.json({ success: true, engine });
  } catch (error) {
    console.error("[engine POST] Error:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to update engine" },
      { status: 500 }
    );
  }
}

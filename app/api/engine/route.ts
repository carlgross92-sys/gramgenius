import prisma from "@/lib/prisma";

export async function GET() {
  try {
    // ── Load engine config ──────────────────────────────────────────────
    const engine = await prisma.continuousEngine.findFirst();

    // ── Load brand profile ────────────────────────────────────────────
    const brand = await prisma.brandProfile.findFirst();
    let brandInfo = null;
    if (brand) {
      let parsedPillars: string[] = [];
      try { parsedPillars = JSON.parse(brand.contentPillars); } catch { parsedPillars = []; }
      let parsedTimes: unknown[] = [];
      try { parsedTimes = JSON.parse(brand.bestTimesJson); } catch { parsedTimes = []; }
      brandInfo = {
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

    // ── Load recent jobs ────────────────────────────────────────────────
    const recentJobs = await prisma.contentJob.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    // ── Gather stats ────────────────────────────────────────────────────
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [queued, processing, completed, failed, postedToInstagram, voiceFailed, postedToday] =
      await Promise.all([
        prisma.contentJob.count({ where: { status: "QUEUED" } }),
        prisma.contentJob.count({ where: { status: "PROCESSING" } }),
        prisma.contentJob.count({ where: { status: "COMPLETED" } }),
        prisma.contentJob.count({
          where: { status: { in: ["FAILED", "QUALITY_FAILED"] } },
        }),
        prisma.contentJob.count({
          where: { instagramPostId: { not: null } },
        }),
        prisma.contentJob.count({
          where: { voiceStatus: "FAILED" },
        }),
        prisma.contentJob.count({
          where: { instagramPostId: { not: null }, completedAt: { gte: today } },
        }),
      ]);

    return Response.json({
      engine: engine || null,
      brand: brandInfo,
      jobs: recentJobs,
      recentJobs,
      stats: {
        queued,
        postedToday,
        dailyTarget: engine?.postsPerDay || 30,
        voiceFailed,
        processing,
        completed,
        failed,
        postedToInstagram,
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

    // ── Check if engine config exists ───────────────────────────────────
    const existing = await prisma.continuousEngine.findFirst();

    // Fields that can be updated
    const data: Record<string, unknown> = {};
    if (body.enabled !== undefined) data.enabled = Boolean(body.enabled);
    if (body.theme !== undefined) data.theme = body.theme;
    if (body.postsPerDay !== undefined) data.postsPerDay = Number(body.postsPerDay);
    if (body.reelsPerDay !== undefined) data.reelsPerDay = Number(body.reelsPerDay);
    if (body.mediaType !== undefined) data.mediaType = String(body.mediaType);
    if (body.requireVoiceover !== undefined) data.requireVoiceover = Boolean(body.requireVoiceover);
    if (body.minQualityScore !== undefined) data.minQualityScore = Number(body.minQualityScore);

    let engine;
    if (existing) {
      engine = await prisma.continuousEngine.update({
        where: { id: existing.id },
        data,
      });
    } else {
      engine = await prisma.continuousEngine.create({
        data: {
          enabled: false,
          postsPerDay: 7,
          reelsPerDay: 5,
          mediaType: "video",
          requireVoiceover: true,
          minQualityScore: 70,
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

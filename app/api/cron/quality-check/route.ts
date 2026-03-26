import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const now = new Date();
    const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000);

    // ── Retry QUALITY_FAILED jobs (retryCount < 3) ──────────────────────
    const qualityFailed = await prisma.contentJob.findMany({
      where: {
        status: "QUALITY_FAILED",
        retryCount: { lt: 3 },
      },
    });

    let retriedCount = 0;
    for (const job of qualityFailed) {
      await prisma.contentJob.update({
        where: { id: job.id },
        data: {
          status: "QUEUED",
          retryCount: { increment: 1 },
          startedAt: null,
          completedAt: null,
          qualityScore: null,
          qualityNotes: null,
        },
      });
      retriedCount++;
    }

    // ── Reset stuck PROCESSING jobs (started > 10 min ago) ──────────────
    const stuckJobs = await prisma.contentJob.findMany({
      where: {
        status: "PROCESSING",
        startedAt: { lt: tenMinutesAgo },
      },
    });

    let unstuckCount = 0;
    for (const job of stuckJobs) {
      await prisma.contentJob.update({
        where: { id: job.id },
        data: {
          status: "QUEUED",
          startedAt: null,
        },
      });
      unstuckCount++;
    }

    // ── Gather stats ────────────────────────────────────────────────────
    const today = now.toISOString().slice(0, 10);
    const todayStart = new Date(today + "T00:00:00.000Z");
    const todayEnd = new Date(today + "T23:59:59.999Z");

    const [queued, processing, completed, failed, postedToday] =
      await Promise.all([
        prisma.contentJob.count({ where: { status: "QUEUED" } }),
        prisma.contentJob.count({ where: { status: "PROCESSING" } }),
        prisma.contentJob.count({ where: { status: "COMPLETED" } }),
        prisma.contentJob.count({
          where: { status: { in: ["FAILED", "QUALITY_FAILED"] } },
        }),
        prisma.contentJob.count({
          where: {
            instagramPostId: { not: null },
            completedAt: { gte: todayStart, lte: todayEnd },
          },
        }),
      ]);

    return Response.json({
      success: true,
      actions: {
        retriedQualityFailed: retriedCount,
        unstuckProcessing: unstuckCount,
      },
      stats: {
        queued,
        processing,
        completed,
        failed,
        postedToday,
      },
    });
  } catch (error) {
    console.error("[quality-check] Error:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Quality check failed" },
      { status: 500 }
    );
  }
}

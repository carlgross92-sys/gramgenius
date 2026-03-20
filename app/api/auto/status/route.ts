import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const config = await prisma.engineConfig.findFirst();

    if (!config) {
      return Response.json({
        autopilotEnabled: false,
        lastEngineRun: null,
        nextEngineRun: null,
        postsScheduledToday: 0,
        reelsScheduledThisWeek: 0,
        publishedToday: 0,
        failedThisWeek: 0,
        nextPostTime: null,
        nextPostTopic: null,
        pausedUntil: null,
        weeklyStats: { published: 0, failed: 0, scheduled: 0 },
      });
    }

    const todayStr = new Date().toISOString().split("T")[0];
    const todayStart = new Date(`${todayStr}T00:00:00.000Z`);
    const todayEnd = new Date(`${todayStr}T23:59:59.999Z`);
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [
      postsScheduledToday,
      reelsScheduledThisWeek,
      publishedToday,
      failedThisWeek,
      nextPost,
      weeklyPublished,
      weeklyFailed,
      weeklyScheduled,
    ] = await Promise.all([
      // Posts scheduled for today
      prisma.post.count({
        where: {
          status: "SCHEDULED",
          scheduledAt: { gte: todayStart, lte: todayEnd },
        },
      }),
      // Reels scheduled this week
      prisma.post.count({
        where: {
          postType: "REEL",
          status: "SCHEDULED",
          scheduledAt: { gte: sevenDaysAgo },
        },
      }),
      // Published today
      prisma.post.count({
        where: {
          status: "PUBLISHED",
          publishedAt: { gte: todayStart, lte: todayEnd },
        },
      }),
      // Failed this week
      prisma.post.count({
        where: {
          status: "FAILED",
          updatedAt: { gte: sevenDaysAgo },
        },
      }),
      // Next scheduled post
      prisma.post.findFirst({
        where: { status: "SCHEDULED" },
        orderBy: { scheduledAt: "asc" },
        select: { scheduledAt: true, topic: true },
      }),
      // Weekly stats: published
      prisma.post.count({
        where: {
          status: "PUBLISHED",
          publishedAt: { gte: sevenDaysAgo },
        },
      }),
      // Weekly stats: failed
      prisma.post.count({
        where: {
          status: "FAILED",
          updatedAt: { gte: sevenDaysAgo },
        },
      }),
      // Weekly stats: scheduled
      prisma.post.count({
        where: {
          status: "SCHEDULED",
          scheduledAt: { gte: sevenDaysAgo },
        },
      }),
    ]);

    return Response.json({
      autopilotEnabled: config.enabled,
      lastEngineRun: config.lastRunAt,
      nextEngineRun: config.nextRunAt,
      postsScheduledToday,
      reelsScheduledThisWeek,
      publishedToday,
      failedThisWeek,
      nextPostTime: nextPost?.scheduledAt ?? null,
      nextPostTopic: nextPost?.topic ?? null,
      pausedUntil: config.pausedUntil,
      weeklyStats: {
        published: weeklyPublished,
        failed: weeklyFailed,
        scheduled: weeklyScheduled,
      },
    });
  } catch (error) {
    console.error("[AutoStatus] Failed to fetch engine status:", error);
    return Response.json(
      { error: "Failed to fetch engine status" },
      { status: 500 }
    );
  }
}

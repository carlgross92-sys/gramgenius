import prisma from "@/lib/prisma";

export async function POST() {
  try {
    const result = await prisma.contentJob.updateMany({
      where: {
        status: { in: ["FAILED", "QUALITY_FAILED"] },
      },
      data: {
        status: "QUEUED",
        retryCount: 0,
        qualityNotes: "Retried by admin",
        startedAt: null,
        completedAt: null,
      },
    });

    return Response.json({
      success: true,
      retriedCount: result.count,
      message: `Reset ${result.count} failed jobs back to QUEUED`,
    });
  } catch (error) {
    console.error("[retry-failed] Error:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Retry failed" },
      { status: 500 }
    );
  }
}

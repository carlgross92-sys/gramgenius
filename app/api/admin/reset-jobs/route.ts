import prisma from "@/lib/prisma";

export async function POST() {
  // Reset all FAILED jobs with video URLs back to COMPLETED for re-publishing
  const result = await prisma.contentJob.updateMany({
    where: {
      status: "FAILED",
      videoUrl: { not: null },
      instagramPostId: null,
    },
    data: {
      retryCount: 0,
      status: "COMPLETED",
      failReason: null,
    },
  });
  return Response.json({ reset: result.count });
}

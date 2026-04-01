import prisma from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const { brandId } = await request.json();
    if (!brandId) return Response.json({ error: "brandId required" }, { status: 400 });

    // Delete all queued and failed jobs for this brand from today
    const deleted = await prisma.contentJob.deleteMany({
      where: {
        brandProfileId: brandId,
        status: { in: ["QUEUED", "FAILED", "QUALITY_FAILED"] },
      },
    });

    // Reset the engine's daily counter so new jobs can be generated
    await prisma.continuousEngine.updateMany({
      where: { brandProfileId: brandId },
      data: { todayPosted: 0, todayDate: "" },
    });

    return Response.json({
      success: true,
      deletedJobs: deleted.count,
      message: `Purged ${deleted.count} jobs for brand ${brandId} and reset daily counter`,
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Purge failed" },
      { status: 500 }
    );
  }
}

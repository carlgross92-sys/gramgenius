import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    let config = await prisma.engineConfig.findFirst();

    if (!config) {
      config = await prisma.engineConfig.create({
        data: {
          enabled: true,
          feedPostsPerDay: 7,
          reelsPerDay: 3,
          maxPostsPerDay: 10,
          autoResearch: true,
          autoGenerate: true,
          autoPublish: true,
        },
      });
    }

    return Response.json(config);
  } catch (error) {
    console.error("[AutoConfig] Failed to fetch engine config:", error);
    return Response.json(
      { error: "Failed to fetch engine config" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const {
      enabled,
      feedPostsPerDay,
      reelsPerDay,
      maxPostsPerDay,
      autoResearch,
      autoGenerate,
      autoPublish,
    } = body;

    // Validate numeric ranges
    if (feedPostsPerDay !== undefined && (feedPostsPerDay < 1 || feedPostsPerDay > 30)) {
      return Response.json(
        { error: "feedPostsPerDay must be between 1 and 30" },
        { status: 400 }
      );
    }
    if (reelsPerDay !== undefined && (reelsPerDay < 0 || reelsPerDay > 30)) {
      return Response.json(
        { error: "reelsPerDay must be between 0 and 30" },
        { status: 400 }
      );
    }
    if (maxPostsPerDay !== undefined && (maxPostsPerDay < 1 || maxPostsPerDay > 30)) {
      return Response.json(
        { error: "maxPostsPerDay must be between 1 and 10" },
        { status: 400 }
      );
    }

    // Build update data from provided fields only
    const updateData: Record<string, unknown> = {};
    if (enabled !== undefined) updateData.enabled = enabled;
    if (feedPostsPerDay !== undefined) updateData.feedPostsPerDay = feedPostsPerDay;
    if (reelsPerDay !== undefined) updateData.reelsPerDay = reelsPerDay;
    if (maxPostsPerDay !== undefined) updateData.maxPostsPerDay = maxPostsPerDay;
    if (autoResearch !== undefined) updateData.autoResearch = autoResearch;
    if (autoGenerate !== undefined) updateData.autoGenerate = autoGenerate;
    if (autoPublish !== undefined) updateData.autoPublish = autoPublish;

    const existing = await prisma.engineConfig.findFirst();

    let config;
    if (existing) {
      config = await prisma.engineConfig.update({
        where: { id: existing.id },
        data: updateData,
      });
    } else {
      config = await prisma.engineConfig.create({
        data: {
          enabled: enabled ?? true,
          feedPostsPerDay: feedPostsPerDay ?? 7,
          reelsPerDay: reelsPerDay ?? 3,
          maxPostsPerDay: maxPostsPerDay ?? 10,
          autoResearch: autoResearch ?? true,
          autoGenerate: autoGenerate ?? true,
          autoPublish: autoPublish ?? true,
        },
      });
    }

    return Response.json(config);
  } catch (error) {
    console.error("[AutoConfig] Failed to update engine config:", error);
    return Response.json(
      { error: "Failed to update engine config" },
      { status: 500 }
    );
  }
}

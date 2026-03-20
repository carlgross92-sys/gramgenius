import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const type = searchParams.get("type");
    const status = searchParams.get("status");
    const postType = searchParams.get("postType");

    const where: Record<string, string> = {};
    if (type) where.type = type;
    if (status) where.status = status;
    if (postType) where.postType = postType;

    const [items, total] = await Promise.all([
      prisma.mediaLibrary.findMany({
        where,
        orderBy: { createdAt: "desc" },
      }),
      prisma.mediaLibrary.count({ where }),
    ]);

    return Response.json({ items, total });
  } catch (error) {
    console.error("Failed to load media library:", error);
    return Response.json(
      { error: "Failed to load media library" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, mediaId } = body;

    if (action === "post" && mediaId) {
      const media = await prisma.mediaLibrary.findUnique({
        where: { id: mediaId },
      });

      if (!media) {
        return Response.json({ error: "Media not found" }, { status: 404 });
      }

      // Update status to POSTED (actual Instagram posting handled by media-agent)
      const updated = await prisma.mediaLibrary.update({
        where: { id: mediaId },
        data: {
          status: "POSTED",
        },
      });

      return Response.json({ item: updated });
    }

    return Response.json(
      { error: "Invalid action. Use { action: 'post', mediaId: '...' }" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Failed to process media action:", error);
    return Response.json(
      { error: "Failed to process media action" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    let mediaId = searchParams.get("mediaId");

    if (!mediaId) {
      try {
        const body = await request.json();
        mediaId = body.mediaId ?? null;
      } catch {
        // No body provided
      }
    }

    if (!mediaId) {
      return Response.json(
        { error: "mediaId is required" },
        { status: 400 }
      );
    }

    const media = await prisma.mediaLibrary.findUnique({
      where: { id: mediaId },
    });

    if (!media) {
      return Response.json({ error: "Media not found" }, { status: 404 });
    }

    await prisma.mediaLibrary.delete({
      where: { id: mediaId },
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error("Failed to delete media:", error);
    return Response.json(
      { error: "Failed to delete media" },
      { status: 500 }
    );
  }
}

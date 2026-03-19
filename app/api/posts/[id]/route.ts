import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const post = await prisma.post.findUnique({
      where: { id },
      include: {
        carouselSlides: {
          orderBy: { slideNumber: "asc" },
        },
        analytics: true,
      },
    });

    if (!post) {
      return Response.json({ error: "Post not found" }, { status: 404 });
    }

    return Response.json({ post });
  } catch (error) {
    console.error("Failed to load post:", error);
    return Response.json(
      { error: "Failed to load post" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const existing = await prisma.post.findUnique({ where: { id } });
    if (!existing) {
      return Response.json({ error: "Post not found" }, { status: 404 });
    }

    const updatableFields = [
      "topic",
      "caption",
      "hashtags",
      "imageUrl",
      "imagePrompt",
      "videoUrl",
      "videoPrompt",
      "voiceoverUrl",
      "reelScript",
      "hookTemplate",
      "status",
      "postType",
      "platform",
      "scheduledAt",
      "publishedAt",
      "instagramPostId",
      "mediaContainerId",
      "failureReason",
      "engagementNotes",
    ];

    const data: Record<string, unknown> = {};
    for (const field of updatableFields) {
      if (body[field] !== undefined) {
        if (field === "scheduledAt" || field === "publishedAt") {
          data[field] = body[field] ? new Date(body[field]) : null;
        } else {
          data[field] = body[field];
        }
      }
    }

    const post = await prisma.post.update({
      where: { id },
      data,
      include: {
        carouselSlides: {
          orderBy: { slideNumber: "asc" },
        },
        analytics: true,
      },
    });

    return Response.json({ post });
  } catch (error) {
    console.error("Failed to update post:", error);
    return Response.json(
      { error: "Failed to update post" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existing = await prisma.post.findUnique({ where: { id } });
    if (!existing) {
      return Response.json({ error: "Post not found" }, { status: 404 });
    }

    await prisma.carouselSlide.deleteMany({ where: { postId: id } });
    await prisma.postAnalytics.deleteMany({ where: { postId: id } });
    await prisma.post.delete({ where: { id } });

    return Response.json({ success: true });
  } catch (error) {
    console.error("Failed to delete post:", error);
    return Response.json(
      { error: "Failed to delete post" },
      { status: 500 }
    );
  }
}

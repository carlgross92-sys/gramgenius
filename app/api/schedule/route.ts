import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const scheduledPosts = await prisma.post.findMany({
      where: { status: "SCHEDULED" },
      orderBy: { scheduledAt: "asc" },
      include: {
        carouselSlides: {
          orderBy: { slideNumber: "asc" },
        },
      },
    });

    return Response.json({ posts: scheduledPosts });
  } catch (error) {
    console.error("Failed to list scheduled posts:", error);
    return Response.json(
      { error: "Failed to list scheduled posts" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { postId, scheduledAt } = body;

    if (!postId || !scheduledAt) {
      return Response.json(
        { error: "Missing required fields: postId, scheduledAt" },
        { status: 400 }
      );
    }

    const scheduledDate = new Date(scheduledAt);
    if (isNaN(scheduledDate.getTime())) {
      return Response.json(
        { error: "Invalid scheduledAt date" },
        { status: 400 }
      );
    }

    if (scheduledDate <= new Date()) {
      return Response.json(
        { error: "scheduledAt must be in the future" },
        { status: 400 }
      );
    }

    const post = await prisma.post.findUnique({
      where: { id: postId },
    });

    if (!post) {
      return Response.json({ error: "Post not found" }, { status: 404 });
    }

    const updatedPost = await prisma.post.update({
      where: { id: postId },
      data: {
        scheduledAt: scheduledDate,
        status: "SCHEDULED",
      },
    });

    return Response.json({ post: updatedPost });
  } catch (error) {
    console.error("Failed to schedule post:", error);
    return Response.json(
      { error: "Failed to schedule post" },
      { status: 500 }
    );
  }
}

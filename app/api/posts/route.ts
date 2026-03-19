import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status");
    const postType = searchParams.get("postType");
    const brandProfileId = searchParams.get("brandProfileId");

    const where: Record<string, unknown> = {};

    if (status) {
      where.status = status;
    }
    if (postType) {
      where.postType = postType;
    }
    if (brandProfileId) {
      where.brandProfileId = brandProfileId;
    }

    const posts = await prisma.post.findMany({
      where,
      include: {
        carouselSlides: {
          orderBy: { slideNumber: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return Response.json({ posts });
  } catch (error) {
    console.error("Failed to list posts:", error);
    return Response.json(
      { error: "Failed to list posts" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      topic,
      caption,
      hashtags,
      imageUrl,
      imagePrompt,
      videoUrl,
      videoPrompt,
      voiceoverUrl,
      reelScript,
      hookTemplate,
      status,
      postType,
      platform,
      scheduledAt,
      brandProfileId,
    } = body;

    if (!topic || !caption || !brandProfileId) {
      return Response.json(
        { error: "Missing required fields: topic, caption, brandProfileId" },
        { status: 400 }
      );
    }

    const post = await prisma.post.create({
      data: {
        topic,
        caption,
        hashtags: hashtags ?? "",
        imageUrl,
        imagePrompt,
        videoUrl,
        videoPrompt,
        voiceoverUrl,
        reelScript,
        hookTemplate,
        status: status ?? "DRAFT",
        postType: postType ?? "FEED",
        platform: platform ?? "INSTAGRAM",
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        brandProfileId,
      },
      include: {
        carouselSlides: true,
      },
    });

    return Response.json({ post }, { status: 201 });
  } catch (error) {
    console.error("Failed to create post:", error);
    return Response.json(
      { error: "Failed to create post" },
      { status: 500 }
    );
  }
}

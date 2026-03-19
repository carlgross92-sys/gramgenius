import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  createImageContainer,
  createReelContainer,
  pollContainerStatus,
  publishContainer,
  postToFacebookPage,
} from "@/lib/meta";

const MAX_CAPTION_LENGTH = 2200;

function formatCaptionWithHashtags(
  caption: string,
  hashtags: string
): string {
  const hashtagString = hashtags
    .split(",")
    .map((tag) => `#${tag.trim()}`)
    .filter((tag) => tag !== "#")
    .join(" ");

  const fullCaption = hashtags
    ? `${caption}\n\n${hashtagString}`
    : caption;

  if (fullCaption.length > MAX_CAPTION_LENGTH) {
    return fullCaption.substring(0, MAX_CAPTION_LENGTH);
  }

  return fullCaption;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { postId } = body;

    if (!postId) {
      return Response.json(
        { error: "Missing required field: postId" },
        { status: 400 }
      );
    }

    const post = await prisma.post.findUnique({
      where: { id: postId },
    });

    if (!post) {
      return Response.json({ error: "Post not found" }, { status: 404 });
    }

    if (post.status === "PUBLISHED") {
      return Response.json(
        { error: "Post is already published" },
        { status: 400 }
      );
    }

    const formattedCaption = formatCaptionWithHashtags(
      post.caption,
      post.hashtags
    );

    let instagramPostId: string | null = null;

    try {
      if (post.postType === "REEL") {
        if (!post.videoUrl) {
          return Response.json(
            { error: "Reel post requires a videoUrl" },
            { status: 400 }
          );
        }

        const containerId = await createReelContainer(
          post.videoUrl,
          formattedCaption
        );

        await pollContainerStatus(containerId);

        instagramPostId = await publishContainer(containerId);
      } else {
        if (!post.imageUrl) {
          return Response.json(
            { error: "Feed post requires an imageUrl" },
            { status: 400 }
          );
        }

        const containerId = await createImageContainer(
          post.imageUrl,
          formattedCaption
        );

        instagramPostId = await publishContainer(containerId);
      }

      if (post.platform === "BOTH" && post.imageUrl) {
        try {
          await postToFacebookPage(formattedCaption, post.imageUrl);
        } catch (fbError) {
          console.error("Facebook cross-post failed:", fbError);
        }
      }

      await prisma.post.update({
        where: { id: postId },
        data: {
          status: "PUBLISHED",
          publishedAt: new Date(),
          instagramPostId,
        },
      });

      return Response.json({ success: true, instagramPostId });
    } catch (publishError) {
      const reason =
        publishError instanceof Error
          ? publishError.message
          : "Unknown publishing error";

      await prisma.post.update({
        where: { id: postId },
        data: {
          status: "FAILED",
          failureReason: reason,
        },
      });

      console.error("Publishing failed:", publishError);
      return Response.json(
        { error: "Publishing failed", reason },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Failed to publish post:", error);
    return Response.json(
      { error: "Failed to publish post" },
      { status: 500 }
    );
  }
}

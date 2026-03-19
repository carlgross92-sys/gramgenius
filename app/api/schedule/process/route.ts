import { headers } from "next/headers";
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

export async function POST() {
  // Verify cron secret in production
  if (process.env.NODE_ENV === "production") {
    const headersList = await headers();
    const authHeader = headersList.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    const now = new Date();

    const duePosts = await prisma.post.findMany({
      where: {
        status: "SCHEDULED",
        scheduledAt: {
          lte: now,
        },
      },
    });

    if (duePosts.length === 0) {
      return Response.json({
        processed: 0,
        succeeded: 0,
        failed: 0,
        errors: [],
      });
    }

    let succeeded = 0;
    let failed = 0;
    const errors: { postId: string; error: string }[] = [];

    for (const post of duePosts) {
      try {
        const formattedCaption = formatCaptionWithHashtags(
          post.caption,
          post.hashtags
        );

        let instagramPostId: string | null = null;

        if (post.postType === "REEL") {
          if (!post.videoUrl) {
            throw new Error("Reel post requires a videoUrl");
          }
          const containerId = await createReelContainer(
            post.videoUrl,
            formattedCaption
          );
          await pollContainerStatus(containerId);
          instagramPostId = await publishContainer(containerId);
        } else {
          if (!post.imageUrl) {
            throw new Error("Feed post requires an imageUrl");
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
            console.error(
              `Facebook cross-post failed for post ${post.id}:`,
              fbError
            );
          }
        }

        await prisma.post.update({
          where: { id: post.id },
          data: {
            status: "PUBLISHED",
            publishedAt: new Date(),
            instagramPostId,
          },
        });

        succeeded++;
      } catch (postError) {
        const reason =
          postError instanceof Error
            ? postError.message
            : "Unknown publishing error";

        await prisma.post.update({
          where: { id: post.id },
          data: {
            status: "FAILED",
            failureReason: reason,
          },
        });

        errors.push({ postId: post.id, error: reason });
        failed++;

        console.error(`Failed to publish post ${post.id}:`, postError);
      }
    }

    return Response.json({
      processed: duePosts.length,
      succeeded,
      failed,
      errors,
    });
  } catch (error) {
    console.error("Failed to process scheduled posts:", error);
    return Response.json(
      { error: "Failed to process scheduled posts" },
      { status: 500 }
    );
  }
}

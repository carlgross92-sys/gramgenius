import { prisma } from "@/lib/prisma";
import { getMediaComments } from "@/lib/meta";
import { generateWithClaudeJSON } from "@/lib/anthropic";

interface CommentData {
  id: string;
  username: string;
  text: string;
}

interface CommentWithReply {
  id: string;
  username: string;
  text: string;
  postId: string;
  suggestedReply: string;
  type: string;
}

interface ReplyGenerationResponse {
  replies: {
    commentId: string;
    suggestedReply: string;
    type: string;
  }[];
}

export async function GET() {
  try {
    const publishedPosts = await prisma.post.findMany({
      where: {
        status: "PUBLISHED",
        instagramPostId: { not: null },
      },
      orderBy: { publishedAt: "desc" },
      take: 10,
    });

    if (publishedPosts.length === 0) {
      return Response.json({ comments: [] });
    }

    const brand = await prisma.brandProfile.findFirst();

    const allComments: CommentWithReply[] = [];

    for (const post of publishedPosts) {
      if (!post.instagramPostId) continue;

      try {
        const comments: CommentData[] = await getMediaComments(
          post.instagramPostId
        );

        if (!comments || comments.length === 0) continue;

        const commentsForAI = comments.map((c: CommentData) => ({
          id: c.id,
          username: c.username,
          text: c.text,
        }));

        const systemPrompt = `You are GramGenius, an engagement specialist for Instagram.
${brand ? `\nBRAND CONTEXT:\n- Brand: ${brand.name} (@${brand.instagramHandle})\n- Brand Voice: ${brand.brandVoice}\n- Niche: ${brand.niche}` : ""}

Return valid JSON:
{
  "replies": [
    {
      "commentId": "the comment id",
      "suggestedReply": "A warm, on-brand reply",
      "type": "gratitude|question|engagement|support|humor"
    }
  ]
}

Rules:
- Draft a reply for EACH comment
- Match the brand voice exactly
- Be authentic and personal (use their name/username when natural)
- For questions: provide helpful answers
- For compliments: show genuine gratitude
- For negative comments: be professional, empathetic, offer help
- Keep replies concise (1-3 sentences)
- Use emojis sparingly and appropriately for the brand
- Never be defensive or argumentative`;

        const userPrompt = `Draft replies for these comments on our post about "${post.topic}":

${JSON.stringify(commentsForAI, null, 2)}`;

        const result = await generateWithClaudeJSON<ReplyGenerationResponse>(
          systemPrompt,
          userPrompt,
          2048
        );

        for (const comment of comments) {
          const replyData = result.replies.find(
            (r: { commentId: string }) => r.commentId === comment.id
          );
          allComments.push({
            id: comment.id,
            username: comment.username,
            text: comment.text,
            postId: post.id,
            suggestedReply: replyData?.suggestedReply ?? "",
            type: replyData?.type ?? "engagement",
          });
        }
      } catch (commentError) {
        console.error(
          `Failed to fetch comments for post ${post.id}:`,
          commentError
        );
      }
    }

    return Response.json({ comments: allComments });
  } catch (error) {
    console.error("Failed to fetch and analyze comments:", error);
    return Response.json(
      { error: "Failed to fetch and analyze comments" },
      { status: 500 }
    );
  }
}

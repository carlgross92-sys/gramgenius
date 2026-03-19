import { NextRequest } from "next/server";
import { replyToComment } from "@/lib/meta";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { commentId, replyText } = body;

    if (!commentId || !replyText) {
      return Response.json(
        { error: "Missing required fields: commentId, replyText" },
        { status: 400 }
      );
    }

    const replyId = await replyToComment(commentId, replyText);

    return Response.json({ success: true, replyId });
  } catch (error) {
    console.error("Failed to reply to comment:", error);
    return Response.json(
      { error: "Failed to reply to comment" },
      { status: 500 }
    );
  }
}

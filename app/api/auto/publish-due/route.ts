import { headers } from "next/headers";
import { publishDuePosts } from "@/lib/autonomous-engine";

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
    const result = await publishDuePosts();

    console.log(
      `[AutoPublish] ${result.succeeded} published, ${result.failed} failed`
    );

    return Response.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown publish error";
    console.error("[AutoPublish] Publish due posts failed:", error);
    return Response.json(
      { error: `Publish due posts failed: ${message}` },
      { status: 500 }
    );
  }
}

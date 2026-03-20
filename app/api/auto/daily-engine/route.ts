import { headers } from "next/headers";
import { runDailyEngine, publishDuePosts } from "@/lib/autonomous-engine";

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
    const result = await runDailyEngine();

    console.log(
      `[AutoEngine] Daily run complete: ${result.totalScheduled} scheduled`
    );

    // Also publish any posts that are now due
    const publishResult = await publishDuePosts();

    console.log(
      `[AutoEngine] Publish pass: ${publishResult.succeeded} published, ${publishResult.failed} failed`
    );

    return Response.json({
      engine: result,
      publish: publishResult,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown engine error";
    console.error("[AutoEngine] Daily engine failed:", error);
    return Response.json(
      { error: `Daily engine failed: ${message}` },
      { status: 500 }
    );
  }
}

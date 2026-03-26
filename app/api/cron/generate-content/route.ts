import prisma from "@/lib/prisma";
import { generateWithClaudeJSON } from "@/lib/anthropic";

export const maxDuration = 300;

export async function GET(request: Request) {
  try {
    // ── Auth check ──────────────────────────────────────────────────────
    const authHeader = request.headers.get("authorization");
    if (process.env.NODE_ENV === "production") {
      if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    // ── Load engine config ──────────────────────────────────────────────
    const engine = await prisma.continuousEngine.findFirst();
    if (!engine || !engine.enabled) {
      return Response.json({ skipped: true, reason: "Engine not enabled" });
    }

    // ── Reset daily counter if new day ──────────────────────────────────
    const today = new Date().toISOString().slice(0, 10);
    if (engine.todayDate !== today) {
      await prisma.continuousEngine.update({
        where: { id: engine.id },
        data: { todayPosted: 0, todayDate: today },
      });
    }

    // ── Load brand profile ──────────────────────────────────────────────
    const brand = await prisma.brandProfile.findFirst();
    if (!brand) {
      return Response.json({ error: "No brand profile found" }, { status: 400 });
    }

    let pillars: string[] = [];
    try {
      pillars = JSON.parse(brand.contentPillars);
    } catch {
      pillars = [];
    }

    const themeContext = engine.theme || pillars.join(", ") || brand.niche;
    const count = Math.min(engine.postsPerDay, 10);

    // ── Generate topics via Claude ──────────────────────────────────────
    const topics = await generateWithClaudeJSON<string[]>(
      `You are a viral content strategist for @${brand.instagramHandle} in the ${brand.niche} niche. Generate unique, specific, funny animal topics that would go viral on Instagram. Return a JSON array of strings.`,
      `Generate exactly ${count} unique funny animal content topics.\nTheme: ${themeContext}\nContent pillars: ${pillars.join(", ")}\nEach topic must be specific, visual, hilarious, relatable, and different from each other. Focus on scenarios, reactions, and relatable moments.`,
      2048
    );

    const topicList = Array.isArray(topics) ? topics.slice(0, count) : [];
    if (topicList.length === 0) {
      return Response.json({ error: "Failed to generate topics" }, { status: 500 });
    }

    // ── Calculate schedule times (LA timezone, UTC-7) ───────────────────
    const scheduleHours = [7, 9, 11, 13, 15, 17, 19, 21];
    const now = new Date();
    const tzOffset = -7;

    const scheduleTimes: Date[] = [];
    for (let i = 0; i < topicList.length; i++) {
      const hour = scheduleHours[i % scheduleHours.length];
      const d = new Date(now);
      d.setUTCHours(hour - tzOffset, 0, 0, 0);
      if (d <= now) d.setDate(d.getDate() + 1);
      scheduleTimes.push(d);
    }
    scheduleTimes.sort((a, b) => a.getTime() - b.getTime());

    // ── Create ContentJob records ───────────────────────────────────────
    const jobs = [];
    for (let i = 0; i < topicList.length; i++) {
      // Alternate between REEL and FEED, weighted toward REELs
      const postType = i < engine.reelsPerDay ? "REEL" : "FEED";

      const job = await prisma.contentJob.create({
        data: {
          status: "QUEUED",
          topic: topicList[i],
          postType,
          mediaType: engine.mediaType,
          scheduledFor: scheduleTimes[i] || null,
        },
      });
      jobs.push(job);
    }

    // ── Update engine timestamps ────────────────────────────────────────
    const nextRun = new Date(now);
    nextRun.setDate(nextRun.getDate() + 1);
    nextRun.setUTCHours(6 - tzOffset, 0, 0, 0);

    await prisma.continuousEngine.update({
      where: { id: engine.id },
      data: {
        lastRunAt: now,
        nextRunAt: nextRun,
        todayDate: today,
      },
    });

    // ── Kick off processing immediately ─────────────────────────────────
    try {
      const processUrl = new URL("/api/cron/process-queue", request.url).toString();
      fetch(processUrl, {
        headers: { authorization: authHeader || "" },
      }).catch(() => {});
    } catch {
      // Non-critical — cron will pick it up
    }

    return Response.json({
      success: true,
      jobCount: jobs.length,
      topics: topicList,
      scheduleTimes: scheduleTimes.map((t) => t.toISOString()),
    });
  } catch (error) {
    console.error("[generate-content] Error:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Content generation failed" },
      { status: 500 }
    );
  }
}

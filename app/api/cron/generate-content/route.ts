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

    // ── Load engine config — support brand-specific or all enabled ──────
    const headerBrandId = request.headers.get("x-brand-id");
    const engines = headerBrandId
      ? await prisma.continuousEngine.findMany({ where: { brandProfileId: headerBrandId, enabled: true } })
      : await prisma.continuousEngine.findMany({ where: { enabled: true } });

    if (engines.length === 0) {
      return Response.json({ skipped: true, reason: "No enabled engines" });
    }

    // Process first enabled engine (multi-engine loop can be added later)
    const engine = engines[0];
    if (!engine) {
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

    // ── Auto-refresh Meta token if expiring soon ────────────────────────
    try {
      const appSettings = await prisma.appSettings.findFirst();
      if (appSettings?.metaTokenExpiresAt) {
        const daysLeft = Math.floor(
          (new Date(appSettings.metaTokenExpiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        );
        if (daysLeft <= 10 && daysLeft > 0) {
          console.log(`[Engine] Meta token expires in ${daysLeft} days — attempting refresh`);
          const refreshUrl = new URL("/api/settings/meta", request.url).toString();
          await fetch(refreshUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "refresh" }),
          }).catch(() => {});
        }
      }
    } catch { /* non-critical */ }

    // ── Load brand profile for THIS engine ──────────────────────────────
    const brand = engine.brandProfileId
      ? await prisma.brandProfile.findUnique({ where: { id: engine.brandProfileId } })
      : await prisma.brandProfile.findFirst({ orderBy: { updatedAt: "desc" } });
    if (!brand) {
      return Response.json({ error: "No brand profile found" }, { status: 400 });
    }

    let pillars: string[] = [];
    try {
      pillars = JSON.parse(brand.contentPillars);
    } catch {
      pillars = [];
    }

    // Calculate how many MORE jobs are needed to hit daily target
    const existingToday = await prisma.contentJob.count({
      where: {
        createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
        status: { in: ["QUEUED", "PROCESSING", "COMPLETED"] },
      },
    });
    const count = Math.min(
      Math.max(0, (engine.postsPerDay || 30) - existingToday),
      15 // generate up to 15 at a time to stay within API limits
    );
    if (count === 0) {
      return Response.json({ message: `Daily target already met (${existingToday} today)`, skipped: true });
    }
    console.log(`[Generate Content] Need ${count} more jobs (${existingToday} exist today, target ${engine.postsPerDay})`);

    // ── Generate topics using Brand Brain ────────────────────────────────
    const pillarList = pillars.length > 0
      ? pillars.map((p, i) => `${i + 1}. ${p}`).join("\n")
      : "1. Funny pet moments\n2. Cute reactions\n3. Wild encounters\n4. Baby animals\n5. Animals doing human things";

    const topics = await generateWithClaudeJSON<string[]>(
      `You are the content strategist for @${brand.instagramHandle} — "${brand.name}".

BRAND PROFILE:
- Niche: ${brand.niche}
- Brand Voice: ${brand.brandVoice}
- Target Audience: ${brand.targetAudience}
- Content Pillars:
${pillarList}

${engine.theme ? `THEME OVERRIDE: Focus on "${engine.theme}"` : "Use the content pillars above as your guide."}

RULES:
- Every topic MUST fit within one of the content pillars above
- Rotate through ALL pillars — never 2 topics from the same pillar back to back
- Each topic must describe a specific, visual, funny scene
- Topics must be ${brand.brandVoice.toLowerCase()} in tone
- Make them relatable for ${brand.targetAudience}
- Each must be unique and different from the others

Return ONLY a JSON array of ${count} strings.`,
      `Generate exactly ${count} unique content topics for @${brand.instagramHandle}. Rotate through these pillars: ${pillars.join(", ")}. Brand voice: ${brand.brandVoice}.`,
      2048
    );

    const topicList = Array.isArray(topics) ? topics.slice(0, count) : [];
    if (topicList.length === 0) {
      return Response.json({ error: "Failed to generate topics" }, { status: 500 });
    }

    // ── Calculate schedule times from Brand Brain best times ────────────
    let bestTimes: Array<{ day: string; hour: string }> = [];
    try { bestTimes = JSON.parse(brand.bestTimesJson || "[]"); } catch { bestTimes = []; }

    // Get today's day name and preferred hours
    const now = new Date();
    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const todayDay = dayNames[now.getDay()];
    const tzOffset = -7; // LA timezone

    // Build schedule from brand's best times, or fallback
    let scheduleHours: number[] = [];
    if (bestTimes.length > 0) {
      // Use today's configured time + spread others throughout day
      const todayTime = bestTimes.find(t => t.day === todayDay);
      if (todayTime) scheduleHours.push(parseInt(todayTime.hour));
      // Add other hours spread throughout the day
      const fallbackHours = [9, 12, 15, 17, 19, 20, 21];
      for (const h of fallbackHours) {
        if (!scheduleHours.includes(h)) scheduleHours.push(h);
        if (scheduleHours.length >= count) break;
      }
    } else {
      scheduleHours = [7, 9, 11, 13, 15, 17, 19, 21];
    }

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
          reelStyle: engine.reelStyle || "funny",
          brandProfileId: brand.id,
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

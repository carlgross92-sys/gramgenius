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

    // ── Load ALL enabled engines ──────────────────────────────────────
    const headerBrandId = request.headers.get("x-brand-id");
    const engines = headerBrandId
      ? await prisma.continuousEngine.findMany({ where: { brandProfileId: headerBrandId, enabled: true } })
      : await prisma.continuousEngine.findMany({ where: { enabled: true } });

    if (engines.length === 0) {
      return Response.json({ skipped: true, reason: "No enabled engines" });
    }

    // ── Process ALL engines, not just the first one ──────────────────
    const results: Array<{ brand: string; jobCount: number; topics: string[] }> = [];

    for (const engine of engines) {
      // Reset daily counter if new day
      const today = new Date().toISOString().slice(0, 10);
      if (engine.todayDate !== today) {
        await prisma.continuousEngine.update({
          where: { id: engine.id },
          data: { todayPosted: 0, todayDate: today },
        });
      }

      // Auto-refresh Meta token (only once, first engine)
      if (engines.indexOf(engine) === 0) {
        try {
          const appSettings = await prisma.appSettings.findFirst();
          if (appSettings?.metaTokenExpiresAt) {
            const daysLeft = Math.floor(
              (new Date(appSettings.metaTokenExpiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
            );
            if (daysLeft <= 10 && daysLeft > 0) {
              console.log(`[Engine] Meta token expires in ${daysLeft} days — attempting refresh`);
              const refreshUrl = new URL("/api/settings/meta", request.url).toString();
              fetch(refreshUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "refresh" }),
              }).catch(() => {});
            }
          }
        } catch { /* non-critical */ }
      }

      // ── Load brand profile for THIS engine ──────────────────────────
      const brand = engine.brandProfileId
        ? await prisma.brandProfile.findUnique({ where: { id: engine.brandProfileId } })
        : null;
      if (!brand) {
        console.log(`[Generate Content] Skipping engine ${engine.id} — no brand profile`);
        continue;
      }

      let pillars: string[] = [];
      try { pillars = JSON.parse(brand.contentPillars); } catch { pillars = []; }

      // ── Count existing jobs for THIS BRAND only ─────────────────────
      const existingToday = await prisma.contentJob.count({
        where: {
          brandProfileId: brand.id,
          createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
          status: { in: ["QUEUED", "PROCESSING", "COMPLETED"] },
        },
      });
      const count = Math.min(
        Math.max(0, (engine.postsPerDay || 30) - existingToday),
        15
      );
      if (count === 0) {
        results.push({ brand: brand.name, jobCount: 0, topics: [] });
        continue;
      }
      console.log(`[Generate Content] ${brand.name}: Need ${count} more jobs (${existingToday} exist today, target ${engine.postsPerDay})`);

      // ── Detect brand type ────────────────────────────────────────────
      const pillarsText = pillars.join(" ").toLowerCase();
      const audienceText = (brand.targetAudience || "").toLowerCase();
      const nicheText = (brand.niche || "").toLowerCase();
      const nameText = (brand.name || "").toLowerCase();

      const isConservative =
        pillarsText.includes("conserv") ||
        pillarsText.includes("trump") ||
        pillarsText.includes("maga") ||
        pillarsText.includes("patriot") ||
        pillarsText.includes("american pride") ||
        audienceText.includes("conserv") ||
        audienceText.includes("trump") ||
        audienceText.includes("maga") ||
        nameText.includes("karina") ||
        brand.instagramHandle === "karinagarcia5019";

      const isFunnyAnimals =
        pillarsText.includes("animal") ||
        pillarsText.includes("pet") ||
        pillarsText.includes("dog") ||
        pillarsText.includes("cat") ||
        pillarsText.includes("puppy") ||
        nicheText.includes("animal") ||
        nicheText.includes("pet") ||
        nicheText.includes("entertain") ||
        brand.instagramHandle === "chewy_sacramento";

      // ── Build brand-specific prompt ──────────────────────────────────
      let brandRules: string;
      let fallbackTopics: string[];

      if (isConservative) {
        brandRules = `STRICT BRAND RULES FOR ${brand.name.toUpperCase()}:
- This is a CONSERVATIVE LIFESTYLE brand for patriotic American women
- Every topic MUST feature beautiful, confident women OR American imagery
- Topics should celebrate: faith, family, freedom, American pride, traditional femininity, conservative values
- ABSOLUTELY ZERO: animals, pets, cats, dogs, wildlife, or any non-human subjects
- ABSOLUTELY ZERO: liberal politics, woke content, or anything that contradicts conservative values
- Think: beautiful patriotic women, confident feminine moments, American flag aesthetics, faith-based imagery
- Tone: empowering, proud, beautiful, aspirational
- Visual style: golden hour, American colors, elegant, confident`;
        fallbackTopics = [
          "Beautiful confident woman draped in American flag at golden hour",
          "Elegant woman in white dress walking through a sun-drenched wheat field",
          "Stunning patriotic woman with perfect hair holding a Bible at sunset",
          "Gorgeous woman in red white and blue outfit at a Fourth of July celebration",
          "Confident beautiful woman standing tall in front of American landmark",
        ];
      } else if (isFunnyAnimals) {
        brandRules = `STRICT BRAND RULES FOR ${brand.name.toUpperCase()}:
- This is a FUNNY ANIMAL content brand
- Every topic MUST feature animals as the main subject
- Topics should be: hilarious, cute, relatable, shareable moments with pets and animals
- ABSOLUTELY ZERO: humans as main subjects, politics, controversial topics
- ABSOLUTELY ZERO: conservative content, liberal content, any political imagery
- Think: dogs being derps, cats judging humans, baby animals being cute, animals in funny situations
- Tone: humorous, lighthearted, wholesome, family-friendly
- Visual style: close-ups of animal faces, action shots, reaction moments`;
        fallbackTopics = [
          "Golden retriever trying to catch a treat in slow motion and missing hilariously",
          "Cat sitting in a tiny box that is way too small looking extremely satisfied",
          "Puppy seeing snow for the first time and losing its mind with joy",
          "Dog wearing sunglasses sitting in the driver seat like a boss",
          "Two kittens wrestling over a single piece of string in dramatic fashion",
        ];
      } else {
        brandRules = `BRAND RULES FOR ${brand.name.toUpperCase()}:
- Follow the content pillars strictly
- Match the brand voice: ${brand.brandVoice}
- Target audience: ${brand.targetAudience}`;
        fallbackTopics = pillars.slice(0, 5).map((p) => `Creative visual content about: ${p}`);
      }

      const pillarList = pillars.length > 0
        ? pillars.map((p, i) => `${i + 1}. ${p}`).join("\n")
        : fallbackTopics.map((t, i) => `${i + 1}. ${t}`).join("\n");

      // ── Generate topics with brand-specific rules ────────────────────
      let topicList: string[];
      try {
        const topics = await generateWithClaudeJSON<string[]>(
          `You are the content strategist for @${brand.instagramHandle} — "${brand.name}".

BRAND PROFILE:
- Niche: ${brand.niche}
- Brand Voice: ${brand.brandVoice}
- Target Audience: ${brand.targetAudience}
- Content Pillars:
${pillarList}

${brandRules}

${engine.theme ? `THEME OVERRIDE: Focus on "${engine.theme}"` : "Use the content pillars above as your guide."}

RULES:
- Every topic MUST fit within the brand rules above — NO EXCEPTIONS
- Rotate through ALL pillars — never 2 topics from the same pillar back to back
- Each topic must describe a specific, visual scene that can be found as stock video or generated as an image
- Topics must be ${brand.brandVoice.toLowerCase()} in tone
- Make them relatable for ${brand.targetAudience}
- Each must be unique and different from the others

Return ONLY a JSON array of ${count} strings.`,
          `Generate exactly ${count} unique content topics for @${brand.instagramHandle}. ${brandRules.split("\n")[1]}`,
          2048
        );
        topicList = Array.isArray(topics) ? topics.slice(0, count) : [];
      } catch (err) {
        console.error(`[Generate Content] ${brand.name}: Topic generation failed:`, err);
        topicList = [];
      }

      // If AI failed, use fallback topics
      if (topicList.length === 0) {
        topicList = fallbackTopics.slice(0, count);
      }

      // ── Calculate schedule times ────────────────────────────────────
      let bestTimes: Array<{ day: string; hour: string }> = [];
      try { bestTimes = JSON.parse(brand.bestTimesJson || "[]"); } catch { bestTimes = []; }

      const now = new Date();
      const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      const todayDay = dayNames[now.getDay()];
      const tzOffset = -7;

      let scheduleHours: number[] = [];
      if (bestTimes.length > 0) {
        const todayTime = bestTimes.find((t) => t.day === todayDay);
        if (todayTime) scheduleHours.push(parseInt(todayTime.hour));
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

      // ── Create ContentJob records for THIS brand ────────────────────
      const jobs = [];
      for (let i = 0; i < topicList.length; i++) {
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

      // ── Update engine timestamps ──────────────────────────────────
      const nextRun = new Date(now);
      nextRun.setDate(nextRun.getDate() + 1);
      nextRun.setUTCHours(6 - tzOffset, 0, 0, 0);

      await prisma.continuousEngine.update({
        where: { id: engine.id },
        data: { lastRunAt: now, nextRunAt: nextRun, todayDate: today },
      });

      results.push({ brand: brand.name, jobCount: jobs.length, topics: topicList });
    }

    // ── Kick off processing ───────────────────────────────────────────
    try {
      const processUrl = new URL("/api/cron/process-queue", request.url).toString();
      fetch(processUrl, {
        headers: { authorization: authHeader || "" },
      }).catch(() => {});
    } catch { /* Non-critical */ }

    return Response.json({
      success: true,
      brands: results,
      totalJobs: results.reduce((sum, r) => sum + r.jobCount, 0),
    });
  } catch (error) {
    console.error("[generate-content] Error:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Content generation failed" },
      { status: 500 }
    );
  }
}

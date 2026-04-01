import prisma from "@/lib/prisma";

export const maxDuration = 300;

const META_BASE = "https://graph.facebook.com/v19.0";

export async function POST() {
  try {
    // Get Meta credentials
    const settings = await prisma.appSettings.findFirst();
    const token = process.env.META_ACCESS_TOKEN || settings?.metaAccessToken;
    const igId = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID || settings?.instagramBusinessId;

    if (!token || !igId) {
      return Response.json({ error: "No Meta token or IG ID configured" }, { status: 400 });
    }

    // Verify token works
    const testRes = await fetch(`${META_BASE}/me?access_token=${token}`);
    const testData = await testRes.json();
    if (testData.error) {
      return Response.json({ error: `Token invalid: ${testData.error.message}` }, { status: 401 });
    }

    // Find all completed jobs with video that haven't been posted
    const jobs = await prisma.contentJob.findMany({
      where: {
        status: "COMPLETED",
        instagramPostId: null,
        videoUrl: { not: null },
      },
      orderBy: { completedAt: "desc" },
      take: 10, // Post up to 10 at a time
    });

    if (jobs.length === 0) {
      return Response.json({ message: "No completed videos to post", posted: 0 });
    }

    const results: Array<{ topic: string; posted: boolean; url?: string; error?: string }> = [];

    for (const job of jobs) {
      try {
        const caption = `${job.caption || ""}\n\n${job.hashtags || ""}`.substring(0, 2200);

        // Create Reel container
        const createRes = await fetch(`${META_BASE}/${igId}/media`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            media_type: "REELS",
            video_url: job.videoUrl,
            caption,
            share_to_feed: true,
            access_token: token,
          }),
        });
        const createData = await createRes.json();
        if (createData.error) {
          results.push({ topic: job.topic, posted: false, error: createData.error.message });
          continue;
        }

        const containerId = createData.id;

        // Poll until FINISHED (up to 4 minutes)
        let published = false;
        for (let i = 0; i < 48; i++) {
          await new Promise((r) => setTimeout(r, 5000));
          const statusRes = await fetch(
            `${META_BASE}/${containerId}?fields=status_code&access_token=${token}`
          );
          const { status_code } = await statusRes.json();

          if (status_code === "FINISHED") {
            // Publish
            const pubRes = await fetch(`${META_BASE}/${igId}/media_publish`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ creation_id: containerId, access_token: token }),
            });
            const pubData = await pubRes.json();
            if (pubData.error) {
              results.push({ topic: job.topic, posted: false, error: pubData.error.message });
            } else {
              const igUrl = `https://www.instagram.com/p/${pubData.id}/`;
              await prisma.contentJob.update({
                where: { id: job.id },
                data: { instagramPostId: pubData.id, instagramUrl: igUrl },
              });
              results.push({ topic: job.topic, posted: true, url: igUrl });
            }
            published = true;
            break;
          }
          if (status_code === "ERROR") {
            results.push({ topic: job.topic, posted: false, error: "Container ERROR" });
            published = true;
            break;
          }
        }
        if (!published) {
          results.push({ topic: job.topic, posted: false, error: "Timed out" });
        }

        // Brief delay between posts
        await new Promise((r) => setTimeout(r, 2000));
      } catch (err) {
        results.push({
          topic: job.topic,
          posted: false,
          error: err instanceof Error ? err.message : "Unknown",
        });
      }
    }

    const posted = results.filter((r) => r.posted).length;
    return Response.json({ posted, total: jobs.length, results });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Force publish failed" },
      { status: 500 }
    );
  }
}

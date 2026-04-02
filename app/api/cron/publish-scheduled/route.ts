import prisma from "@/lib/prisma";

export const maxDuration = 300;

const META_BASE = "https://graph.facebook.com/v19.0";

export async function GET(request: Request) {
  try {
    // ── Find newest completed job ready to publish (must have media) ────
    // Engine enabled/disabled only gates content GENERATION, not publishing.
    // If a job is COMPLETED with media, it should always be published.
    const job = await prisma.contentJob.findFirst({
      where: {
        status: "COMPLETED",
        instagramPostId: null,
        OR: [{ videoUrl: { not: null } }, { imageUrl: { not: null } }],
        retryCount: { lt: 3 },
      },
      orderBy: { completedAt: "desc" },
    });

    if (!job) {
      return Response.json({ message: "No jobs ready to publish" });
    }

    // ── Load credentials: brand-specific first, then global fallback ────
    let accessToken: string | null = null;
    let igUserId: string | null = null;

    // Try brand-specific credentials
    if (job.brandProfileId) {
      const brand = await prisma.brandProfile.findUnique({
        where: { id: job.brandProfileId },
      });
      if (brand?.metaAccessToken && brand?.igBusinessId) {
        accessToken = brand.metaAccessToken;
        igUserId = brand.igBusinessId;
        console.log(`[Publish] Using brand-specific token for @${brand.instagramHandle}`);
      }
    }

    // Fallback to global AppSettings / env
    if (!accessToken || !igUserId) {
      const settings = await prisma.appSettings.findFirst();
      accessToken = accessToken || settings?.metaAccessToken || process.env.META_ACCESS_TOKEN || null;
      igUserId = igUserId || settings?.instagramBusinessId || process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID || null;
      console.log("[Publish] Using global token");
    }

    if (!accessToken || !igUserId) {
      return Response.json(
        { error: "No Instagram credentials. Add token in Settings." },
        { status: 400 }
      );
    }

    // ── Format caption (caption + hashtags, max 2200 chars) ─────────────
    let fullCaption = (job.caption || "").trim();
    if (job.hashtags) {
      const combined = fullCaption + "\n\n" + job.hashtags;
      fullCaption = combined.length <= 2200 ? combined : combined.slice(0, 2200);
    }

    let instagramPostId: string | null = null;
    let instagramUrl: string | null = null;

    try {
      if (job.videoUrl) {
        // Post any job with video as a REEL
        // ── Create Reel container ─────────────────────────────────────
        const containerRes = await fetch(`${META_BASE}/${igUserId}/media`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            media_type: "REELS",
            video_url: job.videoUrl,
            caption: fullCaption,
            access_token: accessToken,
          }),
        });
        const containerData = await containerRes.json();
        console.log(`[Publish] Container response: ${JSON.stringify(containerData).substring(0, 200)}`);
        if (containerData.error) {
          throw new Error(`Container creation: ${containerData.error.message || JSON.stringify(containerData.error)}`);
        }
        const containerId = containerData.id;

        // ── Poll container status ───────────────────────────────────
        const pollStart = Date.now();
        const pollTimeout = 300000; // 5 minutes
        let containerReady = false;

        while (Date.now() - pollStart < pollTimeout) {
          const statusRes = await fetch(
            `${META_BASE}/${containerId}?fields=status_code&access_token=${accessToken}`
          );
          const statusData = await statusRes.json();

          if (statusData.status_code === "FINISHED") {
            containerReady = true;
            break;
          }
          if (statusData.status_code === "ERROR") {
            throw new Error(`Reel container ERROR: ${JSON.stringify(statusData).substring(0, 200)}`);
          }

          await new Promise((r) => setTimeout(r, 3000));
        }

        if (!containerReady) {
          throw new Error("Reel container polling timed out");
        }

        // ── Publish container ───────────────────────────────────────
        const publishRes = await fetch(`${META_BASE}/${igUserId}/media_publish`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            creation_id: containerId,
            access_token: accessToken,
          }),
        });
        const publishData = await publishRes.json();
        if (publishData.error) {
          throw new Error(publishData.error.message || "Failed to publish reel");
        }
        instagramPostId = publishData.id;
      } else if (job.imageUrl) {
        // ── Create image container ──────────────────────────────────
        const containerRes = await fetch(`${META_BASE}/${igUserId}/media`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            image_url: job.imageUrl,
            caption: fullCaption,
            access_token: accessToken,
          }),
        });
        const containerData = await containerRes.json();
        if (containerData.error) {
          throw new Error(containerData.error.message || "Failed to create image container");
        }
        const containerId = containerData.id;

        // ── Publish container ───────────────────────────────────────
        const publishRes = await fetch(`${META_BASE}/${igUserId}/media_publish`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            creation_id: containerId,
            access_token: accessToken,
          }),
        });
        const publishData = await publishRes.json();
        if (publishData.error) {
          throw new Error(publishData.error.message || "Failed to publish image");
        }
        instagramPostId = publishData.id;
      } else {
        throw new Error("No media available to publish (no videoUrl or imageUrl)");
      }

      // Build Instagram URL
      if (instagramPostId) {
        instagramUrl = `https://www.instagram.com/p/${instagramPostId}/`;
      }

      // ── Update job with success ─────────────────────────────────────
      await prisma.contentJob.update({
        where: { id: job.id },
        data: { instagramPostId, instagramUrl },
      });

      // ── Update engine counters (find engine by brand) ──────────────
      const engine = job.brandProfileId
        ? await prisma.continuousEngine.findFirst({ where: { brandProfileId: job.brandProfileId } })
        : await prisma.continuousEngine.findFirst();
      if (engine) {
        await prisma.continuousEngine.update({
          where: { id: engine.id },
          data: {
            totalPosted: { increment: 1 },
            todayPosted: { increment: 1 },
          },
        });
      }

      // ── Chain: publish next completed job if any ───────────────────
      const moreCompleted = await prisma.contentJob.count({
        where: {
          status: "COMPLETED",
          instagramPostId: null,
          OR: [{ videoUrl: { not: null } }, { imageUrl: { not: null } }],
          retryCount: { lt: 3 },
        },
      });
      if (moreCompleted > 0) {
        // Wait 5 seconds between posts to avoid Instagram rate limits
        await new Promise((r) => setTimeout(r, 5000));
        try {
          const nextUrl = new URL("/api/cron/publish-scheduled", request.url);
          fetch(nextUrl.toString(), {
            headers: { authorization: request.headers.get("authorization") || "" },
          }).catch(() => {});
        } catch {}
      }

      return Response.json({
        success: true,
        jobId: job.id,
        instagramPostId,
        instagramUrl,
        postType: job.postType,
        remainingToPublish: moreCompleted,
      });
    } catch (publishError) {
      // ── Handle publish failure ──────────────────────────────────────
      const failReason =
        publishError instanceof Error ? publishError.message : "Publish failed";
      const newRetryCount = (job.retryCount || 0) + 1;
      const newStatus = newRetryCount >= 3 ? "FAILED" : "COMPLETED";

      await prisma.contentJob.update({
        where: { id: job.id },
        data: {
          retryCount: newRetryCount,
          failReason,
          status: newStatus,
        },
      });

      if (newStatus === "FAILED") {
        const failEngine = job.brandProfileId
          ? await prisma.continuousEngine.findFirst({ where: { brandProfileId: job.brandProfileId } })
          : await prisma.continuousEngine.findFirst();
        if (failEngine) {
          await prisma.continuousEngine.update({
            where: { id: failEngine.id },
            data: { totalFailed: { increment: 1 } },
          });
        }
      }

      return Response.json(
        {
          error: failReason,
          jobId: job.id,
          retryCount: newRetryCount,
          permanentlyFailed: newStatus === "FAILED",
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("[publish-scheduled] Error:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Publish failed" },
      { status: 500 }
    );
  }
}

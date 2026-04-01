import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";

const META_BASE = "https://graph.facebook.com/v19.0";

// ─── GET: Check current connection status ────────────────────────────────────

export async function GET() {
  try {
    const settings = await prisma.appSettings.findFirst();

    if (!settings?.metaAccessToken) {
      return Response.json({ connected: false, hasToken: false });
    }

    // Check token debug info for expiry
    let valid = false;
    let name = "";
    let expiresAt: Date | null = settings.metaTokenExpiresAt;
    let daysUntilExpiry: number | null = null;

    try {
      const debugRes = await fetch(
        `${META_BASE}/debug_token?input_token=${settings.metaAccessToken}&access_token=${settings.metaAccessToken}`
      );
      const debugData = await debugRes.json();

      if (debugData.data) {
        valid = debugData.data.is_valid !== false;
        if (debugData.data.expires_at && debugData.data.expires_at > 0) {
          expiresAt = new Date(debugData.data.expires_at * 1000);
          daysUntilExpiry = Math.floor(
            (expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
          );

          // Save expiry to DB if not already saved
          if (!settings.metaTokenExpiresAt || settings.metaTokenExpiresAt.getTime() !== expiresAt.getTime()) {
            await prisma.appSettings.update({
              where: { id: settings.id },
              data: { metaTokenExpiresAt: expiresAt },
            });
          }
        }
      }

      const meRes = await fetch(`${META_BASE}/me?fields=id,name&access_token=${settings.metaAccessToken}`);
      const meData = await meRes.json();
      if (!meData.error) name = meData.name || "";
      else valid = false;
    } catch {
      valid = false;
    }

    // Check IG account
    let igUsername = "";
    let igFollowers = 0;
    if (valid && settings.instagramBusinessId) {
      try {
        const igRes = await fetch(
          `${META_BASE}/${settings.instagramBusinessId}?fields=username,followers_count&access_token=${settings.metaAccessToken}`
        );
        const igData = await igRes.json();
        if (!igData.error) {
          igUsername = igData.username || "";
          igFollowers = igData.followers_count || 0;
        }
      } catch { /* skip */ }
    }

    return Response.json({
      connected: valid,
      hasToken: true,
      tokenValid: valid,
      tokenExpired: !valid && !!settings.metaAccessToken,
      hasIgId: !!settings.instagramBusinessId,
      instagramBusinessId: settings.instagramBusinessId || null,
      instagramUsername: igUsername || null,
      instagramFollowers: igFollowers,
      facebookPageId: settings.facebookPageId || null,
      userName: name,
      tokenExpiresAt: expiresAt?.toISOString() || null,
      daysUntilExpiry,
      permanent: expiresAt === null && !!settings.metaAccessToken,
      tokenType: expiresAt === null ? "page_permanent" : "long_lived_60d",
      needsRefresh: expiresAt !== null && daysUntilExpiry !== null && daysUntilExpiry <= 10,
    });
  } catch (error) {
    return Response.json({ connected: false, error: "Failed to check" }, { status: 500 });
  }
}

// ─── POST: Save token + exchange for long-lived token ────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { accessToken, instagramBusinessId, facebookPageId, action } = body;

    // Handle refresh action
    if (action === "refresh") {
      return handleRefresh();
    }

    if (!accessToken) {
      return Response.json({ error: "Access token is required" }, { status: 400 });
    }

    // Test the token
    const meRes = await fetch(`${META_BASE}/me?fields=id,name&access_token=${accessToken}`);
    const meData = await meRes.json();
    if (meData.error) {
      return Response.json({
        error: `Invalid token: ${meData.error.message}`,
        valid: false,
      }, { status: 400 });
    }

    // Try to upgrade to permanent token
    let tokenResult: { token: string; tokenType: string; expiresAt: Date | null; pageName?: string } | null = null;
    try {
      const { savePermanentToken } = await import("@/lib/meta-token");
      tokenResult = await savePermanentToken(accessToken, instagramBusinessId);
      console.log(`[Meta] Token upgraded to: ${tokenResult.tokenType}`);
    } catch (upgradeErr) {
      console.warn("[Meta] Token upgrade failed, using original:", upgradeErr);
    }

    // Try to exchange for a long-lived token (60 days)
    let longLivedToken = accessToken;
    let tokenExpiresAt: Date | null = null;

    const appId = process.env.META_APP_ID;
    const appSecret = process.env.META_APP_SECRET;

    if (appId && appSecret) {
      try {
        const exchangeRes = await fetch(
          `${META_BASE}/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${accessToken}`
        );
        const exchangeData = await exchangeRes.json();

        if (exchangeData.access_token) {
          longLivedToken = exchangeData.access_token;
          // Long-lived tokens last ~60 days
          const expiresIn = exchangeData.expires_in || 5184000; // default 60 days
          tokenExpiresAt = new Date(Date.now() + expiresIn * 1000);
          console.log(`[Meta] Exchanged for long-lived token, expires in ${Math.floor(expiresIn / 86400)} days`);
        }
      } catch (err) {
        console.log("[Meta] Long-lived token exchange failed, using short-lived:", err);
      }
    }

    // If no app secret, check expiry from debug endpoint
    if (!tokenExpiresAt) {
      try {
        const debugRes = await fetch(
          `${META_BASE}/debug_token?input_token=${longLivedToken}&access_token=${longLivedToken}`
        );
        const debugData = await debugRes.json();
        if (debugData.data?.expires_at && debugData.data.expires_at > 0) {
          tokenExpiresAt = new Date(debugData.data.expires_at * 1000);
        }
      } catch { /* skip */ }
    }

    // Auto-discover Instagram Business Account ID
    let igId = instagramBusinessId || "";
    let fbPageId = facebookPageId || "";
    let igUsername = "";
    let igFollowers = 0;

    try {
      const pagesRes = await fetch(
        `${META_BASE}/me/accounts?fields=id,name,access_token,instagram_business_account{id,username,profile_picture_url,followers_count}&access_token=${longLivedToken}`
      );
      const pagesData = await pagesRes.json();
      if (pagesData.data && pagesData.data.length > 0) {
        for (const page of pagesData.data) {
          if (page.instagram_business_account) {
            if (!igId) igId = page.instagram_business_account.id;
            if (!fbPageId) fbPageId = page.id;
            igUsername = page.instagram_business_account.username || "";
            igFollowers = page.instagram_business_account.followers_count || 0;
            break;
          }
        }
      }
    } catch { /* continue */ }

    // Save to DB
    const existing = await prisma.appSettings.findFirst();
    await (existing
      ? prisma.appSettings.update({
          where: { id: existing.id },
          data: {
            metaAccessToken: longLivedToken,
            instagramBusinessId: igId || existing.instagramBusinessId,
            facebookPageId: fbPageId || existing.facebookPageId,
            metaTokenExpiresAt: tokenExpiresAt,
          },
        })
      : prisma.appSettings.create({
          data: {
            metaAccessToken: longLivedToken,
            instagramBusinessId: igId || null,
            facebookPageId: fbPageId || null,
            metaTokenExpiresAt: tokenExpiresAt,
          },
        }));

    // Set in process.env for immediate use
    process.env.META_ACCESS_TOKEN = longLivedToken;
    if (igId) process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID = igId;

    const daysUntilExpiry = tokenExpiresAt
      ? Math.floor((tokenExpiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      : null;

    return Response.json({
      valid: true,
      saved: true,
      tokenType: tokenResult?.tokenType || (longLivedToken !== accessToken ? "long_lived_60d" : "short_lived"),
      permanent: tokenResult?.tokenType === "page_permanent",
      pageName: tokenResult?.pageName || null,
      userName: meData.name,
      instagramBusinessId: igId || null,
      instagramUsername: igUsername || null,
      instagramFollowers: igFollowers,
      facebookPageId: fbPageId || null,
      tokenExpiresAt: tokenResult?.expiresAt?.toISOString() || tokenExpiresAt?.toISOString() || null,
      daysUntilExpiry: tokenResult?.tokenType === "page_permanent" ? null : daysUntilExpiry,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Failed to save settings";
    return Response.json({ error: msg }, { status: 500 });
  }
}

// ─── Refresh long-lived token ────────────────────────────────────────────────

async function handleRefresh() {
  try {
    const settings = await prisma.appSettings.findFirst();
    if (!settings?.metaAccessToken) {
      return Response.json({ error: "No token to refresh" }, { status: 400 });
    }

    const appId = process.env.META_APP_ID;
    const appSecret = process.env.META_APP_SECRET;

    if (!appId || !appSecret) {
      return Response.json({
        error: "META_APP_ID and META_APP_SECRET required for token refresh. Add them in Vercel env vars.",
        refreshable: false,
      }, { status: 400 });
    }

    // Exchange current long-lived token for a new long-lived token
    const refreshRes = await fetch(
      `${META_BASE}/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${settings.metaAccessToken}`
    );
    const refreshData = await refreshRes.json();

    if (refreshData.error) {
      return Response.json({
        error: `Refresh failed: ${refreshData.error.message}. You may need to generate a new token manually.`,
        refreshable: false,
      }, { status: 400 });
    }

    if (!refreshData.access_token) {
      return Response.json({ error: "No token returned from refresh", refreshable: false }, { status: 500 });
    }

    const expiresIn = refreshData.expires_in || 5184000;
    const tokenExpiresAt = new Date(Date.now() + expiresIn * 1000);

    // Save new token
    await prisma.appSettings.update({
      where: { id: settings.id },
      data: {
        metaAccessToken: refreshData.access_token,
        metaTokenExpiresAt: tokenExpiresAt,
      },
    });

    process.env.META_ACCESS_TOKEN = refreshData.access_token;

    const daysUntilExpiry = Math.floor(expiresIn / 86400);
    console.log(`[Meta] Token refreshed, expires in ${daysUntilExpiry} days`);

    return Response.json({
      refreshed: true,
      tokenExpiresAt: tokenExpiresAt.toISOString(),
      daysUntilExpiry,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Refresh failed";
    return Response.json({ error: msg }, { status: 500 });
  }
}

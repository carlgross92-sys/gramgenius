import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";

const META_BASE = "https://graph.facebook.com/v19.0";

export async function GET() {
  try {
    const settings = await prisma.appSettings.findFirst();

    if (!settings?.metaAccessToken) {
      return Response.json({ connected: false, hasToken: false });
    }

    // Verify token is still valid
    let valid = false;
    let name = "";
    let igUsername = "";
    let igFollowers = 0;
    try {
      const meRes = await fetch(
        `${META_BASE}/me?fields=id,name&access_token=${settings.metaAccessToken}`
      );
      const meData = await meRes.json();
      valid = !meData.error;
      name = meData.name || "";
    } catch {
      valid = false;
    }

    // Check IG account info if we have the ID
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
      hasIgId: !!settings.instagramBusinessId,
      instagramBusinessId: settings.instagramBusinessId || null,
      instagramUsername: igUsername || null,
      instagramFollowers: igFollowers,
      facebookPageId: settings.facebookPageId || null,
      userName: name,
      tokenExpiresAt: settings.metaTokenExpiresAt || null,
    });
  } catch (error) {
    return Response.json({ connected: false, error: "Failed to check" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { accessToken, instagramBusinessId, facebookPageId } = body;

    if (!accessToken) {
      return Response.json({ error: "Access token is required" }, { status: 400 });
    }

    // Test the token first
    const meRes = await fetch(`${META_BASE}/me?fields=id,name&access_token=${accessToken}`);
    const meData = await meRes.json();
    if (meData.error) {
      return Response.json({
        error: `Invalid token: ${meData.error.message}`,
        valid: false,
      }, { status: 400 });
    }

    // Auto-discover Instagram Business Account ID if not provided
    let igId = instagramBusinessId || "";
    let fbPageId = facebookPageId || "";
    let igUsername = "";
    let igFollowers = 0;

    try {
      const pagesRes = await fetch(
        `${META_BASE}/me/accounts?fields=id,name,access_token,instagram_business_account{id,username,profile_picture_url,followers_count}&access_token=${accessToken}`
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
    } catch {
      // Pages discovery failed — continue with whatever we have
    }

    // Save to DB
    const existing = await prisma.appSettings.findFirst();
    const settings = existing
      ? await prisma.appSettings.update({
          where: { id: existing.id },
          data: {
            metaAccessToken: accessToken,
            instagramBusinessId: igId || null,
            facebookPageId: fbPageId || null,
          },
        })
      : await prisma.appSettings.create({
          data: {
            metaAccessToken: accessToken,
            instagramBusinessId: igId || null,
            facebookPageId: fbPageId || null,
          },
        });

    // Also set in process.env for immediate use in this process
    process.env.META_ACCESS_TOKEN = accessToken;
    if (igId) process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID = igId;
    if (fbPageId) process.env.FACEBOOK_PAGE_ID = fbPageId;

    return Response.json({
      valid: true,
      saved: true,
      userName: meData.name,
      instagramBusinessId: igId || null,
      instagramUsername: igUsername || null,
      instagramFollowers: igFollowers,
      facebookPageId: fbPageId || null,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Failed to save settings";
    return Response.json({ error: msg }, { status: 500 });
  }
}

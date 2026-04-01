import prisma from "@/lib/prisma";

const META_BASE = "https://graph.facebook.com/v19.0";

/**
 * Exchange a short-lived user token for a 60-day long-lived token.
 */
export async function exchangeForLongLivedToken(
  shortToken: string
): Promise<{ token: string; expiresAt: Date }> {
  const appId = process.env.META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;

  if (!appId || !appSecret) {
    console.warn("[Token] No META_APP_ID/SECRET — returning original token");
    return { token: shortToken, expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000) };
  }

  const res = await fetch(
    `https://graph.facebook.com/oauth/access_token` +
    `?grant_type=fb_exchange_token` +
    `&client_id=${appId}` +
    `&client_secret=${appSecret}` +
    `&fb_exchange_token=${shortToken}`
  );
  const data = await res.json();

  if (data.error) throw new Error(`Token exchange failed: ${data.error.message}`);

  const expiresAt = new Date();
  expiresAt.setSeconds(expiresAt.getSeconds() + (data.expires_in || 5184000));

  console.log(`[Token] Got long-lived token, expires: ${expiresAt.toISOString()}`);
  return { token: data.access_token, expiresAt };
}

/**
 * Get a PERMANENT Page Access Token from a long-lived user token.
 * Page tokens for pages you own/manage NEVER expire.
 */
export async function getPageAccessToken(
  userToken: string
): Promise<{ pageToken: string; pageName: string; pageId: string } | null> {
  try {
    const res = await fetch(
      `${META_BASE}/me/accounts?fields=id,name,access_token&access_token=${userToken}`
    );
    const data = await res.json();

    if (data.error || !data.data || data.data.length === 0) {
      console.log("[Token] No pages found — user token doesn't have pages_show_list permission");
      return null;
    }

    // Find Chewy Sacramento page or use first page
    const page = data.data.find(
      (p: { name: string }) =>
        p.name === "Chewy Sacramento" ||
        p.name?.toLowerCase().includes("chewy")
    ) || data.data[0];

    if (!page || !page.access_token) return null;

    console.log(`[Token] Got permanent page token for: ${page.name}`);
    return {
      pageToken: page.access_token,
      pageName: page.name,
      pageId: page.id,
    };
  } catch (err) {
    console.error("[Token] Failed to get page token:", err);
    return null;
  }
}

/**
 * Full token upgrade pipeline:
 * 1. Exchange short token for 60-day long-lived token
 * 2. Try to get permanent page token (never expires)
 * 3. Save the best token to DB
 * Returns the best available token.
 */
export async function savePermanentToken(
  shortToken: string,
  instagramBusinessId?: string
): Promise<{
  token: string;
  tokenType: "page_permanent" | "long_lived_60d" | "short_lived";
  expiresAt: Date | null;
  pageName?: string;
}> {
  let bestToken = shortToken;
  let tokenType: "page_permanent" | "long_lived_60d" | "short_lived" = "short_lived";
  let expiresAt: Date | null = new Date(Date.now() + 2 * 60 * 60 * 1000);

  // Step 1: Try to exchange for long-lived token
  try {
    const longLived = await exchangeForLongLivedToken(shortToken);
    bestToken = longLived.token;
    tokenType = "long_lived_60d";
    expiresAt = longLived.expiresAt;
    console.log("[Token] Upgraded to 60-day long-lived token");
  } catch (err) {
    console.warn("[Token] Long-lived exchange failed:", err);
  }

  // Step 2: Try to get permanent page token
  let pageName: string | undefined;
  try {
    const pageResult = await getPageAccessToken(bestToken);
    if (pageResult) {
      bestToken = pageResult.pageToken;
      tokenType = "page_permanent";
      expiresAt = null; // Page tokens never expire
      pageName = pageResult.pageName;
      console.log(`[Token] Upgraded to PERMANENT page token for ${pageName}`);
    }
  } catch (err) {
    console.warn("[Token] Page token extraction failed:", err);
  }

  // Step 3: Save to DB
  const existing = await prisma.appSettings.findFirst();
  if (existing) {
    await prisma.appSettings.update({
      where: { id: existing.id },
      data: {
        metaAccessToken: bestToken,
        instagramBusinessId: instagramBusinessId || existing.instagramBusinessId,
        metaTokenExpiresAt: expiresAt,
      },
    });
  } else {
    await prisma.appSettings.create({
      data: {
        metaAccessToken: bestToken,
        instagramBusinessId: instagramBusinessId || null,
        metaTokenExpiresAt: expiresAt,
      },
    });
  }

  // Set in process.env for immediate use
  process.env.META_ACCESS_TOKEN = bestToken;

  console.log(`[Token] Saved ${tokenType} token to DB`);

  return { token: bestToken, tokenType, expiresAt, pageName };
}

/**
 * Validate a token is still working.
 */
export async function validateToken(token: string): Promise<boolean> {
  try {
    const res = await fetch(`${META_BASE}/me?access_token=${token}`);
    const data = await res.json();
    return !data.error;
  } catch {
    return false;
  }
}

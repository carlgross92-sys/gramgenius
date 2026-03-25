import prisma from "@/lib/prisma";

const META_BASE = "https://graph.facebook.com/v19.0";

export async function GET() {
  try {
    // Check env var first, then DB
    let token = process.env.META_ACCESS_TOKEN;
    let igId = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID;
    let source = "env";

    if (!token) {
      const settings = await prisma.appSettings.findFirst();
      token = settings?.metaAccessToken || "";
      igId = igId || settings?.instagramBusinessId || "";
      source = "database";
    }

    if (!token) {
      return Response.json({
        connected: false,
        error: "No META_ACCESS_TOKEN found in env or database",
        source: "none",
      });
    }

    // Test the token
    const meRes = await fetch(`${META_BASE}/me?fields=id,name&access_token=${token}`);
    const meData = await meRes.json();

    if (meData.error) {
      return Response.json({
        connected: false,
        error: meData.error.message,
        tokenSource: source,
      });
    }

    // Test IG account
    let igInfo = null;
    if (igId) {
      try {
        const igRes = await fetch(
          `${META_BASE}/${igId}?fields=id,username,profile_picture_url,followers_count&access_token=${token}`
        );
        const igData = await igRes.json();
        if (!igData.error) {
          igInfo = {
            id: igData.id,
            username: igData.username,
            followers: igData.followers_count,
          };
        }
      } catch { /* skip */ }
    }

    return Response.json({
      connected: true,
      tokenSource: source,
      userName: meData.name,
      userId: meData.id,
      instagramAccount: igInfo,
      hasInstagramId: !!igId,
    });
  } catch (error) {
    return Response.json({
      connected: false,
      error: error instanceof Error ? error.message : "Connection test failed",
    });
  }
}

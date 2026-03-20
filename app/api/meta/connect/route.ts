import { verifyToken, getInstagramAccount, discoverInstagramAccount } from "@/lib/meta";

const META_BASE = "https://graph.facebook.com/v19.0";

export async function GET() {
  try {
    const tokenInfo = await verifyToken();
    const instagramAccount = await getInstagramAccount();

    // Also try auto-discovery using env var token
    let autoDiscovered = null;
    try {
      const envToken = process.env.META_ACCESS_TOKEN;
      if (envToken) {
        const discovered = await discoverInstagramAccount(envToken);
        autoDiscovered = {
          igAccountId: discovered.igAccountId,
          igUsername: discovered.igUsername,
          pageId: discovered.pageId,
        };
      }
    } catch {
      // Auto-discovery is optional for GET, don't fail
    }

    return Response.json({
      valid: true,
      instagramAccountId: instagramAccount.id ?? null,
      instagramUsername: instagramAccount.username ?? null,
      profilePicUrl: instagramAccount.profilePicUrl ?? null,
      followerCount: instagramAccount.followersCount ?? null,
      tokenExpiresIn: tokenInfo.expiresAt
        ? tokenInfo.expiresAt - Math.floor(Date.now() / 1000)
        : null,
      autoDiscovered,
    });
  } catch (error) {
    console.error("Failed to verify Meta connection:", error);
    return Response.json(
      {
        valid: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to verify Meta connection",
      },
      { status: 401 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { accessToken } = body;

    if (!accessToken || typeof accessToken !== "string") {
      return Response.json(
        {
          valid: false,
          error: "Access token is required. Please provide a valid Meta access token.",
        },
        { status: 400 }
      );
    }

    // Step 1: Test the token with /me
    const meRes = await fetch(
      `${META_BASE}/me?fields=id,name&access_token=${accessToken}`
    );
    const meData = await meRes.json();

    if (meData.error) {
      const errorMessage = meData.error.message || "Unknown error";
      const errorCode = meData.error.code;

      if (errorCode === 190) {
        return Response.json(
          {
            valid: false,
            error: `Token is invalid or expired: ${errorMessage}. Generate a new token at developers.facebook.com/tools/explorer.`,
          },
          { status: 401 }
        );
      }

      return Response.json(
        {
          valid: false,
          error: `Meta API error: ${errorMessage}`,
        },
        { status: 401 }
      );
    }

    const userName = meData.name || "Unknown";

    // Step 2: Fetch pages + linked IG accounts
    const pagesRes = await fetch(
      `${META_BASE}/me/accounts?fields=id,name,access_token,instagram_business_account{id,username,profile_picture_url,followers_count}&access_token=${accessToken}`
    );
    const pagesData = await pagesRes.json();

    if (pagesData.error) {
      return Response.json(
        {
          valid: true,
          userName,
          pages: [],
          autoDiscovered: null,
          error: `Could not fetch pages: ${pagesData.error.message}. Make sure your token has pages_show_list permission.`,
        },
        { status: 200 }
      );
    }

    const pages = (pagesData.data || []).map(
      (page: {
        id: string;
        name: string;
        instagram_business_account?: {
          id: string;
          username?: string;
          followers_count?: number;
        };
      }) => ({
        id: page.id,
        name: page.name,
        hasInstagram: !!page.instagram_business_account?.id,
        igUsername: page.instagram_business_account?.username || null,
        igFollowers: page.instagram_business_account?.followers_count || null,
      })
    );

    // Step 3: Auto-discover first page with IG
    let autoDiscovered = null;
    const pageWithIG = (pagesData.data || []).find(
      (page: { instagram_business_account?: { id: string } }) =>
        page.instagram_business_account?.id
    );

    if (pageWithIG) {
      const ig = pageWithIG.instagram_business_account;
      autoDiscovered = {
        igAccountId: ig.id,
        igUsername: ig.username || null,
        igProfilePic: ig.profile_picture_url || null,
        igFollowers: ig.followers_count || 0,
        pageId: pageWithIG.id,
        pageName: pageWithIG.name,
      };
    }

    return Response.json({
      valid: true,
      userName,
      pages,
      autoDiscovered,
    });
  } catch (error) {
    console.error("Failed to process Meta connection:", error);
    return Response.json(
      {
        valid: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to process Meta connection. Please check your token and try again.",
      },
      { status: 500 }
    );
  }
}

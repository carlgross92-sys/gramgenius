import prisma from "@/lib/prisma";

const META_BASE = "https://graph.facebook.com/v19.0";

// Cache DB settings for the duration of a request
let _cachedSettings: { metaAccessToken?: string | null; instagramBusinessId?: string | null; facebookPageId?: string | null } | null = null;

async function loadDbSettings() {
  if (!_cachedSettings) {
    try {
      const settings = await prisma.appSettings.findFirst();
      _cachedSettings = settings || {};
    } catch {
      _cachedSettings = {};
    }
  }
  return _cachedSettings;
}

async function getAccessTokenAsync(): Promise<string> {
  if (process.env.META_ACCESS_TOKEN) return process.env.META_ACCESS_TOKEN;
  const settings = await loadDbSettings();
  if (settings.metaAccessToken) return settings.metaAccessToken;
  throw new Error("META_ACCESS_TOKEN not configured. Add in Settings page.");
}

async function getIGUserIdAsync(): Promise<string> {
  if (process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID) return process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID;
  const settings = await loadDbSettings();
  if (settings.instagramBusinessId) return settings.instagramBusinessId;
  throw new Error("INSTAGRAM_BUSINESS_ACCOUNT_ID not configured. Add in Settings page.");
}

// Module-level cache set by initMetaFromDb()
let _tokenFromDb: string | null = null;
let _igIdFromDb: string | null = null;

export async function initMetaFromDb() {
  // Force fresh read from DB (clear cache)
  _cachedSettings = null;
  const settings = await loadDbSettings();
  _tokenFromDb = settings.metaAccessToken || null;
  _igIdFromDb = settings.instagramBusinessId || null;
}

function getAccessToken(): string {
  const token = process.env.META_ACCESS_TOKEN || _tokenFromDb;
  if (!token) throw new Error("META_ACCESS_TOKEN not configured. Add in Settings page.");
  return token;
}

function getIGUserId(): string {
  const id = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID || _igIdFromDb;
  if (!id) throw new Error("INSTAGRAM_BUSINESS_ACCOUNT_ID not configured. Add in Settings page.");
  return id;
}

export async function verifyToken(overrideToken?: string): Promise<{
  valid: boolean;
  userId?: string;
  userName?: string;
  expiresAt?: number;
  scopes?: string[];
}> {
  try {
    const token = overrideToken || getAccessToken();

    const [meRes, debugRes] = await Promise.all([
      fetch(`${META_BASE}/me?fields=id,name&access_token=${token}`),
      fetch(
        `${META_BASE}/debug_token?input_token=${token}&access_token=${token}`
      ),
    ]);

    const meData = await meRes.json();
    const debugData = await debugRes.json();

    if (meData.error) {
      return { valid: false };
    }

    return {
      valid: debugData.data?.is_valid !== false,
      userId: meData.id,
      userName: meData.name,
      expiresAt: debugData.data?.expires_at || undefined,
      scopes: debugData.data?.scopes || [],
    };
  } catch {
    return { valid: false };
  }
}

export async function discoverInstagramAccount(accessToken: string): Promise<{
  pageId: string;
  pageName: string;
  pageAccessToken: string;
  igAccountId: string;
  igUsername: string;
  igProfilePic: string;
  igFollowers: number;
}> {
  // Fetch all pages the user manages, including linked IG business accounts
  const res = await fetch(
    `${META_BASE}/me/accounts?fields=id,name,access_token,instagram_business_account{id,username,profile_picture_url,followers_count}&access_token=${accessToken}`
  );
  const data = await res.json();

  if (data.error) {
    throw new Error(
      `Facebook API error: ${data.error.message || "Unknown error"}. ` +
        `Make sure your token has pages_show_list and pages_read_engagement permissions.`
    );
  }

  if (!data.data || data.data.length === 0) {
    throw new Error(
      "No Facebook Pages found for this account. " +
        "You need a Facebook Page linked to an Instagram Business or Creator account. " +
        "Go to your Instagram settings > Account > Switch to Professional Account, " +
        "then link it to a Facebook Page."
    );
  }

  // Find the first page with a linked Instagram Business Account
  const pageWithIG = data.data.find(
    (page: { instagram_business_account?: { id: string } }) =>
      page.instagram_business_account?.id
  );

  if (!pageWithIG) {
    const pageNames = data.data
      .map((p: { name: string }) => p.name)
      .join(", ");
    throw new Error(
      `Found Facebook Page(s) (${pageNames}) but none have a linked Instagram Business Account. ` +
        "Go to your Facebook Page Settings > Instagram > Connect Account to link your Instagram."
    );
  }

  const ig = pageWithIG.instagram_business_account;

  return {
    pageId: pageWithIG.id,
    pageName: pageWithIG.name,
    pageAccessToken: pageWithIG.access_token,
    igAccountId: ig.id,
    igUsername: ig.username || "",
    igProfilePic: ig.profile_picture_url || "",
    igFollowers: ig.followers_count || 0,
  };
}

export async function getInstagramAccount(): Promise<{
  id: string;
  username: string;
  profilePicUrl: string;
  followersCount: number;
}> {
  const token = getAccessToken();
  const igId = getIGUserId();

  const res = await fetch(
    `${META_BASE}/${igId}?fields=id,username,profile_picture_url,followers_count&access_token=${token}`
  );
  const data = await res.json();

  if (data.error) throw new Error(data.error.message);

  return {
    id: data.id,
    username: data.username,
    profilePicUrl: data.profile_picture_url || "",
    followersCount: data.followers_count || 0,
  };
}

export async function createImageContainer(
  imageUrl: string,
  caption: string
): Promise<string> {
  const token = getAccessToken();
  const igId = getIGUserId();

  const res = await fetch(`${META_BASE}/${igId}/media`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      image_url: imageUrl,
      caption,
      access_token: token,
    }),
  });

  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.id;
}

export async function createReelContainer(
  videoUrl: string,
  caption: string
): Promise<string> {
  const token = getAccessToken();
  const igId = getIGUserId();

  const res = await fetch(`${META_BASE}/${igId}/media`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      media_type: "REELS",
      video_url: videoUrl,
      caption,
      access_token: token,
    }),
  });

  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.id;
}

export async function pollContainerStatus(
  containerId: string,
  timeoutMs: number = 300000
): Promise<string> {
  const token = getAccessToken();
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    const res = await fetch(
      `${META_BASE}/${containerId}?fields=status_code&access_token=${token}`
    );
    const data = await res.json();

    if (data.status_code === "FINISHED") return "FINISHED";
    if (data.status_code === "ERROR") {
      throw new Error(`Container failed: ${data.status_code}`);
    }

    await new Promise((r) => setTimeout(r, 3000));
  }

  throw new Error("Container status polling timed out");
}

export async function publishContainer(containerId: string): Promise<string> {
  const token = getAccessToken();
  const igId = getIGUserId();

  const res = await fetch(`${META_BASE}/${igId}/media_publish`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      creation_id: containerId,
      access_token: token,
    }),
  });

  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.id;
}

export async function getMediaComments(
  mediaId: string
): Promise<
  Array<{
    id: string;
    text: string;
    username: string;
    timestamp: string;
    replies?: { data: Array<{ id: string; text: string }> };
  }>
> {
  const token = getAccessToken();
  const res = await fetch(
    `${META_BASE}/${mediaId}/comments?fields=id,text,username,timestamp,replies{id,text}&access_token=${token}`
  );
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.data || [];
}

export async function replyToComment(
  commentId: string,
  message: string
): Promise<string> {
  const token = getAccessToken();
  const res = await fetch(`${META_BASE}/${commentId}/replies`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message,
      access_token: token,
    }),
  });

  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.id;
}

export async function getPostInsights(
  mediaId: string
): Promise<{
  likes: number;
  comments: number;
  reach: number;
  impressions: number;
  saves: number;
  shares: number;
}> {
  const token = getAccessToken();
  const res = await fetch(
    `${META_BASE}/${mediaId}/insights?metric=likes,comments,reach,impressions,saved,shares&access_token=${token}`
  );
  const data = await res.json();

  const metrics: Record<string, number> = {};
  if (data.data) {
    for (const item of data.data) {
      metrics[item.name] = item.values?.[0]?.value || 0;
    }
  }

  return {
    likes: metrics.likes || 0,
    comments: metrics.comments || 0,
    reach: metrics.reach || 0,
    impressions: metrics.impressions || 0,
    saves: metrics.saved || 0,
    shares: metrics.shares || 0,
  };
}

export async function postToFacebookPage(
  message: string,
  imageUrl?: string
): Promise<string> {
  const token = getAccessToken();
  const pageId = process.env.FACEBOOK_PAGE_ID;
  if (!pageId) throw new Error("FACEBOOK_PAGE_ID not configured");

  const endpoint = imageUrl
    ? `${META_BASE}/${pageId}/photos`
    : `${META_BASE}/${pageId}/feed`;

  const body: Record<string, string> = {
    access_token: token,
    message,
  };
  if (imageUrl) body.url = imageUrl;

  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.id;
}

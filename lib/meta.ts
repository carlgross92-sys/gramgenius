const META_BASE = "https://graph.facebook.com/v19.0";

function getAccessToken(): string {
  const token = process.env.META_ACCESS_TOKEN;
  if (!token) throw new Error("META_ACCESS_TOKEN not configured");
  return token;
}

function getIGUserId(): string {
  const id = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID;
  if (!id) throw new Error("INSTAGRAM_BUSINESS_ACCOUNT_ID not configured");
  return id;
}

export async function verifyToken(): Promise<{
  valid: boolean;
  name?: string;
  id?: string;
  expiresIn?: number;
}> {
  try {
    const token = getAccessToken();
    // Check token debug info
    const debugRes = await fetch(
      `${META_BASE}/debug_token?input_token=${token}&access_token=${token}`
    );
    const debugData = await debugRes.json();

    const meRes = await fetch(
      `${META_BASE}/me?fields=id,name&access_token=${token}`
    );
    const meData = await meRes.json();

    return {
      valid: debugData.data?.is_valid !== false,
      name: meData.name,
      id: meData.id,
      expiresIn: debugData.data?.expires_at
        ? debugData.data.expires_at - Math.floor(Date.now() / 1000)
        : undefined,
    };
  } catch {
    return { valid: false };
  }
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

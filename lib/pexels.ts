import { createClient } from "pexels";
import { put } from "@vercel/blob";

// ---------------------------------------------------------------------------
// Lazy client initialization (same pattern as other libs)
// ---------------------------------------------------------------------------

function getClient() {
  return createClient(process.env.PEXELS_API_KEY || "");
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PexelsVideo {
  id: string;
  url: string;
  width: number;
  height: number;
  duration: number;
  photographer: string;
  pexelsUrl: string;
  thumbnailUrl: string;
}

// ---------------------------------------------------------------------------
// searchAnimalVideo
// ---------------------------------------------------------------------------

export async function searchAnimalVideo(
  topic: string,
  animal: string
): Promise<PexelsVideo> {
  const client = getClient();

  // Queries from most to least specific
  const queries = [
    `funny ${animal}`,
    `cute ${animal} funny`,
    `${animal} hilarious`,
    `${animal} fail`,
    `funny ${animal} pet`,
    animal,
    "funny animals",
  ];

  for (const query of queries) {
    try {
      console.log(`[Pexels] Searching: "${query}"`);

      const response = await client.videos.search({
        query,
        per_page: 15,
        orientation: "portrait" as never,
        size: "medium" as never,
      });

      // Check if the response has videos (not an error response)
      if (!("videos" in response) || response.videos.length === 0) {
        console.log(`[Pexels] No results for: "${query}"`);
        continue;
      }

      // Filter for good duration (5-30 seconds)
      const goodDuration = response.videos.filter(
        (v) => v.duration >= 5 && v.duration <= 30
      );

      if (goodDuration.length === 0) {
        console.log(`[Pexels] No videos with good duration for: "${query}"`);
        continue;
      }

      // Pick randomly from top 5 for variety
      const top5 = goodDuration.slice(0, 5);
      const selected = top5[Math.floor(Math.random() * top5.length)];

      // Find the best video file: prefer HD, prefer portrait, sort by height desc
      const videoFile = selected.video_files
        .filter((f) => f.width != null && f.height != null)
        .sort((a, b) => {
          // Prefer HD quality
          const aHD = a.quality === "hd" ? 1 : 0;
          const bHD = b.quality === "hd" ? 1 : 0;
          if (bHD !== aHD) return bHD - aHD;

          // Prefer portrait (height > width)
          const aPortrait = (a.height || 0) > (a.width || 0) ? 1 : 0;
          const bPortrait = (b.height || 0) > (b.width || 0) ? 1 : 0;
          if (bPortrait !== aPortrait) return bPortrait - aPortrait;

          // Sort by height descending
          return (b.height || 0) - (a.height || 0);
        })[0];

      if (!videoFile) {
        console.log(`[Pexels] No suitable video file for: "${query}"`);
        continue;
      }

      console.log(
        `[Pexels] Found video id=${selected.id} duration=${selected.duration}s from "${query}"`
      );

      return {
        id: String(selected.id),
        url: videoFile.link,
        width: videoFile.width || selected.width,
        height: videoFile.height || selected.height,
        duration: selected.duration,
        photographer: selected.user.name,
        pexelsUrl: selected.url,
        thumbnailUrl: selected.image,
      };
    } catch (error) {
      console.log(
        `[Pexels] Search failed for "${query}":`,
        error instanceof Error ? error.message : String(error)
      );
      // Try the next query
    }
  }

  throw new Error(
    `No suitable Pexels video found for animal="${animal}" topic="${topic}"`
  );
}

// ---------------------------------------------------------------------------
// searchMultipleVideos
// ---------------------------------------------------------------------------

export async function searchMultipleVideos(
  animal: string,
  count: number
): Promise<PexelsVideo[]> {
  const client = getClient();
  const results: PexelsVideo[] = [];
  const usedIds = new Set<string>();

  const queries = [
    `funny ${animal}`,
    `cute ${animal} funny`,
    `${animal} hilarious`,
    `${animal} fail`,
    `funny ${animal} pet`,
    animal,
    "funny animals",
  ];

  for (const query of queries) {
    if (results.length >= count) break;

    try {
      console.log(`[Pexels] Multi-search: "${query}"`);

      const response = await client.videos.search({
        query,
        per_page: 15,
        orientation: "portrait" as never,
        size: "medium" as never,
      });

      if (!("videos" in response) || response.videos.length === 0) {
        continue;
      }

      const goodDuration = response.videos.filter(
        (v) => v.duration >= 5 && v.duration <= 30
      );

      for (const video of goodDuration) {
        if (results.length >= count) break;

        const videoId = String(video.id);
        if (usedIds.has(videoId)) continue;

        const videoFile = video.video_files
          .filter((f) => f.width != null && f.height != null)
          .sort((a, b) => {
            const aHD = a.quality === "hd" ? 1 : 0;
            const bHD = b.quality === "hd" ? 1 : 0;
            if (bHD !== aHD) return bHD - aHD;

            const aPortrait = (a.height || 0) > (a.width || 0) ? 1 : 0;
            const bPortrait = (b.height || 0) > (b.width || 0) ? 1 : 0;
            if (bPortrait !== aPortrait) return bPortrait - aPortrait;

            return (b.height || 0) - (a.height || 0);
          })[0];

        if (!videoFile) continue;

        usedIds.add(videoId);
        results.push({
          id: videoId,
          url: videoFile.link,
          width: videoFile.width || video.width,
          height: videoFile.height || video.height,
          duration: video.duration,
          photographer: video.user.name,
          pexelsUrl: video.url,
          thumbnailUrl: video.image,
        });
      }
    } catch (error) {
      console.log(
        `[Pexels] Multi-search failed for "${query}":`,
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  return results;
}

// ---------------------------------------------------------------------------
// downloadAndSaveVideo
// ---------------------------------------------------------------------------

export async function downloadAndSaveVideo(
  pexelsUrl: string,
  filename: string
): Promise<string> {
  console.log(`[Pexels] Downloading video: ${pexelsUrl}`);

  const response = await fetch(pexelsUrl);
  if (!response.ok) {
    throw new Error(
      `Failed to download video: ${response.status} ${response.statusText}`
    );
  }

  const buffer = Buffer.from(await response.arrayBuffer());

  const blob = await put(`generated-videos/${filename}.mp4`, buffer, {
    access: "public",
    contentType: "video/mp4",
  });

  console.log(`[Pexels] Saved to Vercel Blob: ${blob.url}`);
  return blob.url;
}

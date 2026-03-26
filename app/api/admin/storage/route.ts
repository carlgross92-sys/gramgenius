import { list, del } from "@vercel/blob";

export const maxDuration = 60;

export async function GET() {
  try {
    // List all blobs to get storage usage
    let totalSize = 0;
    let totalFiles = 0;
    const breakdown: Record<string, { count: number; size: number }> = {};

    let cursor: string | undefined;
    const allBlobs: Array<{ url: string; size: number; uploadedAt: Date; pathname: string }> = [];

    do {
      const result = await list({ cursor, limit: 1000 });
      for (const blob of result.blobs) {
        totalSize += blob.size;
        totalFiles++;
        allBlobs.push(blob);

        const folder = blob.pathname.split("/")[0] || "root";
        if (!breakdown[folder]) breakdown[folder] = { count: 0, size: 0 };
        breakdown[folder].count++;
        breakdown[folder].size += blob.size;
      }
      cursor = result.hasMore ? result.cursor : undefined;
    } while (cursor);

    return Response.json({
      totalFiles,
      totalSizeMB: Math.round(totalSize / 1024 / 1024 * 10) / 10,
      totalSizeBytes: totalSize,
      limitMB: 1000,
      usagePercent: Math.round((totalSize / (1000 * 1024 * 1024)) * 100),
      breakdown,
      oldestFiles: allBlobs
        .sort((a, b) => new Date(a.uploadedAt).getTime() - new Date(b.uploadedAt).getTime())
        .slice(0, 5)
        .map(b => ({ url: b.url.substring(0, 60), sizeMB: (b.size / 1024 / 1024).toFixed(1), date: b.uploadedAt })),
    });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Failed" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, keepRecent } = body;

    if (action === "cleanup") {
      // Delete old files, keep the most recent ones
      const keepCount = keepRecent || 20;
      let cursor: string | undefined;
      const allBlobs: Array<{ url: string; size: number; uploadedAt: Date }> = [];

      do {
        const result = await list({ cursor, limit: 1000 });
        allBlobs.push(...result.blobs);
        cursor = result.hasMore ? result.cursor : undefined;
      } while (cursor);

      // Sort by date, oldest first
      allBlobs.sort((a, b) => new Date(a.uploadedAt).getTime() - new Date(b.uploadedAt).getTime());

      // Delete all except the most recent `keepCount`
      const toDelete = allBlobs.slice(0, Math.max(0, allBlobs.length - keepCount));
      let deletedCount = 0;
      let freedBytes = 0;

      for (const blob of toDelete) {
        try {
          await del(blob.url);
          deletedCount++;
          freedBytes += blob.size;
        } catch {
          // Skip failed deletes
        }
      }

      return Response.json({
        action: "cleanup",
        deletedFiles: deletedCount,
        freedMB: Math.round(freedBytes / 1024 / 1024 * 10) / 10,
        remainingFiles: allBlobs.length - deletedCount,
      });
    }

    if (action === "delete-all") {
      let cursor: string | undefined;
      let deletedCount = 0;
      let freedBytes = 0;

      do {
        const result = await list({ cursor, limit: 100 });
        for (const blob of result.blobs) {
          try {
            await del(blob.url);
            deletedCount++;
            freedBytes += blob.size;
          } catch {}
        }
        cursor = result.hasMore ? result.cursor : undefined;
      } while (cursor);

      return Response.json({
        action: "delete-all",
        deletedFiles: deletedCount,
        freedMB: Math.round(freedBytes / 1024 / 1024 * 10) / 10,
      });
    }

    return Response.json({ error: "Unknown action. Use 'cleanup' or 'delete-all'" }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Failed" }, { status: 500 });
  }
}

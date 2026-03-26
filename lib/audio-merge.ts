import { put } from "@vercel/blob";
import { execSync } from "child_process";
import { writeFileSync, readFileSync, unlinkSync, existsSync, mkdirSync, chmodSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

// Small static ffmpeg build (~30MB) for Linux x86_64
const FFMPEG_URL = "https://github.com/eugeneware/ffmpeg-static/releases/download/b6.0/ffmpeg-linux-x64";
const FFMPEG_BIN_PATH = join(tmpdir(), "ffmpeg");

/**
 * Download and cache a static ffmpeg binary to /tmp.
 * /tmp persists across warm invocations of the same Lambda instance.
 */
async function ensureFfmpeg(): Promise<string> {
  if (existsSync(FFMPEG_BIN_PATH)) {
    console.log("[AudioMerge] ffmpeg cached in /tmp");
    return FFMPEG_BIN_PATH;
  }

  // Try system ffmpeg first (some environments have it)
  try {
    execSync("ffmpeg -version", { timeout: 5000, stdio: "pipe" });
    console.log("[AudioMerge] System ffmpeg available");
    return "ffmpeg";
  } catch {}

  console.log("[AudioMerge] Downloading static ffmpeg binary...");
  try {
    const res = await fetch(FFMPEG_URL, { redirect: "follow" });
    if (!res.ok) throw new Error(`Download failed: ${res.status}`);
    const buffer = Buffer.from(await res.arrayBuffer());
    writeFileSync(FFMPEG_BIN_PATH, buffer);
    chmodSync(FFMPEG_BIN_PATH, 0o755);
    console.log(`[AudioMerge] ffmpeg downloaded: ${(buffer.length / 1024 / 1024).toFixed(1)}MB`);

    // Verify it runs
    execSync(`"${FFMPEG_BIN_PATH}" -version`, { timeout: 5000, stdio: "pipe" });
    console.log("[AudioMerge] ffmpeg verified working");
    return FFMPEG_BIN_PATH;
  } catch (err) {
    console.error("[AudioMerge] ffmpeg download/verify failed:", err);
    throw new Error("No ffmpeg available");
  }
}

/**
 * Merge voiceover audio into a video file.
 *
 * Pipeline:
 * 1. Download video + audio to /tmp
 * 2. Run ffmpeg to strip original audio and merge voiceover
 * 3. Upload merged video to Vercel Blob
 */
export async function mergeAudioWithVideo(
  videoUrl: string,
  audioUrl: string,
  outputFilename: string
): Promise<{ mergedUrl: string; durationSeconds: number; merged: boolean }> {
  const workDir = join(tmpdir(), `merge-${Date.now()}`);

  console.log("[AudioMerge] Starting merge pipeline...");

  try {
    const ffmpegPath = await ensureFfmpeg();

    if (!existsSync(workDir)) mkdirSync(workDir, { recursive: true });
    const videoPath = join(workDir, "input.mp4");
    const audioPath = join(workDir, "voice.mp3");
    const outputPath = join(workDir, "output.mp4");

    // Download video
    console.log("[AudioMerge] Downloading video...");
    const videoRes = await fetch(videoUrl);
    if (!videoRes.ok) throw new Error(`Video download failed: ${videoRes.status}`);
    writeFileSync(videoPath, Buffer.from(await videoRes.arrayBuffer()));

    // Download audio
    console.log("[AudioMerge] Downloading voiceover...");
    const audioRes = await fetch(audioUrl);
    if (!audioRes.ok) throw new Error(`Audio download failed: ${audioRes.status}`);
    const audioBuf = Buffer.from(await audioRes.arrayBuffer());
    writeFileSync(audioPath, audioBuf);

    if (audioBuf.length < 500) {
      throw new Error(`Audio too small: ${audioBuf.length} bytes`);
    }

    // Merge: strip original audio, add voiceover
    const cmd = `"${ffmpegPath}" -i "${videoPath}" -i "${audioPath}" -c:v copy -c:a aac -map 0:v:0 -map 1:a:0 -shortest -y "${outputPath}" 2>&1`;
    console.log(`[AudioMerge] Running: ${cmd}`);

    try {
      execSync(cmd, { timeout: 120000 });
    } catch {
      // Fallback: simpler command
      console.log("[AudioMerge] Trying simpler merge...");
      execSync(
        `"${ffmpegPath}" -i "${videoPath}" -i "${audioPath}" -shortest -y "${outputPath}" 2>&1`,
        { timeout: 120000 }
      );
    }

    if (!existsSync(outputPath)) throw new Error("No output file produced");
    const outputBuf = readFileSync(outputPath);
    if (outputBuf.length < 5000) throw new Error(`Output too small: ${outputBuf.length}`);

    console.log(`[AudioMerge] Merged output: ${outputBuf.length} bytes`);

    // Upload to Blob
    const blob = await put(
      `generated-videos/${outputFilename}.mp4`,
      outputBuf,
      { access: "public", contentType: "video/mp4" }
    );

    console.log(`[AudioMerge] SUCCESS: ${blob.url}`);
    return { mergedUrl: blob.url, durationSeconds: 10, merged: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Merge failed";
    console.error(`[AudioMerge] FAILED: ${msg}`);
    // Return original video — don't block posting
    return { mergedUrl: videoUrl, durationSeconds: 10, merged: false };
  } finally {
    // Cleanup work dir
    try {
      for (const f of ["input.mp4", "voice.mp3", "output.mp4"]) {
        const p = join(workDir, f);
        if (existsSync(p)) unlinkSync(p);
      }
    } catch {}
  }
}

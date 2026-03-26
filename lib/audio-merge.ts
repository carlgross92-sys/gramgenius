import { put } from "@vercel/blob";
import { execSync } from "child_process";
import { writeFileSync, readFileSync, unlinkSync, existsSync, mkdirSync, chmodSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

// URL to a static ffmpeg build for Linux x86_64 (Vercel runs Amazon Linux)
const FFMPEG_URL = "https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-amd64-static.tar.xz";
const FFMPEG_BIN_PATH = join(tmpdir(), "ffmpeg-bin", "ffmpeg");

/**
 * Download and cache a static ffmpeg binary to /tmp.
 * /tmp persists across warm invocations of the same Lambda instance.
 */
async function ensureFfmpeg(): Promise<string> {
  if (existsSync(FFMPEG_BIN_PATH)) {
    console.log("[AudioMerge] ffmpeg already cached in /tmp");
    return FFMPEG_BIN_PATH;
  }

  console.log("[AudioMerge] Downloading static ffmpeg binary...");
  const binDir = join(tmpdir(), "ffmpeg-bin");
  if (!existsSync(binDir)) mkdirSync(binDir, { recursive: true });

  try {
    // Download the tar.xz archive
    const archivePath = join(binDir, "ffmpeg.tar.xz");
    const res = await fetch(FFMPEG_URL);
    if (!res.ok) throw new Error(`Download failed: ${res.status}`);
    const buffer = Buffer.from(await res.arrayBuffer());
    writeFileSync(archivePath, buffer);
    console.log(`[AudioMerge] Downloaded: ${buffer.length} bytes`);

    // Extract just the ffmpeg binary
    execSync(
      `cd "${binDir}" && tar -xf ffmpeg.tar.xz --wildcards '*/ffmpeg' --strip-components=1`,
      { timeout: 30000, stdio: "pipe" }
    );

    if (existsSync(FFMPEG_BIN_PATH)) {
      chmodSync(FFMPEG_BIN_PATH, 0o755);
      console.log("[AudioMerge] ffmpeg extracted and ready");

      // Clean up archive
      try { unlinkSync(archivePath); } catch {}

      return FFMPEG_BIN_PATH;
    }

    throw new Error("ffmpeg binary not found after extraction");
  } catch (downloadErr) {
    console.error("[AudioMerge] Static ffmpeg download failed:", downloadErr);

    // Fallback: try system ffmpeg (works on some platforms)
    try {
      execSync("ffmpeg -version", { timeout: 5000, stdio: "pipe" });
      console.log("[AudioMerge] Using system ffmpeg");
      return "ffmpeg";
    } catch {
      throw new Error("No ffmpeg available — cannot merge audio");
    }
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

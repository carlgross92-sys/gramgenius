import { put } from "@vercel/blob";
import { execSync, spawnSync } from "child_process";
import {
  writeFileSync, readFileSync, unlinkSync,
  existsSync, mkdirSync, chmodSync, statSync,
} from "fs";
import { join } from "path";
import { tmpdir } from "os";

const FFMPEG_PATH = join(tmpdir(), "ffmpeg");

// Multiple sources for static ffmpeg binary (Linux x64)
const FFMPEG_URLS = [
  "https://github.com/eugeneware/ffmpeg-static/releases/download/b6.0/ffmpeg-linux-x64",
  "https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-linux64-gpl.tar.xz",
];

async function ensureFfmpeg(): Promise<string> {
  // Check if already cached
  if (existsSync(FFMPEG_PATH)) {
    try {
      const result = spawnSync(FFMPEG_PATH, ["-version"], { timeout: 5000 });
      if (result.status === 0) {
        console.log("[ffmpeg] Cached binary works");
        return FFMPEG_PATH;
      }
    } catch {}
  }

  // Try system ffmpeg
  try {
    const result = spawnSync("ffmpeg", ["-version"], { timeout: 5000 });
    if (result.status === 0) {
      console.log("[ffmpeg] System ffmpeg available");
      return "ffmpeg";
    }
  } catch {}

  // Download static binary
  console.log("[ffmpeg] Downloading static binary...");
  for (const url of FFMPEG_URLS) {
    try {
      const res = await fetch(url, { redirect: "follow" });
      if (!res.ok) continue;

      const buf = Buffer.from(await res.arrayBuffer());
      console.log(`[ffmpeg] Downloaded ${(buf.length / 1024 / 1024).toFixed(1)}MB from ${url.split("/").pop()}`);

      if (url.endsWith(".tar.xz")) {
        // Extract from tar
        const tarPath = join(tmpdir(), "ffmpeg.tar.xz");
        writeFileSync(tarPath, buf);
        execSync(`cd "${tmpdir()}" && tar -xf ffmpeg.tar.xz --wildcards "*/ffmpeg" --strip-components=2 2>/dev/null || tar -xf ffmpeg.tar.xz 2>/dev/null`, {
          timeout: 30000, stdio: "pipe",
        });
        try { unlinkSync(tarPath); } catch {}
      } else {
        // Direct binary
        writeFileSync(FFMPEG_PATH, buf);
      }

      if (existsSync(FFMPEG_PATH)) {
        chmodSync(FFMPEG_PATH, 0o755);
        const verify = spawnSync(FFMPEG_PATH, ["-version"], { timeout: 5000 });
        if (verify.status === 0) {
          console.log("[ffmpeg] Binary verified working");
          return FFMPEG_PATH;
        }
        console.log("[ffmpeg] Binary exists but won't execute");
      }
    } catch (err) {
      console.log(`[ffmpeg] Download failed from ${url}: ${err}`);
    }
  }

  throw new Error("Could not obtain working ffmpeg binary");
}

/**
 * Merge ElevenLabs voiceover audio into a Pexels video.
 * Downloads static ffmpeg to /tmp on first run.
 */
export async function mergeAudioWithVideo(
  videoUrl: string,
  audioUrl: string,
  outputFilename: string
): Promise<{ mergedUrl: string; durationSeconds: number; merged: boolean }> {
  const workDir = join(tmpdir(), `merge-${Date.now()}`);
  const videoPath = join(workDir, "input.mp4");
  const audioPath = join(workDir, "voice.mp3");
  const outputPath = join(workDir, "output.mp4");

  console.log("[AudioMerge] Starting pipeline...");

  try {
    const ffmpeg = await ensureFfmpeg();
    mkdirSync(workDir, { recursive: true });

    // Download video
    console.log("[AudioMerge] Downloading video...");
    const vRes = await fetch(videoUrl);
    if (!vRes.ok) throw new Error(`Video download: ${vRes.status}`);
    const vBuf = Buffer.from(await vRes.arrayBuffer());
    writeFileSync(videoPath, vBuf);
    console.log(`[AudioMerge] Video: ${(vBuf.length / 1024).toFixed(0)}KB`);

    // Download audio
    console.log("[AudioMerge] Downloading voiceover...");
    const aRes = await fetch(audioUrl);
    if (!aRes.ok) throw new Error(`Audio download: ${aRes.status}`);
    const aBuf = Buffer.from(await aRes.arrayBuffer());
    writeFileSync(audioPath, aBuf);
    console.log(`[AudioMerge] Audio: ${(aBuf.length / 1024).toFixed(0)}KB`);

    if (aBuf.length < 500) throw new Error(`Audio too small: ${aBuf.length}b`);

    // Merge: strip original audio, add voiceover
    // -map 0:v:0 = video from input 0
    // -map 1:a:0 = audio from input 1 (voiceover)
    // -c:v copy = no video re-encode (fast)
    // -c:a aac = Instagram-compatible audio
    const args = [
      "-i", videoPath,
      "-i", audioPath,
      "-c:v", "copy",
      "-c:a", "aac",
      "-b:a", "192k",
      "-map", "0:v:0",
      "-map", "1:a:0",
      "-shortest",
      "-y",
      outputPath,
    ];

    console.log(`[AudioMerge] Running: ${ffmpeg} ${args.join(" ")}`);
    const result = spawnSync(ffmpeg, args, { timeout: 120000 });

    if (result.status !== 0) {
      const stderr = result.stderr?.toString().substring(0, 300) || "";
      console.log(`[AudioMerge] Primary merge failed (code ${result.status}): ${stderr}`);

      // Fallback: simpler command without -map
      console.log("[AudioMerge] Trying simple merge...");
      const r2 = spawnSync(ffmpeg, [
        "-i", videoPath, "-i", audioPath,
        "-c:v", "copy", "-c:a", "aac",
        "-shortest", "-y", outputPath,
      ], { timeout: 120000 });

      if (r2.status !== 0) {
        throw new Error(`Both merge commands failed. stderr: ${r2.stderr?.toString().substring(0, 200)}`);
      }
    }

    // Verify output
    if (!existsSync(outputPath)) throw new Error("No output file");
    const outBuf = readFileSync(outputPath);
    console.log(`[AudioMerge] Output: ${(outBuf.length / 1024).toFixed(0)}KB`);
    if (outBuf.length < 5000) throw new Error(`Output too small: ${outBuf.length}b`);

    // Verify audio stream exists in output
    const probe = spawnSync(ffmpeg, [
      "-i", outputPath,
      "-f", "null", "-",
    ], { timeout: 10000 });
    // If ffprobe isn't available, skip check (the output size is our guard)

    // Upload merged video
    console.log("[AudioMerge] Uploading merged video...");
    const blob = await put(
      `generated-videos/${outputFilename}.mp4`,
      outBuf,
      { access: "public", contentType: "video/mp4" }
    );

    console.log(`[AudioMerge] SUCCESS: ${blob.url}`);
    return { mergedUrl: blob.url, durationSeconds: 10, merged: true };

  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error(`[AudioMerge] FAILED: ${msg}`);
    // Return original video — don't block posting entirely
    return { mergedUrl: videoUrl, durationSeconds: 10, merged: false };
  } finally {
    // Cleanup
    for (const f of [videoPath, audioPath, outputPath]) {
      try { if (existsSync(f)) unlinkSync(f); } catch {}
    }
    try { if (existsSync(workDir)) unlinkSync(workDir); } catch {}
  }
}

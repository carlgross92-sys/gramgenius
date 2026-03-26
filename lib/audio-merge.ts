import { put } from "@vercel/blob";
import { execSync } from "child_process";
import { writeFileSync, readFileSync, unlinkSync, existsSync, mkdirSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

/**
 * Merge voiceover audio into a video file using ffmpeg-static.
 *
 * Pipeline:
 * 1. Download video from Pexels (Vercel Blob URL)
 * 2. Download voiceover MP3 from ElevenLabs (Vercel Blob URL)
 * 3. Use ffmpeg to strip original audio and merge voiceover
 * 4. Upload merged video to Vercel Blob
 * 5. Return merged video URL
 */
export async function mergeAudioWithVideo(
  videoUrl: string,
  audioUrl: string,
  outputFilename: string
): Promise<{ mergedUrl: string; durationSeconds: number }> {
  const workDir = join(tmpdir(), `gramgenius-merge-${Date.now()}`);

  console.log("[AudioMerge] Starting audio merge pipeline...");
  console.log("[AudioMerge] Video URL:", videoUrl.substring(0, 80));
  console.log("[AudioMerge] Audio URL:", audioUrl.substring(0, 80));

  try {
    // Create work directory
    if (!existsSync(workDir)) mkdirSync(workDir, { recursive: true });

    const videoPath = join(workDir, "input.mp4");
    const audioPath = join(workDir, "voiceover.mp3");
    const outputPath = join(workDir, "output.mp4");

    // Step 1: Download video
    console.log("[AudioMerge] Downloading video...");
    const videoRes = await fetch(videoUrl);
    if (!videoRes.ok) throw new Error(`Video download failed: ${videoRes.status}`);
    const videoBuffer = Buffer.from(await videoRes.arrayBuffer());
    writeFileSync(videoPath, videoBuffer);
    console.log(`[AudioMerge] Video saved: ${videoBuffer.length} bytes`);

    // Step 2: Download audio
    console.log("[AudioMerge] Downloading voiceover...");
    const audioRes = await fetch(audioUrl);
    if (!audioRes.ok) throw new Error(`Audio download failed: ${audioRes.status}`);
    const audioBuffer = Buffer.from(await audioRes.arrayBuffer());
    writeFileSync(audioPath, audioBuffer);
    console.log(`[AudioMerge] Audio saved: ${audioBuffer.length} bytes`);

    // Validate audio
    if (audioBuffer.length < 1000) {
      throw new Error(`Audio file too small (${audioBuffer.length} bytes)`);
    }

    // Step 3: Get ffmpeg binary path
    let ffmpegPath: string;
    try {
      ffmpegPath = require("ffmpeg-static") as string;
    } catch {
      // Fallback: try system ffmpeg
      ffmpegPath = "ffmpeg";
    }
    console.log(`[AudioMerge] Using ffmpeg: ${ffmpegPath}`);

    // Step 4: Run ffmpeg merge
    // -i input.mp4 = video input
    // -i voiceover.mp3 = audio input
    // -c:v copy = copy video stream without re-encoding
    // -c:a aac = encode audio as AAC (Instagram compatible)
    // -map 0:v:0 = use video from first input
    // -map 1:a:0 = use audio from second input (voiceover)
    // -shortest = match to shorter duration
    // -y = overwrite output
    const cmd = `"${ffmpegPath}" -i "${videoPath}" -i "${audioPath}" -c:v copy -c:a aac -map 0:v:0 -map 1:a:0 -shortest -y "${outputPath}"`;

    console.log(`[AudioMerge] Command: ${cmd}`);

    try {
      const result = execSync(cmd, { timeout: 120000, stdio: "pipe" });
      console.log("[AudioMerge] Primary merge succeeded");
    } catch (execErr: unknown) {
      const stderr = (execErr as { stderr?: Buffer })?.stderr?.toString() || "";
      console.error("[AudioMerge] Primary failed:", stderr.substring(0, 500));
      // Try without -map flags (simpler merge)
      console.log("[AudioMerge] Trying simple merge (no -map)...");
      try {
        const simpleCmd = `"${ffmpegPath}" -i "${videoPath}" -i "${audioPath}" -c:v copy -c:a aac -shortest -y "${outputPath}"`;
        execSync(simpleCmd, { timeout: 120000, stdio: "pipe" });
        console.log("[AudioMerge] Simple merge succeeded");
      } catch (simpleErr: unknown) {
        const stderr2 = (simpleErr as { stderr?: Buffer })?.stderr?.toString() || "";
        console.error("[AudioMerge] Simple also failed:", stderr2.substring(0, 500));
        // Last resort: try with re-encoding video too
        console.log("[AudioMerge] Trying full re-encode...");
        const reencodeCmd = `"${ffmpegPath}" -i "${videoPath}" -i "${audioPath}" -c:v libx264 -c:a aac -shortest -y "${outputPath}"`;
        execSync(reencodeCmd, { timeout: 180000, stdio: "pipe" });
        console.log("[AudioMerge] Re-encode merge succeeded");
      }
    }

    // Step 5: Verify output
    if (!existsSync(outputPath)) {
      throw new Error("ffmpeg produced no output file");
    }

    const outputBuffer = readFileSync(outputPath);
    console.log(`[AudioMerge] Output file: ${outputBuffer.length} bytes`);

    if (outputBuffer.length < 10000) {
      throw new Error(`Output too small (${outputBuffer.length} bytes) — merge likely failed`);
    }

    // Step 6: Upload to Vercel Blob
    console.log("[AudioMerge] Uploading merged video...");
    const blob = await put(
      `generated-videos/${outputFilename}.mp4`,
      outputBuffer,
      { access: "public", contentType: "video/mp4" }
    );
    console.log(`[AudioMerge] SUCCESS: ${blob.url}`);

    // Rough duration estimate
    const durationSeconds = Math.max(5, Math.round(outputBuffer.length / 200000));

    return { mergedUrl: blob.url, durationSeconds };
  } finally {
    // Cleanup temp files
    try {
      const files = ["input.mp4", "voiceover.mp3", "output.mp4"];
      for (const f of files) {
        const p = join(workDir, f);
        if (existsSync(p)) unlinkSync(p);
      }
    } catch { /* cleanup non-critical */ }
  }
}

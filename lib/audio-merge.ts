import { put } from "@vercel/blob";

/**
 * Merge a video file with an audio file (voiceover) using ffmpeg-wasm.
 * Works on Vercel serverless — no native ffmpeg binary needed.
 *
 * Pipeline:
 * 1. Download video from URL
 * 2. Download audio from URL
 * 3. Strip existing audio from video (Pexels videos have ambient sound)
 * 4. Merge ElevenLabs voiceover as the audio track
 * 5. Upload merged video to Vercel Blob
 * 6. Return the merged video URL
 */
export async function mergeAudioWithVideo(
  videoUrl: string,
  audioUrl: string,
  outputFilename: string
): Promise<{ mergedUrl: string; durationSeconds: number }> {
  console.log("[AudioMerge] Starting merge...");
  console.log("[AudioMerge] Video:", videoUrl.substring(0, 80));
  console.log("[AudioMerge] Audio:", audioUrl.substring(0, 80));

  // Dynamic import to avoid issues at build time
  const { FFmpeg } = await import("@ffmpeg/ffmpeg");
  const { fetchFile } = await import("@ffmpeg/util");

  const ffmpeg = new FFmpeg();

  console.log("[AudioMerge] Loading ffmpeg-wasm...");
  await ffmpeg.load();
  console.log("[AudioMerge] ffmpeg-wasm loaded");

  // Step 1: Download video
  console.log("[AudioMerge] Downloading video...");
  const videoData = await fetchFile(videoUrl);
  await ffmpeg.writeFile("input.mp4", videoData);
  console.log(`[AudioMerge] Video downloaded: ${videoData.byteLength} bytes`);

  // Step 2: Download audio
  console.log("[AudioMerge] Downloading audio...");
  const audioData = await fetchFile(audioUrl);
  await ffmpeg.writeFile("voiceover.mp3", audioData);
  console.log(`[AudioMerge] Audio downloaded: ${audioData.byteLength} bytes`);

  // Validate audio size
  if (audioData.byteLength < 1000) {
    throw new Error(
      `Audio file too small (${audioData.byteLength} bytes) — likely empty or corrupt`
    );
  }

  // Step 3: Strip existing audio from video and merge with voiceover
  // -map 0:v:0 = take video stream from first input
  // -map 1:a:0 = take audio stream from second input
  // -c:v copy = don't re-encode video (fast)
  // -c:a aac = encode audio as AAC (Instagram compatible)
  // -shortest = match duration to shorter stream
  console.log("[AudioMerge] Running ffmpeg merge command...");
  console.log(
    '[AudioMerge] Command: ffmpeg -i input.mp4 -i voiceover.mp3 -c:v copy -c:a aac -map 0:v:0 -map 1:a:0 -shortest -y output.mp4'
  );

  await ffmpeg.exec([
    "-i", "input.mp4",
    "-i", "voiceover.mp3",
    "-c:v", "copy",
    "-c:a", "aac",
    "-map", "0:v:0",
    "-map", "1:a:0",
    "-shortest",
    "-y",
    "output.mp4",
  ]);

  console.log("[AudioMerge] ffmpeg merge complete");

  // Step 4: Read output
  const outputData = await ffmpeg.readFile("output.mp4");
  const outputBuffer =
    outputData instanceof Uint8Array
      ? outputData
      : new TextEncoder().encode(outputData as string);

  console.log(`[AudioMerge] Output size: ${outputBuffer.byteLength} bytes`);

  if (outputBuffer.byteLength < 10000) {
    throw new Error(
      `Merged video too small (${outputBuffer.byteLength} bytes) — merge likely failed`
    );
  }

  // Step 5: Upload to Vercel Blob
  console.log("[AudioMerge] Uploading merged video to Blob...");
  const blob = await put(
    `generated-videos/${outputFilename}.mp4`,
    Buffer.from(outputBuffer),
    { access: "public", contentType: "video/mp4" }
  );

  console.log(`[AudioMerge] Merged video uploaded: ${blob.url}`);

  // Estimate duration from video data size (rough: ~1MB per 5 seconds for compressed video)
  const estimatedDuration = Math.max(
    5,
    Math.round(outputBuffer.byteLength / 200000)
  );

  // Cleanup
  try {
    await ffmpeg.deleteFile("input.mp4");
    await ffmpeg.deleteFile("voiceover.mp3");
    await ffmpeg.deleteFile("output.mp4");
  } catch {
    // cleanup is non-critical
  }

  return { mergedUrl: blob.url, durationSeconds: estimatedDuration };
}

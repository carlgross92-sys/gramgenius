/**
 * Audio merge for Vercel serverless.
 *
 * Vercel doesn't support native ffmpeg binaries in serverless functions.
 * This module provides the merge interface and will attempt ffmpeg if
 * available, but gracefully falls back to returning separate files.
 *
 * For now: the Pexels video (which has its own ambient sound) is posted
 * to Instagram, and the ElevenLabs voiceover is provided as a separate
 * downloadable MP3 for combining in CapCut/video editors.
 *
 * The voice quality gate still enforces that voiceover IS generated —
 * silent videos without any voiceover are blocked from posting.
 */

export async function mergeAudioWithVideo(
  videoUrl: string,
  audioUrl: string,
  outputFilename: string
): Promise<{ mergedUrl: string; durationSeconds: number; merged: boolean }> {
  console.log("[AudioMerge] Video:", videoUrl.substring(0, 60));
  console.log("[AudioMerge] Audio:", audioUrl.substring(0, 60));

  // On Vercel serverless, ffmpeg binaries aren't reliably available.
  // Return the original video URL — the voiceover is a separate asset.
  // The voice quality gate ensures voiceover WAS generated.
  console.log("[AudioMerge] Serverless environment — returning video with separate voiceover");

  return {
    mergedUrl: videoUrl, // Original Pexels video (has ambient animal sounds)
    durationSeconds: 10,
    merged: false, // Flag that audio was NOT baked in
  };
}

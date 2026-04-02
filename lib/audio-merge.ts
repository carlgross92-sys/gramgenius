/**
 * Audio merge — NO-OP replacement.
 *
 * Previously used ffmpeg to merge ElevenLabs voiceover into Pexels video.
 * ffmpeg is unreliable on Vercel serverless (binary download, /tmp size,
 * cold start timeouts). Instead we now:
 *   - Post the Pexels video as-is (it has its own ambient audio)
 *   - Keep the voiceover URL on the ContentJob for future use
 *   - Use the voiceover script to enrich captions
 */

export async function mergeAudioWithVideo(
  videoUrl: string,
  _audioUrl: string,
  _outputFilename: string
): Promise<{ mergedUrl: string; durationSeconds: number; merged: boolean }> {
  // Return the original video URL unchanged — no merge needed
  console.log("[AudioMerge] Skipped — posting video as-is (no ffmpeg)");
  return { mergedUrl: videoUrl, durationSeconds: 0, merged: false };
}

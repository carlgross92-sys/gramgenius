/**
 * Audio merge — NO-OP.
 * Videos post as-is from Pexels. Voiceover stored separately.
 */
export async function mergeAudioWithVideo(
  videoUrl: string,
  _audioUrl: string,
  _outputFilename: string
): Promise<{ mergedUrl: string; durationSeconds: number; merged: boolean }> {
  return { mergedUrl: videoUrl, durationSeconds: 0, merged: false };
}

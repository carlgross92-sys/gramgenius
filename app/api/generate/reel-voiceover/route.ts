import { NextRequest } from "next/server";
import { textToSpeech, saveAudio } from "@/lib/elevenlabs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { scenes } = body;

    if (!scenes || !Array.isArray(scenes) || scenes.length === 0) {
      return Response.json(
        { error: "Missing required field: scenes (array with voiceoverLine)" },
        { status: 400 }
      );
    }

    const voiceoverLines = scenes
      .map(
        (scene: { voiceoverLine: string }) => scene.voiceoverLine
      )
      .filter(Boolean);

    if (voiceoverLines.length === 0) {
      return Response.json(
        { error: "No voiceover lines found in scenes" },
        { status: 400 }
      );
    }

    const fullScript = voiceoverLines.join(" ... ");

    let audioBuffer: Buffer;
    try {
      audioBuffer = await textToSpeech(fullScript);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "unknown";
      return Response.json({ error: `ElevenLabs TTS failed: ${msg}` }, { status: 500 });
    }

    let voiceoverUrl: string;
    try {
      voiceoverUrl = await saveAudio(audioBuffer);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "unknown";
      return Response.json({ error: `Blob upload failed: ${msg}`, bufferSize: audioBuffer.length }, { status: 500 });
    }

    return Response.json({ voiceoverUrl });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Failed to generate voiceover:", message);
    return Response.json(
      { error: `Failed to generate voiceover: ${message}` },
      { status: 500 }
    );
  }
}

import { put } from "@vercel/blob";
import { v4 as uuidv4 } from "uuid";

const ELEVENLABS_BASE = "https://api.elevenlabs.io/v1";

export async function textToSpeech(
  text: string,
  voiceId?: string
): Promise<Buffer> {
  const vid = voiceId || process.env.ELEVENLABS_VOICE_ID;
  if (!vid) throw new Error("No ElevenLabs voice ID configured");

  const response = await fetch(`${ELEVENLABS_BASE}/text-to-speech/${vid}`, {
    method: "POST",
    headers: {
      "xi-api-key": process.env.ELEVENLABS_API_KEY || "",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text,
      model_id: "eleven_multilingual_v2",
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75,
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`ElevenLabs API error: ${response.status} - ${error}`);
  }

  return Buffer.from(await response.arrayBuffer());
}

export async function saveAudio(
  buffer: Buffer,
  filename?: string
): Promise<string> {
  const fname = filename || `${uuidv4()}.mp3`;

  const blob = await put(`generated-audio/${fname}`, buffer, {
    access: 'public',
    contentType: 'audio/mpeg',
  });

  return blob.url;
}

export async function listVoices(): Promise<
  Array<{ voice_id: string; name: string; category: string }>
> {
  const response = await fetch(`${ELEVENLABS_BASE}/voices`, {
    headers: {
      "xi-api-key": process.env.ELEVENLABS_API_KEY || "",
    },
  });

  if (!response.ok) {
    throw new Error(`ElevenLabs voices error: ${response.status}`);
  }

  const data = await response.json();
  return data.voices;
}

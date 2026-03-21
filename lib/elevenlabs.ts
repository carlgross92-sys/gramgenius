import { put } from "@vercel/blob";
import { v4 as uuidv4 } from "uuid";

const ELEVENLABS_BASE = "https://api.elevenlabs.io/v1";

export async function checkCredits(): Promise<number> {
  try {
    const response = await fetch(`${ELEVENLABS_BASE}/user`, {
      headers: { "xi-api-key": process.env.ELEVENLABS_API_KEY || "" },
    });
    if (!response.ok) return 0;
    const data = await response.json();
    return data.subscription?.character_count_remaining || 0;
  } catch {
    return 0;
  }
}

export async function textToSpeech(
  text: string,
  voiceId?: string
): Promise<Buffer> {
  const vid = voiceId || process.env.ELEVENLABS_VOICE_ID;
  if (!vid) throw new Error("No ElevenLabs voice ID configured");

  // Truncate to 350 chars to conserve credits
  const truncated = text.length > 350 ? text.substring(0, 347) + "..." : text;

  const response = await fetch(`${ELEVENLABS_BASE}/text-to-speech/${vid}`, {
    method: "POST",
    headers: {
      "xi-api-key": process.env.ELEVENLABS_API_KEY || "",
      "Content-Type": "application/json",
      Accept: "audio/mpeg",
    },
    body: JSON.stringify({
      text: truncated,
      model_id: "eleven_multilingual_v2",
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75,
        style: 0.5,
        use_speaker_boost: true,
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
  const fname = filename || `voiceover-${uuidv4()}.mp3`;
  const blob = await put(`generated-audio/${fname}`, buffer, {
    access: "public",
    contentType: "audio/mpeg",
  });
  return blob.url;
}

export async function generateVoiceover(
  script: string,
  maxChars: number = 350
): Promise<{ url: string | null; error: string | null; creditsUsed: number }> {
  const truncated =
    script.length > maxChars
      ? script.substring(0, maxChars - 3) + "..."
      : script;

  const remaining = await checkCredits();
  if (remaining < truncated.length) {
    return {
      url: null,
      error: `ElevenLabs quota low (${remaining} remaining, need ${truncated.length}). Upgrade at elevenlabs.io/subscription`,
      creditsUsed: 0,
    };
  }

  try {
    const buffer = await textToSpeech(truncated);
    const url = await saveAudio(buffer);
    return { url, error: null, creditsUsed: truncated.length };
  } catch (err) {
    return {
      url: null,
      error: err instanceof Error ? err.message : "Voiceover failed",
      creditsUsed: 0,
    };
  }
}

export function generateVoiceoverScript(
  topic: string,
  caption: string,
  animal: string
): string {
  const templates = [
    `Wait... is that ${animal} really doing that right now? I cannot believe what I'm seeing! Tag someone who acts just like this!`,
    `POV: Your ${animal} has absolutely zero shame and we love them for it! Drop a comment if your pet does this too!`,
    `Nobody asked but your ${animal} is out here living their best life and honestly? Goals. Double tap if you relate!`,
    `This ${animal} said: I do what I want, when I want. And honestly? We respect it. Follow for more chaos!`,
    `Breaking news: Local ${animal} caught in the act again. Witnesses say it was hilarious. More at eleven.`,
  ];
  return templates[Math.floor(Math.random() * templates.length)].substring(
    0,
    340
  );
}

export async function listVoices(): Promise<
  Array<{ voice_id: string; name: string; category: string }>
> {
  const response = await fetch(`${ELEVENLABS_BASE}/voices`, {
    headers: { "xi-api-key": process.env.ELEVENLABS_API_KEY || "" },
  });
  if (!response.ok) throw new Error(`ElevenLabs voices error: ${response.status}`);
  const data = await response.json();
  return data.voices;
}

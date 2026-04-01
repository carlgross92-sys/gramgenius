import { put } from "@vercel/blob";
import { v4 as uuidv4 } from "uuid";

const ELEVENLABS_BASE = "https://api.elevenlabs.io/v1";

export async function checkCredits(): Promise<number> {
  try {
    const response = await fetch(`${ELEVENLABS_BASE}/user/subscription`, {
      headers: { "xi-api-key": process.env.ELEVENLABS_API_KEY || "" },
    });
    if (!response.ok) {
      console.warn("[ElevenLabs] Credit check failed, attempting TTS anyway");
      return 500; // Assume some credits
    }
    const data = await response.json();
    const limit = data.character_limit || 0;
    const used = data.character_count || 0;
    const remaining = Math.max(0, limit - used);
    console.log(`[ElevenLabs] Credits: ${remaining} remaining (${used}/${limit})`);
    return remaining;
  } catch {
    console.warn("[ElevenLabs] Credit check exception, attempting TTS anyway");
    return 500;
  }
}

export async function textToSpeech(
  text: string,
  voiceId?: string
): Promise<Buffer> {
  const vid = voiceId || process.env.ELEVENLABS_VOICE_ID;
  if (!vid) throw new Error("No ElevenLabs voice ID configured");

  // Hard limit 100 chars to minimize credit usage
  const truncated = text.length > 100 ? text.substring(0, 97) + "..." : text;

  const response = await fetch(`${ELEVENLABS_BASE}/text-to-speech/${vid}`, {
    method: "POST",
    headers: {
      "xi-api-key": process.env.ELEVENLABS_API_KEY || "",
      "Content-Type": "application/json",
      Accept: "audio/mpeg",
    },
    body: JSON.stringify({
      text: truncated,
      model_id: "eleven_turbo_v2_5",
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
  // Pre-written templates under 60 chars each — deterministic by topic hash
  const templates = [
    "This animal has zero regrets. Absolutely iconic.",
    "Nobody told them the rules. We respect it.",
    "Living rent free and thriving. Goals honestly.",
    "The confidence is unmatched. Tag a friend.",
    "POV your pet owns the house. You just pay rent.",
    "When they know exactly what they are doing.",
    "This energy. This is the content we needed.",
    "Caught in the act and not even sorry about it.",
    "The audacity. The nerve. The absolute legend.",
    "Main character behavior and we are here for it.",
  ];
  // Deterministic: same topic always gets same template
  let hash = 0;
  for (let i = 0; i < topic.length; i++) hash = ((hash << 5) - hash + topic.charCodeAt(i)) | 0;
  return templates[Math.abs(hash) % templates.length];
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

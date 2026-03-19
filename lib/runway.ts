import { put } from "@vercel/blob";
import { v4 as uuidv4 } from "uuid";

const RUNWAY_BASE = "https://api.dev.runwayml.com/v1";
const RUNWAY_VERSION = "2024-11-06";

function getHeaders() {
  return {
    Authorization: `Bearer ${process.env.RUNWAYML_API_KEY}`,
    "X-Runway-Version": RUNWAY_VERSION,
    "Content-Type": "application/json",
  };
}

export async function imageToVideo(
  imageUrl: string,
  promptText: string,
  duration: 5 | 10 = 10,
  ratio: string = "1080:1920"
): Promise<string> {
  const response = await fetch(`${RUNWAY_BASE}/image_to_video`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({
      model: "gen4_turbo",
      promptImage: imageUrl,
      promptText,
      ratio,
      duration,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Runway API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return data.id;
}

export async function textToVideo(
  promptText: string,
  duration: number = 10,
  ratio: string = "1080:1920"
): Promise<string> {
  const response = await fetch(`${RUNWAY_BASE}/text_to_video`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({
      model: "gen4_turbo",
      promptText,
      ratio,
      duration,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Runway text-to-video error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return data.id;
}

export async function pollTask(
  taskId: string,
  timeoutMs: number = 300000
): Promise<{ status: string; outputUrl?: string }> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    const response = await fetch(`${RUNWAY_BASE}/tasks/${taskId}`, {
      headers: getHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Runway poll error: ${response.status}`);
    }

    const data = await response.json();

    if (data.status === "SUCCEEDED") {
      return { status: "SUCCEEDED", outputUrl: data.output?.[0] };
    }
    if (data.status === "FAILED") {
      throw new Error(`Runway task failed: ${data.failure || "Unknown error"}`);
    }

    // Wait 3 seconds before polling again
    await new Promise((resolve) => setTimeout(resolve, 3000));
  }

  throw new Error("Runway task timed out after 5 minutes");
}

export async function downloadVideo(
  outputUrl: string,
  filename?: string
): Promise<string> {
  const response = await fetch(outputUrl);
  const buffer = Buffer.from(await response.arrayBuffer());
  const fname = filename || `${uuidv4()}.mp4`;

  const blob = await put(`generated-videos/${fname}`, buffer, {
    access: 'public',
    contentType: 'video/mp4',
  });

  return blob.url;
}

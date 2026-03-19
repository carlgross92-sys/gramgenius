import OpenAI from "openai";
import { put } from "@vercel/blob";
import { v4 as uuidv4 } from "uuid";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function generateImage(
  prompt: string,
  size: "1024x1024" | "1024x1792" | "1792x1024" = "1024x1792",
  quality: "standard" | "hd" = "hd",
  style: "vivid" | "natural" = "vivid"
): Promise<{ imageUrl: string; revisedPrompt: string }> {
  const response = await openai.images.generate({
    model: "dall-e-3",
    prompt,
    n: 1,
    size,
    quality,
    style,
  });

  const dalleUrl = response.data?.[0]?.url;
  if (!dalleUrl) throw new Error("DALL-E did not return an image URL");
  const revisedPrompt = response.data?.[0]?.revised_prompt || prompt;

  // Download and upload to Vercel Blob
  const imageResponse = await fetch(dalleUrl);
  const buffer = Buffer.from(await imageResponse.arrayBuffer());
  const filename = `${uuidv4()}.png`;

  const blob = await put(`generated-images/${filename}`, buffer, {
    access: 'public',
    contentType: 'image/png',
  });

  return {
    imageUrl: blob.url,
    revisedPrompt,
  };
}

export default openai;

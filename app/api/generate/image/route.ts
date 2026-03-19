import { NextRequest } from "next/server";
import { generateWithClaude } from "@/lib/anthropic";
import { generateImage } from "@/lib/openai";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prompt, brandNiche, style } = body;

    if (!prompt || !brandNiche) {
      return Response.json(
        { error: "Missing required fields: prompt, brandNiche" },
        { status: 400 }
      );
    }

    const systemPrompt = `You are an expert visual art director specializing in Instagram content for the ${brandNiche} niche.

Your job is to transform a basic image idea into a detailed, DALL-E optimized prompt that will produce a stunning, professional Instagram image.

Rules:
- Output ONLY the enhanced prompt text, nothing else
- Make it detailed with lighting, composition, color palette, mood
- Always specify: "no text, no words, no letters, no watermarks"
- Ensure the style is appropriate for ${brandNiche} brands
- Keep it under 900 characters
- Make it photorealistic or high-quality illustration as appropriate
${style ? `- Apply this visual style: ${style}` : ""}`;

    const enhancedPrompt = await generateWithClaude(
      systemPrompt,
      `Enhance this image prompt for Instagram: ${prompt}`,
      500
    );

    const result = await generateImage(
      enhancedPrompt,
      "1024x1792",
      "hd",
      style ?? "vivid"
    );

    return Response.json({ imageUrl: result.imageUrl, enhancedPrompt });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Failed to generate image:", message);
    return Response.json(
      { error: `Failed to generate image: ${message}` },
      { status: 500 }
    );
  }
}

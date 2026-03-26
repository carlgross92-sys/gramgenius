export type ReelStyle = "funny" | "inspirational" | "educational" | "dramatic";

export interface PromptContext {
  brandName: string;
  brandHandle: string;
  niche: string;
  pillar: string;
  brandVoice: string;
  reelStyle: ReelStyle;
  topic: string;
  targetAudience: string;
}

export function getPillarScenario(pillar: string): string {
  const p = pillar.toLowerCase();

  if (p.includes("funny") || p.includes("fail")) {
    return "A dog or cat reacts in a completely unexpected and chaotic way to an everyday object. Chaos ensues. Comedy timing is everything.";
  }
  if (p.includes("cute") || p.includes("reaction")) {
    return "An animal's face shows an hilariously dramatic or confused expression in response to something simple.";
  }
  if (p.includes("wild")) {
    return "A wildlife moment that goes completely off script — an animal does something nobody expected.";
  }
  if (p.includes("baby")) {
    return "A baby animal experiencing something for the first time with adorable clumsiness.";
  }
  if (p.includes("human")) {
    return "An animal perfectly mimicking human behavior in an uncanny and hilarious way.";
  }

  return "An animal does something unexpected that makes the viewer laugh or say aww.";
}

export function buildVideoPrompt(ctx: PromptContext): string {
  const scenario = getPillarScenario(ctx.pillar);

  switch (ctx.reelStyle) {
    case "funny":
      return `Create a fast-paced, vertical 9:16 short-form video for the brand '@${ctx.brandHandle}' (${ctx.brandName}) in the ${ctx.niche} niche. Content pillar: ${ctx.pillar}. Tone: comedic, chaotic, and highly shareable. The video should open with an unexpected or surprising moment that hooks the viewer in the first 2 seconds. Include fast cuts, funny animal or human reactions, and end with a punchline or unexpected twist. The pacing should feel like a viral TikTok — quick, punchy, and impossible to scroll past. Make the viewer want to immediately tag a friend. Humor style: ${ctx.brandVoice}. Specific scenario: ${scenario}. Topic: ${ctx.topic}.`;

    case "inspirational":
      return `Create an uplifting, vertical 9:16 short-form video for '@${ctx.brandHandle}' (${ctx.brandName}). Content pillar: ${ctx.pillar}. Open with a powerful visual moment that immediately resonates emotionally. Use warm tones and cinematic movement. Build to a motivational peak. Tone: bold, proud, and community-driven. End with a clear call to action or shareable message. Brand voice: ${ctx.brandVoice}. Topic: ${ctx.topic}.`;

    case "educational":
      return `Create a clean, engaging vertical 9:16 short-form educational video for '@${ctx.brandHandle}' (${ctx.brandName}). Content pillar: ${ctx.pillar}. Open with a surprising fact or question. Use text overlays and clear visuals. Keep pacing steady but engaging. Tone: ${ctx.brandVoice}. End with a takeaway the viewer will want to save or share. Topic: ${ctx.topic}.`;

    case "dramatic":
      return `Create a high-intensity, cinematic vertical 9:16 short-form video for '@${ctx.brandHandle}' (${ctx.brandName}). Content pillar: ${ctx.pillar}. Open on a tense or emotional moment. Use dramatic music cues, slow motion, and powerful visuals. Build suspense toward a reveal or resolution. Brand voice: ${ctx.brandVoice}. Make the viewer feel something strong. Topic: ${ctx.topic}.`;
  }
}

export function buildCaptionPrompt(ctx: PromptContext): string {
  return `Write a ${ctx.reelStyle} Instagram caption for @${ctx.brandHandle} (${ctx.brandName}). Niche: ${ctx.niche}. Pillar: ${ctx.pillar}. Voice: ${ctx.brandVoice}. Audience: ${ctx.targetAudience}. Topic: ${ctx.topic}. Include a scroll-stopping hook in line 1, keep it under 200 words, add a CTA, use 1-3 emojis. NO hashtags.`;
}

export function buildVoiceoverPrompt(ctx: PromptContext): string {
  return `Write a short ${ctx.reelStyle} voiceover script (under 80 characters) for a ${ctx.niche} Instagram Reel about: ${ctx.topic}. Voice: ${ctx.brandVoice}. Make it punchy and memorable.`;
}

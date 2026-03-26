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

// ---------------------------------------------------------------------------
// Master prefix — prepended to ALL animal video prompts
// ---------------------------------------------------------------------------

const ANIMAL_VIDEO_PREFIX =
  "Vertical 9:16 short-form video, 1080x1920. An animal-focused comedy clip " +
  "that feels like a viral Instagram Reel. REQUIRED: The animal must be doing " +
  "something active, chaotic, or unexpected — not just walking or sitting still. " +
  "The video must have SOUND — include realistic animal vocalizations (barking, " +
  "meowing, squeaking, chirping, growling) that are loud and clearly audible. " +
  "Include a human reaction if possible (laughter, surprise, shock). Fast cuts. " +
  "The funniest moment must happen before the 3-second mark to hook the viewer.";

// ---------------------------------------------------------------------------
// Pillar-specific scenario prompts
// ---------------------------------------------------------------------------

export function getPillarScenario(pillar: string): string {
  const p = pillar.toLowerCase();

  if (p.includes("funny") || p.includes("fail")) {
    return (
      "A dog or cat attempts something completely ridiculous — jumping and missing, " +
      "stealing food, getting spooked by something harmless. The animal must be LOUD — " +
      "barking, whimpering, or making noises throughout. Fast chaotic energy. Human " +
      "laughing in background. Ends with unexpected fail."
    );
  }
  if (p.includes("cute") || p.includes("reaction")) {
    return (
      "Close-up on an animal's face showing absurdly dramatic expression — confusion, " +
      "disgust, shock. The animal must VOCALIZE. Human voice laughing or commentating. " +
      "Tight close-up shots. Comedic timing."
    );
  }
  if (p.includes("wild")) {
    return (
      "A wildlife moment that completely goes off script. An animal does something " +
      "nobody expected. LOUD ambient animal sounds throughout. Fast paced. Shocking " +
      "or funny moment before 3 seconds."
    );
  }
  if (p.includes("baby")) {
    return (
      "Baby animal experiencing something for the first time with adorable clumsiness. " +
      "Squeaking, chirping, tiny vocalizations. Wholesome chaos."
    );
  }
  if (p.includes("human")) {
    return (
      "Animal perfectly mimicking human behavior in uncanny and hilarious way. Must " +
      "have clear animal sounds. Human-like reactions."
    );
  }

  return (
    "An animal does something completely unexpected that makes the viewer laugh or " +
    "say aww. LOUD vocalizations. Human reaction. Fast paced."
  );
}

// ---------------------------------------------------------------------------
// Style modifiers — appended based on reelStyle
// ---------------------------------------------------------------------------

function getStyleModifier(style: ReelStyle): string {
  switch (style) {
    case "funny":
      return (
        "Maximum comedy energy. Feels like it already has 10 million views. " +
        "Tag-a-friend energy."
      );
    case "inspirational":
      return "Warm, heartfelt moment. Emotional but uplifting. Cinematic.";
    case "educational":
      return "Clear and engaging. Surprising fact or behavior shown visually.";
    case "dramatic":
      return "High tension. Slow motion moment. Cinematic sound design.";
  }
}

// ---------------------------------------------------------------------------
// buildVideoPrompt — master video prompt builder
// ---------------------------------------------------------------------------

export function buildVideoPrompt(ctx: PromptContext): string {
  const scenario = getPillarScenario(ctx.pillar);
  const styleModifier = getStyleModifier(ctx.reelStyle);
  const brandContext =
    `Brand: @${ctx.brandHandle} (${ctx.brandName}). ` +
    `Niche: ${ctx.niche}. Voice: ${ctx.brandVoice}. Topic: ${ctx.topic}.`;

  return [ANIMAL_VIDEO_PREFIX, scenario, styleModifier, brandContext].join(
    "\n\n"
  );
}

// ---------------------------------------------------------------------------
// buildCaptionPrompt — scroll-stopping hook + CTA, brand voice emphasis
// ---------------------------------------------------------------------------

export function buildCaptionPrompt(ctx: PromptContext): string {
  return (
    `Write a ${ctx.reelStyle} Instagram caption for @${ctx.brandHandle} ` +
    `(${ctx.brandName}). Niche: ${ctx.niche}. Pillar: ${ctx.pillar}. ` +
    `Voice: ${ctx.brandVoice} — this is the most important trait; every sentence ` +
    `must sound like this brand. Audience: ${ctx.targetAudience}. ` +
    `Topic: ${ctx.topic}. ` +
    `RULES: Line 1 MUST be a scroll-stopping hook that makes people stop mid-scroll. ` +
    `Keep it under 200 words. End with a strong CTA (save, share, tag, follow). ` +
    `Use 1-3 emojis max. NO hashtags — they are added separately.`
  );
}

// ---------------------------------------------------------------------------
// buildVoiceoverPrompt — punchy scripts under 80 chars
// ---------------------------------------------------------------------------

export function buildVoiceoverPrompt(ctx: PromptContext): string {
  return (
    `Write a single punchy voiceover line (UNDER 80 characters total) for a ` +
    `${ctx.reelStyle} ${ctx.niche} Instagram Reel about: ${ctx.topic}. ` +
    `Voice/tone: ${ctx.brandVoice}. ` +
    `RULES: Must be under 80 characters. Must match the ${ctx.reelStyle} energy. ` +
    `No quotes around the line. Make it memorable, rhythmic, and impossible to forget. ` +
    `One line only. No explanation.`
  );
}

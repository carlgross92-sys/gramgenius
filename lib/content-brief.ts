import { generateWithClaude } from "@/lib/anthropic";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ContentBrief {
  hook: string;
  emotionalTrigger: string;
  pexelsQuery: string;
  visualDescription: string;
  voiceoverScript: string;
  voiceTone: string;
  captionHook: string;
  captionBody: string;
  captionCta: string;
  hashtags: string;
  /** Index into the DALLE/Pexels/voice/caption arrays for matched sets */
  templateIndex: number;
  /** Whether to use DALL-E as primary media source */
  useDallePrimary: boolean;
}

// ---------------------------------------------------------------------------
// KARINA — DALL-E prompts (primary media source)
// Young attractive women 22-30, conservative look, portrait 9:16
// ---------------------------------------------------------------------------

export const KARINA_DALLE_PROMPTS = [
  "Stunning young woman aged 22-28, long natural brown hair, wearing elegant white sundress, standing in golden wheat field at sunset holding small American flag, warm smile, blue eyes, no tattoos, natural makeup, photorealistic, portrait orientation 9:16, cinematic lighting",
  "Beautiful young woman aged 23-30, flowing blonde hair, red white and blue summer dress, standing on wooden porch of farmhouse at sunrise, hand over heart, confident smile, American countryside background, photorealistic portrait",
  "Attractive young woman aged 22-28, natural brunette hair, modest blue dress, sitting in church pew with Bible open, morning light streaming through stained glass, peaceful expression, photorealistic portrait orientation",
  "Gorgeous young woman aged 24-30, long auburn hair, wearing fitted red blazer, standing confidently in front of American flag backdrop, professional smile, no tattoos, natural beauty, photorealistic portrait 9:16",
  "Beautiful young woman aged 22-27, natural blonde waves, white lace top, standing at beach at golden hour with small cross necklace, serene smile, wind in hair, photorealistic portrait orientation cinematic",
  "Stunning young woman aged 23-29, dark brunette hair, floral sundress, sitting on tailgate of pickup truck at sunset with American flag, genuine smile, countryside background, photorealistic portrait 9:16",
  "Attractive young woman aged 22-28, long natural hair, white button shirt jeans boots, standing in forest with hand on tree, confident outdoorsy look, no heavy makeup, natural beauty, cinematic portrait orientation",
  "Beautiful young woman aged 24-30, honey blonde hair, wearing elegant navy dress, standing at military memorial placing flowers, respectful expression, photorealistic portrait orientation cinematic lighting",
  "Gorgeous young woman aged 22-27, natural brown hair, cozy oversized sweater, sitting by fireplace with Bible and coffee mug, warm home setting, genuine smile, photorealistic portrait 9:16",
  "Stunning young woman aged 23-29, flowing red hair, patriotic red white blue outfit, standing on mountain peak with arms raised confidently, American flag visible, photorealistic portrait orientation golden hour",
];

// ---------------------------------------------------------------------------
// KARINA — Pexels backup queries (if DALL-E fails)
// ---------------------------------------------------------------------------

export const KARINA_PEXELS_QUERIES = [
  "young woman smile outdoor",
  "beautiful woman golden hour",
  "young woman long hair nature",
  "attractive woman summer",
  "young woman confident portrait",
  "woman smile blue sky",
  "young woman dress outdoor",
  "beautiful woman sunrise",
  "young woman nature portrait",
  "woman happy outdoor summer",
];

// ---------------------------------------------------------------------------
// KARINA — Voiceover scripts (matched by index to DALLE prompts)
// ---------------------------------------------------------------------------

export const KARINA_VOICE_SCRIPTS = [
  "Beautiful, faithful, and unapologetic. This is what we stand for.",
  "Real strength. Real beauty. Real values. God bless America.",
  "She never apologizes for loving God, family, and country.",
  "Traditional values, timeless beauty. This is the real America.",
  "Faith over fear. Family over everything. Freedom always.",
  "This is what a real American woman looks like. Stunning.",
  "Conservative, confident, and absolutely beautiful. Goals.",
  "She knows who she is and she is not sorry. Iconic.",
  "Beauty, grace, and patriotism. Everything we love.",
  "Raising the next generation right. This is what matters.",
];

// ---------------------------------------------------------------------------
// KARINA — Caption templates (matched by index to DALLE prompts)
// ---------------------------------------------------------------------------

export const KARINA_CAPTION_TEMPLATES = [
  {
    hook: "This woman is everything \u{1f1fa}\u{1f1f8}",
    body: "Beautiful. Strong. Faithful.\nUnapologetically conservative.\nThis is what we stand for.",
    cta: "Follow if you agree \u{1f447} | Tag a strong woman \u{1f49b}",
  },
  {
    hook: "Real beauty never goes out of style \u2728",
    body: "Faith. Family. Freedom.\nNo apologies. No compromises.\nJust love for God and country.",
    cta: "Drop a \u{1f1fa}\u{1f1f8} if you feel this | Follow for more",
  },
  {
    hook: "She said what we all needed to hear \u{1f64f}",
    body: "Traditional values.\nTimeless grace.\nAmerican pride in every breath.",
    cta: "Tag someone who embodies this \u{1f447} | Follow \u{1f514}",
  },
  {
    hook: "Conservative women are the best women \u{1f985}",
    body: "Strong in faith.\nGentle in spirit.\nUnbreakable in values.",
    cta: "Agree? Drop a \u2764\ufe0f | Follow for daily inspiration",
  },
  {
    hook: "God family country. In that order. \u{1f1fa}\u{1f1f8}",
    body: "She knows her worth.\nShe knows her values.\nAnd she never apologizes for either.",
    cta: "Share with someone who needs this today \u{1f64f}",
  },
  {
    hook: "This is what American beauty looks like \u{1f49b}",
    body: "Not what Hollywood tells you.\nNot what the media pushes.\nThe real thing. Right here.",
    cta: "Follow for more real American content \u{1f1fa}\u{1f1f8}",
  },
  {
    hook: "Raising the standard \u{1f64c}",
    body: "Faith over fear.\nFamily over fame.\nFreedom over everything.",
    cta: "Tag a conservative woman who inspires you \u{1f447}",
  },
  {
    hook: "She gives us hope \u{1f54a}\ufe0f",
    body: "Beautiful inside and out.\nGrounded in faith.\nProud to be American.",
    cta: "Follow if this is your vibe \u{1f1fa}\u{1f1f8} | Share \u2764\ufe0f",
  },
];

// ---------------------------------------------------------------------------
// KARINA — Hashtag sets
// ---------------------------------------------------------------------------

const KARINA_HASHTAGS = [
  "#conservative #america #patriot #maga #trump #usa #freedom #faith #family #americanflag #proud #traditional #godblessamerica #republican #americanwoman #patriotic #liberty #constitution #1776 #redwhiteandblue",
  "#conservativewoman #faithoverfear #godfirst #americanpride #traditional #familyvalues #blessed #strongwomen #usa #patriotic #maga #trump2024 #godblessamerica #freedom #liberty #christian #prayer #bible #grateful #proudamerican",
  "#faith #family #freedom #conservative #america #patriot #maga #traditional #godblessamerica #blessed #prayer #christian #bible #godsgrace #womenoffaith #americanbeauty #proudamerican #values #liberty #republic",
];

// ---------------------------------------------------------------------------
// CHEWY — Pexels queries for funny animals
// ---------------------------------------------------------------------------

export const ANIMAL_PEXELS_QUERIES = [
  "golden retriever funny",
  "puppy excited playing",
  "dog running fast",
  "cat funny reaction",
  "kitten playing toy",
  "dog catching treat",
  "puppy first snow",
  "cat knocking things",
  "dog splashing water",
  "puppy zoomies yard",
  "dog swimming funny",
  "cat surprised funny",
  "puppy learning walk",
  "dog howling funny",
  "corgi running funny",
];

// ---------------------------------------------------------------------------
// CHEWY — Caption templates
// ---------------------------------------------------------------------------

export const ANIMAL_CAPTION_TEMPLATES = [
  {
    hook: "The confidence is unmatched \u{1f62d}",
    body: "This animal said I run this house.\nZero regrets. Zero shame.\nAbsolute legend behavior.",
    cta: "Tag someone who acts exactly like this \u{1f447}",
  },
  {
    hook: "Nobody told them the rules \u{1f602}",
    body: "And honestly?\nWe are glad they never found out.\nThis energy is everything.",
    cta: "Follow for your daily dose of this \u{1f43e}",
  },
  {
    hook: "POV: your pet owns the house \u{1f3e0}",
    body: "You just pay the bills.\nThey set the vibe.\nAnd we would not have it any other way.",
    cta: "Tag your pet's owner... I mean roommate \u{1f447}",
  },
  {
    hook: "Living rent free and thriving \u{1f602}",
    body: "Not a care in the world.\nNot a single apology.\nGoals honestly.",
    cta: "Drop a \u{1f43e} if your pet does this | Follow \u{1f514}",
  },
  {
    hook: "This is the content we needed today \u{1f64c}",
    body: "No drama. No stress.\nJust pure unfiltered joy.\nWe do not deserve animals.",
    cta: "Share with someone who needs a smile \u{1f60a}",
  },
  {
    hook: "Main character behavior only \u{1f451}",
    body: "They woke up and chose chaos.\nAnd honestly?\nSame.",
    cta: "Tag your main character pet \u{1f447} | Follow \u{1f43e}",
  },
];

// ---------------------------------------------------------------------------
// CHEWY — Voice scripts
// ---------------------------------------------------------------------------

export const ANIMAL_VOICE_SCRIPTS = [
  "The audacity. The nerve. The absolute legend.",
  "Caught in the act and not even sorry about it.",
  "This energy. This is the content we all needed today.",
  "Main character behavior and we are here for it.",
  "Living rent free and thriving. Goals honestly.",
  "Nobody told them the rules. We respect that honestly.",
  "POV your pet owns the house. You just pay rent.",
  "The confidence is unmatched. Tag a friend right now.",
  "When they know exactly what they are doing. Iconic.",
  "Pure unfiltered chaos and we absolutely love it.",
];

// ---------------------------------------------------------------------------
// CHEWY — Hashtag sets
// ---------------------------------------------------------------------------

const ANIMAL_HASHTAGS = [
  "#dog #dogsofinstagram #funny #funnydogs #pet #dogmom #doglife #cute #doglover #doggo #puppy #pets #dogvideos #viral #reels #funnyanimals #animals #petlover #doglovers #petsofinstagram",
  "#cat #catsofinstagram #funnycat #catlife #kitten #catvideos #catlover #cute #kitty #meow #funnycats #viral #reels #animals #petlife #catmom #catlady #catlovers #cats #petsofinstagram",
  "#puppy #puppylove #puppiesofinstagram #cute #dog #adorable #babydog #puppylife #dogsofinstagram #cutepuppy #viral #reels #funny #animals #pets #dogmom #puppydog #cuteanimals #puppies #petsofinstagram",
  "#animals #funnyanimals #pets #cute #dog #cat #viral #reels #comedy #funny #petlife #animalvideos #trending #explore #cuteanimals #animallover #wholesome #memes #fyppage #dailylaughs",
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickIdx(len: number): number {
  return Math.floor(Math.random() * len);
}

// ---------------------------------------------------------------------------
// generateContentBrief — returns a fully matched set of prompts
// ---------------------------------------------------------------------------

export async function generateContentBrief(
  brandType: "funny_animals" | "conservative",
  _brandVoice: string,
  _targetAudience: string
): Promise<ContentBrief> {
  if (brandType === "conservative") {
    return generateKarinaBrief();
  }
  return generateAnimalBrief();
}

// ---------------------------------------------------------------------------
// Karina brief — DALL-E primary, matched templates
// ---------------------------------------------------------------------------

function generateKarinaBrief(): ContentBrief {
  const idx = pickIdx(KARINA_DALLE_PROMPTS.length);
  const captionIdx = idx % KARINA_CAPTION_TEMPLATES.length;
  const caption = KARINA_CAPTION_TEMPLATES[captionIdx];

  return {
    hook: caption.hook,
    emotionalTrigger: "pride",
    pexelsQuery: pick(KARINA_PEXELS_QUERIES),
    visualDescription: KARINA_DALLE_PROMPTS[idx],
    voiceoverScript: KARINA_VOICE_SCRIPTS[idx],
    voiceTone: "proud",
    captionHook: caption.hook,
    captionBody: caption.body,
    captionCta: caption.cta,
    hashtags: pick(KARINA_HASHTAGS),
    templateIndex: idx,
    useDallePrimary: true,
  };
}

// ---------------------------------------------------------------------------
// Animal brief — Pexels primary, matched templates
// ---------------------------------------------------------------------------

function generateAnimalBrief(): ContentBrief {
  const captionIdx = pickIdx(ANIMAL_CAPTION_TEMPLATES.length);
  const caption = ANIMAL_CAPTION_TEMPLATES[captionIdx];
  const voiceIdx = pickIdx(ANIMAL_VOICE_SCRIPTS.length);

  return {
    hook: caption.hook,
    emotionalTrigger: "laugh",
    pexelsQuery: pick(ANIMAL_PEXELS_QUERIES),
    visualDescription: "Funny or cute animal doing something hilarious or adorable",
    voiceoverScript: ANIMAL_VOICE_SCRIPTS[voiceIdx],
    voiceTone: "funny",
    captionHook: caption.hook,
    captionBody: caption.body,
    captionCta: caption.cta,
    hashtags: pick(ANIMAL_HASHTAGS),
    templateIndex: captionIdx,
    useDallePrimary: false,
  };
}

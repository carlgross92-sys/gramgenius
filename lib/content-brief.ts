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
  templateIndex: number;
  useDallePrimary: boolean;
}

// ---------------------------------------------------------------------------
// KARINA — Photorealistic DALL-E prompts (MAGA supporter look)
// ---------------------------------------------------------------------------

// NOTE: DALL-E blocks political branding (MAGA/Trump). Keep prompts focused on
// patriotic American woman aesthetic. Political messaging goes in captions/voice.
export const KARINA_DALLE_PROMPTS = [
  "Photorealistic photograph of a stunning young American woman, 24 years old, natural blonde hair blowing in wind, wearing red baseball cap and white fitted top, American flag in background, confident smile, blue eyes, slight freckles, shot on Canon R5, 85mm lens, f1.8 bokeh, golden hour lighting, Instagram photo, hyperrealistic",
  "Real photograph of beautiful young woman 25 years old, natural brunette long hair, wearing patriotic red white blue t-shirt, holding small American flag, standing at outdoor summer event, crowd blurred in background, genuine smile, natural skin texture, shot on Sony A7, photojournalism style, candid moment, hyperrealistic photography",
  "Candid photo of gorgeous young woman 23 years old, auburn hair, wearing red white blue outfit, red baseball cap, sunglasses pushed up on head, at outdoor event on sunny day, laughing naturally, American flags around her, realistic skin, natural lighting, iPhone 15 Pro photo quality, photorealistic",
  "Real photo young beautiful woman 26 years old, honey blonde hair in ponytail, wearing red cap and patriotic tank top, holding coffee cup, sitting on tailgate of pickup truck, American countryside background, morning light, genuine smile, natural makeup, shot on film camera, grain texture, hyperrealistic photography",
  "Photorealistic portrait of stunning young woman 24, natural dark brown hair, small American flag earrings, wearing elegant red dress, hand over heart, soft smile, outdoors at sunrise, warm golden tones, realistic skin pores and texture, Nikon camera professional portrait, real photograph not digital art",
  "Instagram photo of beautiful young woman 25, natural wavy blonde hair, wearing pink cap and white crop top, jeans, at country music concert, stage lights in background, huge smile laughing, natural look, realistic photo, hyperrealistic",
  "Real candid photograph beautiful woman 27, long natural brunette hair, no heavy makeup, wearing patriotic red white blue sundress, small flag pin on dress, standing at veterans memorial, touching name on wall, emotional genuine moment, photojournalism style, hyperrealistic",
  "Lifestyle photo gorgeous young woman 23, blonde beach waves hair, wearing red cap and white bikini top at beach, holding small American flag, laughing with friends blurred behind her, summer golden light, genuine joy, iPhone photo quality, photorealistic",
];

// ---------------------------------------------------------------------------
// KARINA — Runway ML animation prompt (subtle motion for DALL-E images)
// ---------------------------------------------------------------------------

export const KARINA_RUNWAY_PROMPT =
  "Subtle natural movement, hair gently moving in breeze, soft breathing, cinematic, lifelike motion, golden hour lighting";

// ---------------------------------------------------------------------------
// KARINA — Pexels backup queries
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
// KARINA — MAGA voiceover scripts (under 90 chars each)
// ---------------------------------------------------------------------------

export const KARINA_VOICE_SCRIPTS = [
  "American women who love Trump are the most beautiful women in the world.",
  "MAGA women: faithful, fearless, and absolutely stunning.",
  "She wears her MAGA hat with pride and looks incredible doing it.",
  "Conservative women are built different. God family country. Always.",
  "Trump girls just hit different. Confident, beautiful, unapologetic.",
  "This is what the mainstream media does not want you to see.",
  "Real American beauty. No apologies. No compromises. Just patriotism.",
  "Make America Great Again and look gorgeous doing it. Goals.",
  "She stands for freedom and she looks amazing standing for it.",
  "MAGA women love God love family love country. And we love them.",
];

// ---------------------------------------------------------------------------
// KARINA — MAGA caption templates
// ---------------------------------------------------------------------------

export const KARINA_CAPTION_TEMPLATES = [
  {
    hook: "MAGA women are built different \u{1f1fa}\u{1f1f8}",
    body: "Faithful. Fearless. Beautiful.\nNo apologies for loving God and country.\nThis is what real looks like.",
    cta: "Follow if you are a proud MAGA woman \u{1f985}",
  },
  {
    hook: "She said Trump 2024 and looked stunning \u{1f60d}",
    body: "Conservative women have something\nthe mainstream media cannot explain.\nConfidence, grace, and real beauty.",
    cta: "Tag a beautiful MAGA woman you know \u{1f447}\u{1f1fa}\u{1f1f8}",
  },
  {
    hook: "This is what they do not show you \u{1f1fa}\u{1f1f8}",
    body: "Beautiful conservative women.\nProud MAGA supporters.\nThe movement looks amazing.",
    cta: "Follow for more real American content \u{1f985}",
  },
  {
    hook: "MAGA hat never looked so good \u{1f60d}\u{1f1fa}\u{1f1f8}",
    body: "Conservative. Confident. Gorgeous.\nThis is the America we are fighting for.\nGod bless every one of them.",
    cta: "Drop a \u{1f1fa}\u{1f1f8} if you support Trump | Follow \u{1f514}",
  },
  {
    hook: "Trump girls are the best girls \u{1f49b}\u{1f1fa}\u{1f1f8}",
    body: "Faith family freedom.\nIn that order. Always.\nAnd they look incredible living it.",
    cta: "Share with your MAGA sisters \u{1f447} | Follow",
  },
  {
    hook: "Real American beauty \u{1f985}",
    body: "Not Hollywood.\nNot the media.\nJust real conservative women loving their country.",
    cta: "Follow for daily MAGA inspiration \u{1f1fa}\u{1f1f8}",
  },
];

// ---------------------------------------------------------------------------
// KARINA — Hashtag sets
// ---------------------------------------------------------------------------

const KARINA_HASHTAGS = [
  "#maga #trump #trump2024 #conservative #america #patriot #magawoman #godblessamerica #freedom #faith #family #usa #republican #americanwoman #patriotic #proudamerican #conservative #1776 #redwhiteandblue #makeamericagreatagain",
  "#trumpgirl #maga #conservative #america #patriot #trump2024 #magahat #godfirst #faithoverfear #americanpride #traditional #familyvalues #blessed #strongwomen #usa #patriotic #freedom #liberty #christian #proudamerican",
  "#magawomen #trump #conservative #america #patriot #faith #family #freedom #godblessamerica #traditional #americanbeauty #proudamerican #values #liberty #republic #trumpsupporter #christian #prayer #blessed #godsgrace",
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
// generateContentBrief
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

function generateKarinaBrief(): ContentBrief {
  const idx = pickIdx(KARINA_DALLE_PROMPTS.length);
  const captionIdx = idx % KARINA_CAPTION_TEMPLATES.length;
  const caption = KARINA_CAPTION_TEMPLATES[captionIdx];
  const voiceIdx = idx % KARINA_VOICE_SCRIPTS.length;

  return {
    hook: caption.hook,
    emotionalTrigger: "pride",
    pexelsQuery: pick(KARINA_PEXELS_QUERIES),
    visualDescription: KARINA_DALLE_PROMPTS[idx],
    voiceoverScript: KARINA_VOICE_SCRIPTS[voiceIdx],
    voiceTone: "proud",
    captionHook: caption.hook,
    captionBody: caption.body,
    captionCta: caption.cta,
    hashtags: pick(KARINA_HASHTAGS),
    templateIndex: idx,
    useDallePrimary: true,
  };
}

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

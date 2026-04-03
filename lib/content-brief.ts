import { generateWithClaude } from "@/lib/anthropic";

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
}

const ANIMAL_FALLBACKS: ContentBrief[] = [
  {
    hook: "Nobody told this dog",
    emotionalTrigger: "laugh",
    pexelsQuery: "funny dog",
    visualDescription: "Dog doing something completely ridiculous with zero shame",
    voiceoverScript: "The audacity. The nerve. The absolute legend.",
    voiceTone: "funny",
    captionHook: "This dog has zero regrets",
    captionBody: "He said I do what I want.\nAnd honestly? We respect it.\nThis energy is everything.",
    captionCta: "Tag someone who acts exactly like this",
    hashtags: "#dog #dogsofinstagram #funny #funnydogs #pet #dogmom #doglife #cute #doglover #doggo #puppy #pets #dogvideos #viral #reels #funnyanimals #animals #petlover #doglovers #petsofinstagram",
  },
  {
    hook: "Cat said absolutely not",
    emotionalTrigger: "laugh",
    pexelsQuery: "funny cat",
    visualDescription: "Cat refusing to cooperate with dramatic attitude",
    voiceoverScript: "Caught in the act and not even sorry about it.",
    voiceTone: "funny",
    captionHook: "This cat owns the house",
    captionBody: "You just pay the rent.\nThey just live their best life.\nZero apologies given.",
    captionCta: "Follow for more chaos",
    hashtags: "#cat #catsofinstagram #funnycat #catlife #kitten #catvideos #catlover #cute #kitty #meow #funnycats #viral #reels #animals #petlife #catmom #catlady #catlovers #cats #petsofinstagram",
  },
  {
    hook: "Puppy discovers the world",
    emotionalTrigger: "awe",
    pexelsQuery: "puppy playing",
    visualDescription: "Puppy experiencing something for the first time with adorable clumsiness",
    voiceoverScript: "This energy. This is the content we all needed today.",
    voiceTone: "warm",
    captionHook: "POV your heart just melted",
    captionBody: "First time seeing snow.\nFirst time catching a ball.\nEvery day is a new adventure.",
    captionCta: "Save this for when you need a smile",
    hashtags: "#puppy #puppylove #puppiesofinstagram #cute #dog #adorable #babydog #puppylife #dogsofinstagram #cutepuppy #viral #reels #funny #animals #pets #dogmom #puppydog #cuteanimals #puppies #petsofinstagram",
  },
  {
    hook: "When your pet is dramatic",
    emotionalTrigger: "laugh",
    pexelsQuery: "cute pet reaction",
    visualDescription: "Pet making exaggerated facial expressions at something harmless",
    voiceoverScript: "Main character behavior and we are here for it.",
    voiceTone: "energetic",
    captionHook: "The drama is UNREAL",
    captionBody: "Oscar-worthy performance.\nHollywood is calling.\nThis pet deserves an award.",
    captionCta: "Tag the most dramatic person you know",
    hashtags: "#pet #pets #petsofinstagram #funny #funnyanimals #cute #drama #viral #reels #dogmom #catmom #petlife #animalvideos #comedy #trending #explore #fyp #foryou #meme #hilarious",
  },
  {
    hook: "Animals being pure chaos",
    emotionalTrigger: "laugh",
    pexelsQuery: "animals playing together",
    visualDescription: "Multiple animals in chaotic playful situation",
    voiceoverScript: "Living rent free and thriving. Goals honestly.",
    voiceTone: "energetic",
    captionHook: "Pure unfiltered chaos",
    captionBody: "No thoughts. Just vibes.\nThey woke up and chose violence.\nAnd we absolutely love it.",
    captionCta: "Share with someone who needs this energy",
    hashtags: "#animals #funnyanimals #pets #cute #dog #cat #viral #reels #comedy #funny #petlife #animalvideos #trending #explore #cuteanimals #animallover #wholesome #memes #fyppage #dailylaughs",
  },
];

const CONSERVATIVE_FALLBACKS: ContentBrief[] = [
  {
    hook: "This is American pride",
    emotionalTrigger: "pride",
    pexelsQuery: "patriotic woman flag",
    visualDescription: "Beautiful confident woman with American flag at golden hour",
    voiceoverScript: "This is what real American pride looks like.",
    voiceTone: "proud",
    captionHook: "Real American pride looks like this",
    captionBody: "No apologies. No shame.\nJust love for this country.\nThis is what we stand for.",
    captionCta: "Follow if you stand with America",
    hashtags: "#conservative #america #patriot #maga #trump #usa #freedom #faith #family #americanflag #proud #traditional #godblessamerica #republican #americanwoman #patriotic #liberty #constitution #1776 #redwhiteandblue",
  },
  {
    hook: "Faith over everything always",
    emotionalTrigger: "inspire",
    pexelsQuery: "woman praying sunrise",
    visualDescription: "Woman in prayer or reading bible in beautiful morning light",
    voiceoverScript: "Faith over fear. Family over everything. Always.",
    voiceTone: "warm",
    captionHook: "Faith over fear. Always.",
    captionBody: "Start every morning with prayer.\nGod has a plan for you.\nTrust the journey.",
    captionCta: "Type AMEN if you believe",
    hashtags: "#faith #godfirst #prayer #christian #blessed #believe #godisgood #faithoverfear #jesus #bible #godblessamerica #conservative #family #grateful #spiritual #worship #churchlife #amen #godsgrace #faithjourney",
  },
  {
    hook: "Strong women built America",
    emotionalTrigger: "pride",
    pexelsQuery: "confident woman outdoors",
    visualDescription: "Strong confident woman standing tall in golden light",
    voiceoverScript: "Beautiful. Strong. Unapologetic. That is what we are.",
    voiceTone: "proud",
    captionHook: "Beautiful. Strong. Unapologetic.",
    captionBody: "We don't need permission.\nWe don't need approval.\nWe know who we are.",
    captionCta: "Share if this is you",
    hashtags: "#strongwomen #conservative #america #patriot #womenempowerment #traditional #faith #family #freedom #usa #maga #trump #republican #godblessamerica #americanwoman #confident #beautiful #blessed #proudamerican #traditionalvalues",
  },
  {
    hook: "Family is everything period",
    emotionalTrigger: "inspire",
    pexelsQuery: "happy family outdoors",
    visualDescription: "Warm family moment in beautiful natural setting",
    voiceoverScript: "Family is not just important. It is everything.",
    voiceTone: "warm",
    captionHook: "Family is everything",
    captionBody: "In a world of chaos.\nThey are your peace.\nProtect what matters most.",
    captionCta: "Tag your family",
    hashtags: "#family #familyfirst #blessed #love #faith #conservative #traditional #familyvalues #home #grateful #america #godfirst #parents #motherhood #fatherhood #familytime #traditionalfamily #homeschool #wholesome #values",
  },
  {
    hook: "Freedom is not free ever",
    emotionalTrigger: "pride",
    pexelsQuery: "american flag sunset",
    visualDescription: "American flag waving dramatically at sunset, cinematic",
    voiceoverScript: "Freedom is not free. Never forget that. God bless America.",
    voiceTone: "dramatic",
    captionHook: "Freedom is not free",
    captionBody: "Someone paid the price.\nSomeone made the sacrifice.\nNever take it for granted.",
    captionCta: "Follow for more American pride",
    hashtags: "#freedom #america #usa #patriot #military #veteran #godblessamerica #conservative #maga #trump #liberty #constitution #1776 #flag #americanflag #proudamerican #sacrifice #honor #respect #republic",
  },
];

export async function generateContentBrief(
  brandType: "funny_animals" | "conservative",
  brandVoice: string,
  targetAudience: string
): Promise<ContentBrief> {
  const fallbacks =
    brandType === "funny_animals" ? ANIMAL_FALLBACKS : CONSERVATIVE_FALLBACKS;

  const brandContext =
    brandType === "funny_animals"
      ? `BRAND TYPE: Funny Animals Entertainment
CONTENT: Dogs, cats, puppies, kittens doing hilarious or adorable things
EMOTIONAL TRIGGER: Make people laugh and feel warm
VOICE STYLE: Funny, sarcastic, relatable, playful
CAPTION STYLE: Like a friend texting you something hilarious
EXAMPLE HOOKS: "This dog said absolutely not", "Nobody told this cat the rules", "The confidence is unmatched"`
      : `BRAND TYPE: Conservative Lifestyle Women
CONTENT: Beautiful confident patriotic American women
EMOTIONAL TRIGGER: Pride, strength, inspiration, patriotism
VOICE STYLE: Bold, proud, inspiring, direct
CAPTION STYLE: Strong statement that makes conservatives nod
EXAMPLE HOOKS: "This is what real American pride looks like", "Beautiful. Strong. Unapologetic.", "Faith over fear. Always."`;

  const prompt = `You are a viral Instagram content director with 10M+ followers.
Create a complete content brief for one Instagram Reel.

${brandContext}

Generate a brief where VIDEO + VOICE + CAPTION tell ONE unified story.

Return ONLY valid JSON in this exact format:
{
  "hook": "5 words max shown on screen first",
  "emotionalTrigger": "laugh OR awe OR pride OR relate OR inspire",
  "pexelsQuery": "2-3 word Pexels search like: funny dog OR patriotic woman",
  "visualDescription": "Describe exactly what the ideal 10-second video shows",
  "voiceoverScript": "Exact words spoken aloud, under 100 chars, punchy",
  "voiceTone": "energetic OR warm OR dramatic OR funny OR proud",
  "captionHook": "First line under 8 words, stops the scroll",
  "captionBody": "2-3 short lines that build on the hook",
  "captionCta": "One call to action line",
  "hashtags": "20 hashtags starting with # separated by spaces"
}

CRITICAL: pexelsQuery must be 2-3 simple words. voiceoverScript under 100 chars. ALL fields about THE SAME scene. No markdown, just JSON.`;

  try {
    const raw = await generateWithClaude(
      prompt +
        "\n\nYou MUST respond with valid JSON only. No markdown, no code blocks, no explanation.",
      `Generate one content brief for ${brandType === "funny_animals" ? "funny animal" : "conservative lifestyle"} Instagram content.`,
      600
    );

    const cleaned = raw
      .replace(/```json\n?/gi, "")
      .replace(/```\n?/g, "")
      .trim();
    const brief = JSON.parse(cleaned) as ContentBrief;

    // Validate critical fields
    if (!brief.pexelsQuery || !brief.voiceoverScript || !brief.captionHook) {
      throw new Error("Missing critical fields in brief");
    }

    return brief;
  } catch (err) {
    console.warn(
      "[ContentBrief] AI generation failed, using fallback:",
      err instanceof Error ? err.message : err
    );
    // Pick random fallback
    return fallbacks[Math.floor(Math.random() * fallbacks.length)];
  }
}

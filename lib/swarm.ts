import { generateWithClaudeJSON } from "@/lib/anthropic";
import prisma from "@/lib/prisma";

// ─── Interfaces ──────────────────────────────────────────────────────────────

export interface SwarmInput {
  topic: string;
  brandProfileId: string;
  postType: "FEED" | "CAROUSEL" | "REEL" | "STORY";
  recentHashtagsUsed: string[];
  postGoal: "awareness" | "engagement" | "conversion" | "growth";
}

export interface ResearchOutput {
  trends: string[];
  audiencePainPoints: string[];
  contentAngles: string[];
  viralFormats: string[];
  emotionalHooks: string[];
  competitorGaps: string[];
}

export interface StrategyOutput {
  format: string;
  platform: string;
  tone: string;
  narrativeStructure: string;
  leadHook: string;
  engagementScore: number;
  strategyRationale: string;
}

export interface CaptionDraft {
  type: string;
  rawText: string;
}

export interface RefinedCaption {
  type: string;
  text: string;
  editorNotes: string;
}

export interface HashtagOutput {
  mega: string[];
  mid: string[];
  niche: string[];
  micro: string[];
  fullSet: string[];
  warningFlags: string[];
}

export interface VisualOutput {
  dallePrompt: string;
  colorMood: string;
  compositionStyle: string;
  visualType: string;
  reelSceneCount: number;
}

export interface CTAOutput {
  ctas: Array<{ strength: string; text: string }>;
}

export interface PlatformFormat {
  formattedCaption: string;
  characterCount: number;
  platformTips: string[];
}

export interface FormatterOutput {
  instagram: PlatformFormat;
  facebook: PlatformFormat;
  twitter: PlatformFormat;
  linkedin: PlatformFormat;
}

export interface SwarmMetrics {
  totalMs: number;
  agentTimings: Record<string, number>;
}

export interface SwarmOutput {
  researchInsights: ResearchOutput;
  strategy: StrategyOutput;
  captions: RefinedCaption[];
  hashtags: HashtagOutput;
  visualConcept: VisualOutput;
  ctas: CTAOutput;
  formatted: FormatterOutput;
  swarmMetrics: SwarmMetrics;
}

// ─── Agent Runner Utility ────────────────────────────────────────────────────

async function runAgent<T>(
  name: string,
  systemPrompt: string,
  userPrompt: string,
  agentTimings: Record<string, number>,
  maxTokens: number = 4096
): Promise<T> {
  const run = async (): Promise<T> => {
    const start = Date.now();
    const result = await generateWithClaudeJSON<T>(systemPrompt, userPrompt, maxTokens);
    const ms = Date.now() - start;
    agentTimings[name] = ms;
    console.log(`[Swarm] Agent ${name} completed in ${ms}ms`);
    return result;
  };

  try {
    return await run();
  } catch (error) {
    console.log(`[Swarm] Agent ${name} failed, retrying once...`, error);
    try {
      return await run();
    } catch (retryError) {
      console.error(`[Swarm] Agent ${name} failed after retry:`, retryError);
      throw retryError;
    }
  }
}

// ─── Main Swarm Orchestrator ─────────────────────────────────────────────────

export async function runContentSwarm(input: SwarmInput): Promise<SwarmOutput> {
  const swarmStart = Date.now();
  const agentTimings: Record<string, number> = {};

  // ── Load brand profile ──────────────────────────────────────────────────
  const brandProfile = await prisma.brandProfile.findUniqueOrThrow({
    where: { id: input.brandProfileId },
  });

  const brandContext = [
    `Brand: ${brandProfile.name}`,
    `Instagram: @${brandProfile.instagramHandle}`,
    `Niche: ${brandProfile.niche}`,
    `Target Audience: ${brandProfile.targetAudience}`,
    `Brand Voice: ${brandProfile.brandVoice}`,
    `Content Pillars: ${brandProfile.contentPillars}`,
  ].join("\n");

  // ── AGENT 1 — Research Agent ────────────────────────────────────────────
  const researchOutput = await runAgent<ResearchOutput>(
    "Research",
    `You are a social media research specialist. Your ONLY job is to analyze the given topic and return structured intelligence: current trends, audience pain points, competitor angles, viral formats performing well right now, emotional hooks that resonate with this niche, and 3 unique content angles nobody is covering. Output as structured JSON only.`,
    JSON.stringify({
      topic: input.topic,
      niche: brandProfile.niche,
      targetAudience: brandProfile.targetAudience,
      contentPillars: brandProfile.contentPillars,
    }),
    agentTimings
  );

  // ── AGENT 2 — Strategy Agent ────────────────────────────────────────────
  const strategyOutput = await runAgent<StrategyOutput>(
    "Strategy",
    `You are a content strategist who decides exactly how content should be packaged for maximum reach. Given research intelligence, decide: best post format (Feed/Reel/Carousel/Story), optimal platform (IG/FB/Both), content tone, narrative structure, which emotional hook to lead with, estimated engagement potential score 1-10, and why. Output as structured JSON only.`,
    JSON.stringify({
      researchInsights: researchOutput,
      brandContext,
      requestedPostType: input.postType,
      postGoal: input.postGoal,
    }),
    agentTimings
  );

  // ── AGENT 3 — Copy Agent ───────────────────────────────────────────────
  const copyOutput = await runAgent<{ captions: CaptionDraft[] }>(
    "Copy",
    `You are a world-class social media copywriter specializing in ${brandProfile.niche}. Your ONLY job is to write raw high-converting copy based on the strategy provided. Write 3 full caption variations: short punchy, medium storytelling, long value-add. Do not add hashtags. Do not format. Just write the best possible captions. Output as structured JSON only with key 'captions' containing array of {type, rawText}.`,
    JSON.stringify({
      strategy: strategyOutput,
      researchInsights: researchOutput,
      brandContext,
      topic: input.topic,
      postType: input.postType,
    }),
    agentTimings
  );

  // ── AGENT 4 — Editor Agent ─────────────────────────────────────────────
  const editorOutput = await runAgent<{ refinedCaptions: RefinedCaption[] }>(
    "Editor",
    `You are a brutal social media editor. Your ONLY job is to take raw copy and make it better. Check: Does the first line stop the scroll? Is there fluff to cut? Does it sound like the brand voice? Is the CTA clear? Rewrite each caption to be tighter, more engaging, and more on-brand. Return improved versions only. Output as structured JSON only with key 'refinedCaptions' containing array of {type, text, editorNotes}.`,
    JSON.stringify({
      rawCaptions: copyOutput.captions,
      brandContext,
      brandVoice: brandProfile.brandVoice,
    }),
    agentTimings
  );

  // ── AGENTS 5A + 5B + 5C — Parallel ─────────────────────────────────────
  const [hashtagOutput, visualOutput, ctaOutput] = await Promise.all([
    // 5A — Hashtag Agent
    runAgent<HashtagOutput>(
      "Hashtag",
      `You are a hashtag strategy specialist. Given the content topic, niche, and platform, generate the perfect hashtag set. Group into: 5 mega (1M+ posts), 8 mid-tier (100k-1M), 5 niche (10k-100k), 2 micro (<10k). Flag any potentially shadowbanned tags. Output as structured JSON only.`,
      JSON.stringify({
        topic: input.topic,
        niche: brandProfile.niche,
        platform: strategyOutput.platform,
        recentHashtagsUsed: input.recentHashtagsUsed,
      }),
      agentTimings
    ),

    // 5B — Visual Concept Agent
    runAgent<VisualOutput>(
      "Visual",
      `You are a visual director for social media. Your ONLY job is to design the perfect visual for this post. Describe: the exact DALL-E image prompt to generate (detailed, no text in image, brand-appropriate), color mood, composition style, and if this should be a static image or animated Reel scene. Output as structured JSON only.`,
      JSON.stringify({
        strategy: strategyOutput,
        refinedCaption: editorOutput.refinedCaptions[0],
        brandContext,
        postType: input.postType,
      }),
      agentTimings
    ),

    // 5C — CTA Agent
    runAgent<CTAOutput>(
      "CTA",
      `You are a conversion specialist. Your ONLY job is to write 3 CTA variations for this post: soft (save/share), medium (comment/tag), strong (link in bio/DM me). Each CTA must feel natural appended to the caption, not salesy. Match the brand voice exactly. Output as structured JSON only with key 'ctas'.`,
      JSON.stringify({
        refinedCaptions: editorOutput.refinedCaptions,
        brandContext,
        brandVoice: brandProfile.brandVoice,
        postGoal: input.postGoal,
      }),
      agentTimings
    ),
  ]);

  // ── AGENT 6 — Formatter Agent ──────────────────────────────────────────
  const formatterOutput = await runAgent<FormatterOutput>(
    "Formatter",
    `You are a platform formatting specialist. Take the final caption + CTA and format it perfectly for each platform's best practices: Instagram (line breaks, emoji placement, 2200 char limit), Facebook (longer form OK, link-friendly), Twitter/X (280 chars, thread option), LinkedIn (professional tone, no excessive emoji). Output as structured JSON only with keys: instagram, facebook, twitter, linkedin.`,
    JSON.stringify({
      refinedCaptions: editorOutput.refinedCaptions,
      hashtags: hashtagOutput,
      ctas: ctaOutput,
      strategy: strategyOutput,
      brandContext,
    }),
    agentTimings
  );

  // ── Assemble final output ──────────────────────────────────────────────
  const totalMs = Date.now() - swarmStart;
  console.log(`[Swarm] Total swarm completed in ${totalMs}ms`);

  return {
    researchInsights: researchOutput,
    strategy: strategyOutput,
    captions: editorOutput.refinedCaptions,
    hashtags: hashtagOutput,
    visualConcept: visualOutput,
    ctas: ctaOutput,
    formatted: formatterOutput,
    swarmMetrics: {
      totalMs,
      agentTimings,
    },
  };
}

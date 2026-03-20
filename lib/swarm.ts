import { generateWithClaudeJSON } from "@/lib/anthropic";
import prisma from "@/lib/prisma";

// Re-export types from the client-safe types file
export type {
  SwarmInput, ResearchOutput, StrategyOutput, CaptionDraft,
  RefinedCaption, HashtagOutput, VisualOutput, CTAOutput,
  PlatformFormat, FormatterOutput, SwarmMetrics, SwarmOutput,
} from "@/lib/swarm-types";

import type {
  SwarmInput, ResearchOutput, StrategyOutput, CaptionDraft,
  RefinedCaption, HashtagOutput, VisualOutput, CTAOutput,
  PlatformFormat, FormatterOutput, SwarmOutput,
} from "@/lib/swarm-types";

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
  const brandProfile = await prisma.brandProfile.findFirst({
    where: { id: input.brandProfileId },
  });

  if (!brandProfile) {
    // Fallback: try to get any brand profile (single-user app)
    const fallback = await prisma.brandProfile.findFirst();
    if (!fallback) throw new Error("No brand profile found. Set up your Brand Brain first.");
    Object.assign(brandProfile ?? {}, fallback);
  }

  // Parse contentPillars from JSON string to readable list
  let pillars: string[] = [];
  try {
    const parsed = JSON.parse(brandProfile!.contentPillars);
    pillars = Array.isArray(parsed) ? parsed : [];
  } catch {
    pillars = [];
  }

  const bp = brandProfile!;
  const brandContext = [
    `Brand: ${bp.name}`,
    `Instagram: @${bp.instagramHandle}`,
    `Niche: ${bp.niche}`,
    `Target Audience: ${bp.targetAudience}`,
    `Brand Voice: ${bp.brandVoice}`,
    `Content Pillars: ${pillars.join(", ")}`,
  ].join("\n");

  // ── AGENT 1 — Research Agent ────────────────────────────────────────────
  const researchOutput = await runAgent<ResearchOutput>(
    "Research",
    `You are a social media research specialist. Your ONLY job is to analyze the given topic and return structured intelligence: current trends, audience pain points, competitor angles, viral formats performing well right now, emotional hooks that resonate with this niche, and 3 unique content angles nobody is covering. Output as structured JSON only.`,
    JSON.stringify({
      topic: input.topic,
      niche: bp.niche,
      targetAudience: bp.targetAudience,
      contentPillars: pillars,
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
    `You are a world-class social media copywriter specializing in ${bp.niche}. Your ONLY job is to write raw high-converting copy based on the strategy provided. Write 3 full caption variations: short punchy, medium storytelling, long value-add. Do not add hashtags. Do not format. Just write the best possible captions. Output as structured JSON only with key 'captions' containing array of {type, rawText}.`,
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
      rawCaptions: copyOutput?.captions || [],
      brandContext,
      brandVoice: bp.brandVoice,
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
        niche: bp.niche,
        platform: strategyOutput?.platform || "INSTAGRAM",
        recentHashtagsUsed: input.recentHashtagsUsed || [],
      }),
      agentTimings
    ),

    // 5B — Visual Concept Agent
    runAgent<VisualOutput>(
      "Visual",
      `You are a visual director for social media. Your ONLY job is to design the perfect visual for this post. Describe: the exact DALL-E image prompt to generate (detailed, no text in image, brand-appropriate), color mood, composition style, and if this should be a static image or animated Reel scene. Output as structured JSON only.`,
      JSON.stringify({
        strategy: strategyOutput,
        refinedCaption: (editorOutput?.refinedCaptions || [])[0] || { type: "short", text: input.topic, editorNotes: "" },
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
        refinedCaptions: editorOutput?.refinedCaptions || [],
        brandContext,
        brandVoice: bp.brandVoice,
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
      refinedCaptions: editorOutput?.refinedCaptions || [],
      hashtags: hashtagOutput || {},
      ctas: ctaOutput,
      strategy: strategyOutput,
      brandContext,
    }),
    agentTimings
  );

  // ── Assemble final output ──────────────────────────────────────────────
  const totalMs = Date.now() - swarmStart;
  console.log(`[Swarm] Total swarm completed in ${totalMs}ms`);

  // Null-safe assembly with defaults
  const safeHashtags: HashtagOutput = {
    mega: hashtagOutput?.mega || [],
    mid: hashtagOutput?.mid || [],
    niche: hashtagOutput?.niche || [],
    micro: hashtagOutput?.micro || [],
    fullSet: hashtagOutput?.fullSet || [
      ...(hashtagOutput?.mega || []),
      ...(hashtagOutput?.mid || []),
      ...(hashtagOutput?.niche || []),
      ...(hashtagOutput?.micro || []),
    ],
    warningFlags: hashtagOutput?.warningFlags || [],
  };

  const defaultPlatform: PlatformFormat = { formattedCaption: "", characterCount: 0, platformTips: [] };
  const safeFormatted: FormatterOutput = {
    instagram: formatterOutput?.instagram || defaultPlatform,
    facebook: formatterOutput?.facebook || defaultPlatform,
    twitter: formatterOutput?.twitter || defaultPlatform,
    linkedin: formatterOutput?.linkedin || defaultPlatform,
  };

  return {
    researchInsights: researchOutput || { trends: [], audiencePainPoints: [], contentAngles: [], viralFormats: [], emotionalHooks: [], competitorGaps: [] },
    strategy: strategyOutput || { format: "FEED", platform: "INSTAGRAM", tone: "", narrativeStructure: "", leadHook: "", engagementScore: 5, strategyRationale: "" },
    captions: editorOutput?.refinedCaptions || [],
    hashtags: safeHashtags,
    visualConcept: visualOutput || { dallePrompt: "", colorMood: "", compositionStyle: "", visualType: "static", reelSceneCount: 0 },
    ctas: ctaOutput || { ctas: [] },
    formatted: safeFormatted,
    swarmMetrics: {
      totalMs,
      agentTimings,
    },
  };
}

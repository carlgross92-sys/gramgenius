// Shared types for the Content Swarm Engine
// This file has NO server-side imports so it can be safely imported by client components.

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

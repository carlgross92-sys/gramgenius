"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { GoldButton } from "@/components/ui/GoldButton";
import { DarkCard } from "@/components/ui/DarkCard";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Zap,
  Brain,
  Target,
  PenTool,
  Edit3,
  Hash,
  Eye,
  Type,
  Loader2,
  CheckCircle,
  Clock,
  Sparkles,
  Instagram,
  Facebook,
  Twitter,
  Linkedin,
  Image,
  CalendarPlus,
  Save,
} from "lucide-react";
import type {
  SwarmOutput,
  RefinedCaption,
  HashtagOutput,
  CTAOutput,
  VisualOutput,
  FormatterOutput,
  ResearchOutput,
  StrategyOutput,
  SwarmMetrics,
} from "@/lib/swarm";

// ─── Types ──────────────────────────────────────────────────────────────────

type AgentStatus = "pending" | "running" | "complete" | "failed";

interface AgentState {
  name: string;
  icon: React.ReactNode;
  statusText: string;
  status: AgentStatus;
  timing?: number;
}

const AGENT_DEFS: { name: string; icon: React.ReactNode; statusText: string }[] = [
  { name: "Research Agent", icon: <Brain className="h-4 w-4" />, statusText: "Analyzing trends..." },
  { name: "Strategy Agent", icon: <Target className="h-4 w-4" />, statusText: "Planning content..." },
  { name: "Copy Agent", icon: <PenTool className="h-4 w-4" />, statusText: "Writing captions..." },
  { name: "Editor Agent", icon: <Edit3 className="h-4 w-4" />, statusText: "Refining copy..." },
  { name: "Parallel Agents", icon: <Sparkles className="h-4 w-4" />, statusText: "Hashtags + Visual + CTA" },
  { name: "Formatter Agent", icon: <Type className="h-4 w-4" />, statusText: "Packaging for platforms..." },
];

const TIMING_KEYS = ["Research", "Strategy", "Copy", "Editor", "Hashtag", "Formatter"];

// ─── Component ──────────────────────────────────────────────────────────────

export default function SwarmStudioPage() {
  const router = useRouter();

  // ── Form state ──
  const [topic, setTopic] = useState("");
  const [postType, setPostType] = useState("FEED");
  const [postGoal, setPostGoal] = useState("engagement");
  const [brandProfileId, setBrandProfileId] = useState<string | null>(null);
  const [brandName, setBrandName] = useState<string>("");

  // ── Loading / results ──
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<(SwarmOutput & { postId: string }) | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("instagram");

  // ── Agent progress ──
  const [agents, setAgents] = useState<AgentState[]>(
    AGENT_DEFS.map((a) => ({ ...a, status: "pending" as AgentStatus }))
  );
  const progressTimers = useRef<ReturnType<typeof setTimeout>[]>([]);

  // ── Load brand profile on mount ──
  useEffect(() => {
    async function loadBrand() {
      try {
        const res = await fetch("/api/brand");
        if (res.ok) {
          const data = await res.json();
          if (data.brand) {
            setBrandProfileId(data.brand.id);
            setBrandName(data.brand.name);
          }
        }
      } catch {
        // silent — brand can be missing
      }
    }
    loadBrand();
  }, []);

  // ── Simulate agent progress ──
  const simulateProgress = useCallback(() => {
    // Clear any existing timers
    progressTimers.current.forEach(clearTimeout);
    progressTimers.current = [];

    // Reset all agents to pending
    setAgents(AGENT_DEFS.map((a) => ({ ...a, status: "pending" as AgentStatus })));

    // Stagger each agent's start: ~2.5s gap per agent
    const delays = [0, 2500, 5000, 7500, 10000, 14000];
    delays.forEach((delay, idx) => {
      const timer = setTimeout(() => {
        setAgents((prev) =>
          prev.map((a, i) => {
            if (i === idx) return { ...a, status: "running" };
            return a;
          })
        );
      }, delay);
      progressTimers.current.push(timer);
    });
  }, []);

  const finalizeAgents = useCallback((metrics: SwarmMetrics) => {
    progressTimers.current.forEach(clearTimeout);
    progressTimers.current = [];

    const timings = metrics.agentTimings;
    setAgents(
      AGENT_DEFS.map((def, idx) => {
        const key = TIMING_KEYS[idx];
        // For parallel agents, use average of Hashtag + Visual + CTA
        let timing: number | undefined;
        if (idx === 4) {
          const h = timings["Hashtag"] ?? 0;
          const v = timings["Visual"] ?? 0;
          const c = timings["CTA"] ?? 0;
          timing = Math.max(h, v, c);
        } else {
          timing = timings[key];
        }
        return { ...def, status: "complete" as AgentStatus, timing };
      })
    );
  }, []);

  // ── Launch swarm ──
  async function handleLaunchSwarm() {
    if (!topic.trim() || !brandProfileId) return;

    setLoading(true);
    setResult(null);
    setError(null);
    simulateProgress();

    try {
      const res = await fetch("/api/swarm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: topic.trim(),
          brandProfileId,
          postType,
          recentHashtagsUsed: [],
          postGoal,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Swarm failed (${res.status})`);
      }

      const data = await res.json();
      setResult(data);
      finalizeAgents(data.swarmMetrics);
      setActiveTab("instagram");
    } catch (err) {
      const message = err instanceof Error ? err.message : "An unknown error occurred";
      setError(message);
      // Mark all as failed
      progressTimers.current.forEach(clearTimeout);
      setAgents((prev) => prev.map((a) => ({ ...a, status: "failed" })));
    } finally {
      setLoading(false);
    }
  }

  // ── Status indicator ──
  function StatusDot({ status }: { status: AgentStatus }) {
    switch (status) {
      case "pending":
        return <span className="h-2.5 w-2.5 rounded-full bg-[#333333]" />;
      case "running":
        return <Loader2 className="h-4 w-4 animate-spin text-[#f0b429]" />;
      case "complete":
        return <CheckCircle className="h-4 w-4 text-emerald-400" />;
      case "failed":
        return <span className="h-2.5 w-2.5 rounded-full bg-red-500" />;
    }
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <Header title="Swarm Studio" brandActive={!!brandProfileId} />

      {/* Hero Header */}
      <div className="border-b border-[#1f1f1f] px-6 py-8">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#f0b429]/10">
            <Zap className="h-5 w-5 text-[#f0b429]" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">Content Swarm Engine</h2>
            <p className="text-sm text-[#888888]">
              6 specialized AI agents working together to create your best content
            </p>
          </div>
        </div>
      </div>

      {/* Two-Column Layout */}
      <div className="flex gap-6 p-6">
        {/* ── Left Panel (40%) ── */}
        <div className="flex w-[40%] shrink-0 flex-col gap-6">
          {/* Input Form */}
          <DarkCard>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-[#888888]">
              Swarm Input
            </h3>
            <div className="flex flex-col gap-4">
              {/* Topic */}
              <div className="flex flex-col gap-1.5">
                <Label className="text-[#888888]">Topic</Label>
                <Textarea
                  placeholder="What should the swarm create content about?"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  className="min-h-[80px] border-[#1f1f1f] bg-[#1a1a1a] text-white placeholder:text-[#555555]"
                />
              </div>

              {/* Post Type */}
              <div className="flex flex-col gap-1.5">
                <Label className="text-[#888888]">Post Type</Label>
                <Select
                  value={postType}
                  onValueChange={(value) => setPostType(value ?? "")}
                >
                  <SelectTrigger className="border-[#1f1f1f] bg-[#1a1a1a] text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-[#1f1f1f] bg-[#111111]">
                    <SelectItem value="FEED" className="text-white">Feed</SelectItem>
                    <SelectItem value="CAROUSEL" className="text-white">Carousel</SelectItem>
                    <SelectItem value="REEL" className="text-white">Reel</SelectItem>
                    <SelectItem value="STORY" className="text-white">Story</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Post Goal */}
              <div className="flex flex-col gap-1.5">
                <Label className="text-[#888888]">Post Goal</Label>
                <Select
                  value={postGoal}
                  onValueChange={(value) => setPostGoal(value ?? "")}
                >
                  <SelectTrigger className="border-[#1f1f1f] bg-[#1a1a1a] text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-[#1f1f1f] bg-[#111111]">
                    <SelectItem value="awareness" className="text-white">Awareness</SelectItem>
                    <SelectItem value="engagement" className="text-white">Engagement</SelectItem>
                    <SelectItem value="conversion" className="text-white">Conversion</SelectItem>
                    <SelectItem value="growth" className="text-white">Growth</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Brand indicator */}
              {brandName && (
                <p className="text-xs text-[#555555]">
                  Brand: <span className="text-[#f0b429]">{brandName}</span>
                </p>
              )}
              {!brandProfileId && (
                <p className="text-xs text-red-400">
                  No brand profile found. Please set up your brand first.
                </p>
              )}

              {/* Launch Button */}
              <GoldButton
                onClick={handleLaunchSwarm}
                disabled={loading || !topic.trim() || !brandProfileId}
                className="mt-2 w-full"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Zap className="h-4 w-4" />
                )}
                {loading ? "Swarm Running..." : "Launch Swarm"}
              </GoldButton>
            </div>
          </DarkCard>

          {/* Agent Progress Tracker */}
          <DarkCard>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-[#888888]">
              Agent Progress
            </h3>
            <div className="flex flex-col gap-3">
              {agents.map((agent, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-3 rounded-lg border border-[#1a1a1a] bg-[#0d0d0d] px-4 py-3"
                >
                  <span
                    className={
                      agent.status === "running"
                        ? "text-[#f0b429]"
                        : agent.status === "complete"
                          ? "text-emerald-400"
                          : agent.status === "failed"
                            ? "text-red-400"
                            : "text-[#444444]"
                    }
                  >
                    {agent.icon}
                  </span>
                  <div className="flex flex-1 flex-col">
                    <span
                      className={
                        agent.status === "pending"
                          ? "text-sm font-medium text-[#555555]"
                          : "text-sm font-medium text-white"
                      }
                    >
                      {agent.name}
                    </span>
                    <span className="text-xs text-[#666666]">
                      {agent.status === "complete" && agent.timing
                        ? `Done in ${(agent.timing / 1000).toFixed(1)}s`
                        : agent.status === "running"
                          ? agent.statusText
                          : agent.status === "failed"
                            ? "Failed"
                            : "Waiting..."}
                    </span>
                  </div>
                  <StatusDot status={agent.status} />
                </div>
              ))}
            </div>
          </DarkCard>
        </div>

        {/* ── Right Panel (60%) ── */}
        <div className="flex flex-1 flex-col gap-6">
          {/* Error state */}
          {error && (
            <DarkCard className="border-red-500/30">
              <p className="text-sm text-red-400">{error}</p>
            </DarkCard>
          )}

          {/* Empty state */}
          {!result && !loading && !error && (
            <DarkCard className="flex flex-col items-center justify-center py-20">
              <Zap className="mb-4 h-12 w-12 text-[#222222]" />
              <p className="text-lg font-medium text-[#333333]">
                Launch the swarm to see results
              </p>
              <p className="mt-1 text-sm text-[#555555]">
                Enter a topic and click &quot;Launch Swarm&quot;
              </p>
            </DarkCard>
          )}

          {/* Loading state */}
          {loading && !result && (
            <DarkCard className="flex flex-col items-center justify-center py-20">
              <Loader2 className="mb-4 h-10 w-10 animate-spin text-[#f0b429]" />
              <p className="text-lg font-medium text-white">Swarm in progress...</p>
              <p className="mt-1 text-sm text-[#888888]">
                6 agents are collaborating on your content
              </p>
            </DarkCard>
          )}

          {/* Results */}
          {result && (
            <>
              <Tabs
                value={activeTab}
                onValueChange={(v) => setActiveTab(v as string)}
              >
                <TabsList className="bg-[#111111]">
                  <TabsTrigger value="instagram">
                    <Instagram className="h-3.5 w-3.5" />
                    Instagram
                  </TabsTrigger>
                  <TabsTrigger value="facebook">
                    <Facebook className="h-3.5 w-3.5" />
                    Facebook
                  </TabsTrigger>
                  <TabsTrigger value="twitter">
                    <Twitter className="h-3.5 w-3.5" />
                    Twitter/X
                  </TabsTrigger>
                  <TabsTrigger value="linkedin">
                    <Linkedin className="h-3.5 w-3.5" />
                    LinkedIn
                  </TabsTrigger>
                  <TabsTrigger value="intelligence">
                    <Brain className="h-3.5 w-3.5" />
                    Intelligence
                  </TabsTrigger>
                  <TabsTrigger value="visual">
                    <Eye className="h-3.5 w-3.5" />
                    Visual
                  </TabsTrigger>
                </TabsList>

                {/* Instagram Tab */}
                <TabsContent value="instagram">
                  <DarkCard className="mt-4 flex flex-col gap-5">
                    <div className="flex items-center gap-2">
                      <Instagram className="h-5 w-5 text-[#f0b429]" />
                      <h3 className="text-lg font-semibold text-white">Instagram</h3>
                      {result.formatted.instagram?.characterCount && (
                        <Badge className="bg-[#1a1a1a] text-[#888888]">
                          {result.formatted.instagram.characterCount} chars
                        </Badge>
                      )}
                    </div>

                    {/* Caption */}
                    <div className="rounded-lg border border-[#1f1f1f] bg-[#0d0d0d] p-4">
                      <p className="whitespace-pre-wrap text-sm leading-relaxed text-white">
                        {result.formatted.instagram?.formattedCaption ?? ""}
                      </p>
                    </div>

                    {/* Hashtags */}
                    <div>
                      <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#888888]">
                        Hashtags
                      </h4>
                      <div className="flex flex-wrap gap-1.5">
                        {result.hashtags.fullSet.map((tag, i) => (
                          <span
                            key={i}
                            className="rounded-full bg-[#f0b429]/10 px-2.5 py-1 text-xs font-medium text-[#f0b429]"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                      {result.hashtags.warningFlags?.length > 0 && (
                        <p className="mt-2 text-xs text-red-400">
                          Warnings: {result.hashtags.warningFlags.join(", ")}
                        </p>
                      )}
                    </div>

                    {/* CTAs */}
                    <div>
                      <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#888888]">
                        CTA Options
                      </h4>
                      <div className="flex flex-col gap-2">
                        {result.ctas.ctas.map((cta, i) => (
                          <div
                            key={i}
                            className="flex items-center gap-3 rounded-lg border border-[#1a1a1a] bg-[#0d0d0d] px-4 py-2.5"
                          >
                            <Badge className="bg-[#f0b429]/10 text-[#f0b429] capitalize">
                              {cta.strength}
                            </Badge>
                            <span className="text-sm text-white">{cta.text}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Platform Tips */}
                    {result.formatted.instagram?.platformTips?.length > 0 && (
                      <div>
                        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#888888]">
                          Platform Tips
                        </h4>
                        <ul className="flex flex-col gap-1 text-xs text-[#888888]">
                          {result.formatted.instagram.platformTips.map((tip, i) => (
                            <li key={i}>- {tip}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </DarkCard>
                </TabsContent>

                {/* Facebook Tab */}
                <TabsContent value="facebook">
                  <DarkCard className="mt-4 flex flex-col gap-5">
                    <div className="flex items-center gap-2">
                      <Facebook className="h-5 w-5 text-[#f0b429]" />
                      <h3 className="text-lg font-semibold text-white">Facebook</h3>
                      {result.formatted.facebook?.characterCount && (
                        <Badge className="bg-[#1a1a1a] text-[#888888]">
                          {result.formatted.facebook.characterCount} chars
                        </Badge>
                      )}
                    </div>
                    <div className="rounded-lg border border-[#1f1f1f] bg-[#0d0d0d] p-4">
                      <p className="whitespace-pre-wrap text-sm leading-relaxed text-white">
                        {result.formatted.facebook?.formattedCaption ?? ""}
                      </p>
                    </div>
                    {result.formatted.facebook?.platformTips?.length > 0 && (
                      <ul className="flex flex-col gap-1 text-xs text-[#888888]">
                        {result.formatted.facebook.platformTips.map((tip, i) => (
                          <li key={i}>- {tip}</li>
                        ))}
                      </ul>
                    )}
                  </DarkCard>
                </TabsContent>

                {/* Twitter Tab */}
                <TabsContent value="twitter">
                  <DarkCard className="mt-4 flex flex-col gap-5">
                    <div className="flex items-center gap-2">
                      <Twitter className="h-5 w-5 text-[#f0b429]" />
                      <h3 className="text-lg font-semibold text-white">Twitter / X</h3>
                      {result.formatted.twitter?.characterCount && (
                        <Badge className="bg-[#1a1a1a] text-[#888888]">
                          {result.formatted.twitter.characterCount} chars
                        </Badge>
                      )}
                    </div>
                    <div className="rounded-lg border border-[#1f1f1f] bg-[#0d0d0d] p-4">
                      <p className="whitespace-pre-wrap text-sm leading-relaxed text-white">
                        {result.formatted.twitter?.formattedCaption ?? ""}
                      </p>
                    </div>
                    {result.formatted.twitter?.platformTips?.length > 0 && (
                      <ul className="flex flex-col gap-1 text-xs text-[#888888]">
                        {result.formatted.twitter.platformTips.map((tip, i) => (
                          <li key={i}>- {tip}</li>
                        ))}
                      </ul>
                    )}
                  </DarkCard>
                </TabsContent>

                {/* LinkedIn Tab */}
                <TabsContent value="linkedin">
                  <DarkCard className="mt-4 flex flex-col gap-5">
                    <div className="flex items-center gap-2">
                      <Linkedin className="h-5 w-5 text-[#f0b429]" />
                      <h3 className="text-lg font-semibold text-white">LinkedIn</h3>
                      {result.formatted.linkedin?.characterCount && (
                        <Badge className="bg-[#1a1a1a] text-[#888888]">
                          {result.formatted.linkedin.characterCount} chars
                        </Badge>
                      )}
                    </div>
                    <div className="rounded-lg border border-[#1f1f1f] bg-[#0d0d0d] p-4">
                      <p className="whitespace-pre-wrap text-sm leading-relaxed text-white">
                        {result.formatted.linkedin?.formattedCaption ?? ""}
                      </p>
                    </div>
                    {result.formatted.linkedin?.platformTips?.length > 0 && (
                      <ul className="flex flex-col gap-1 text-xs text-[#888888]">
                        {result.formatted.linkedin.platformTips.map((tip, i) => (
                          <li key={i}>- {tip}</li>
                        ))}
                      </ul>
                    )}
                  </DarkCard>
                </TabsContent>

                {/* Intelligence Tab */}
                <TabsContent value="intelligence">
                  <div className="mt-4 flex flex-col gap-4">
                    {/* Research Insights */}
                    <DarkCard>
                      <div className="mb-3 flex items-center gap-2">
                        <Brain className="h-4 w-4 text-[#f0b429]" />
                        <h4 className="text-sm font-semibold text-white">Research Insights</h4>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <IntelCard title="Trends" items={result.researchInsights.trends} />
                        <IntelCard title="Pain Points" items={result.researchInsights.audiencePainPoints} />
                        <IntelCard title="Content Angles" items={result.researchInsights.contentAngles} />
                        <IntelCard title="Viral Formats" items={result.researchInsights.viralFormats} />
                        <IntelCard title="Emotional Hooks" items={result.researchInsights.emotionalHooks} />
                        <IntelCard title="Competitor Gaps" items={result.researchInsights.competitorGaps} />
                      </div>
                    </DarkCard>

                    {/* Strategy */}
                    <DarkCard>
                      <div className="mb-3 flex items-center gap-2">
                        <Target className="h-4 w-4 text-[#f0b429]" />
                        <h4 className="text-sm font-semibold text-white">Strategy</h4>
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="rounded-lg bg-[#0d0d0d] p-3">
                          <span className="text-xs text-[#888888]">Format</span>
                          <p className="text-white">{result.strategy.format}</p>
                        </div>
                        <div className="rounded-lg bg-[#0d0d0d] p-3">
                          <span className="text-xs text-[#888888]">Platform</span>
                          <p className="text-white">{result.strategy.platform}</p>
                        </div>
                        <div className="rounded-lg bg-[#0d0d0d] p-3">
                          <span className="text-xs text-[#888888]">Tone</span>
                          <p className="text-white">{result.strategy.tone}</p>
                        </div>
                        <div className="rounded-lg bg-[#0d0d0d] p-3">
                          <span className="text-xs text-[#888888]">Engagement Score</span>
                          <p className="text-[#f0b429] font-semibold">{result.strategy.engagementScore}/10</p>
                        </div>
                        <div className="col-span-2 rounded-lg bg-[#0d0d0d] p-3">
                          <span className="text-xs text-[#888888]">Lead Hook</span>
                          <p className="text-white">{result.strategy.leadHook}</p>
                        </div>
                        <div className="col-span-2 rounded-lg bg-[#0d0d0d] p-3">
                          <span className="text-xs text-[#888888]">Strategy Rationale</span>
                          <p className="text-white">{result.strategy.strategyRationale}</p>
                        </div>
                      </div>
                    </DarkCard>

                    {/* Editor Notes */}
                    <DarkCard>
                      <div className="mb-3 flex items-center gap-2">
                        <Edit3 className="h-4 w-4 text-[#f0b429]" />
                        <h4 className="text-sm font-semibold text-white">Editor Notes</h4>
                      </div>
                      <div className="flex flex-col gap-3">
                        {result.captions.map((cap, i) => (
                          <div key={i} className="rounded-lg bg-[#0d0d0d] p-3">
                            <div className="mb-1 flex items-center gap-2">
                              <Badge className="bg-[#f0b429]/10 text-[#f0b429] capitalize">
                                {cap.type}
                              </Badge>
                            </div>
                            <p className="mb-2 whitespace-pre-wrap text-sm text-white">
                              {cap.text}
                            </p>
                            {cap.editorNotes && (
                              <p className="border-t border-[#1f1f1f] pt-2 text-xs italic text-[#888888]">
                                Editor: {cap.editorNotes}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </DarkCard>
                  </div>
                </TabsContent>

                {/* Visual Tab */}
                <TabsContent value="visual">
                  <DarkCard className="mt-4 flex flex-col gap-5">
                    <div className="flex items-center gap-2">
                      <Eye className="h-5 w-5 text-[#f0b429]" />
                      <h3 className="text-lg font-semibold text-white">Visual Concept</h3>
                    </div>

                    {/* DALL-E Prompt */}
                    <div>
                      <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#888888]">
                        DALL-E Prompt
                      </h4>
                      <div className="rounded-lg border border-[#1f1f1f] bg-[#0d0d0d] p-4 font-mono text-sm leading-relaxed text-[#f0b429]">
                        {result.visualConcept.dallePrompt}
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div className="rounded-lg bg-[#0d0d0d] p-3">
                        <span className="text-xs text-[#888888]">Color Mood</span>
                        <p className="text-sm text-white">{result.visualConcept.colorMood}</p>
                      </div>
                      <div className="rounded-lg bg-[#0d0d0d] p-3">
                        <span className="text-xs text-[#888888]">Composition</span>
                        <p className="text-sm text-white">{result.visualConcept.compositionStyle}</p>
                      </div>
                      <div className="rounded-lg bg-[#0d0d0d] p-3">
                        <span className="text-xs text-[#888888]">Visual Type</span>
                        <p className="text-sm text-white">{result.visualConcept.visualType}</p>
                      </div>
                    </div>

                    {result.visualConcept.reelSceneCount > 0 && (
                      <p className="text-xs text-[#888888]">
                        Reel Scenes: {result.visualConcept.reelSceneCount}
                      </p>
                    )}
                  </DarkCard>
                </TabsContent>
              </Tabs>

              {/* Bottom Action Bar */}
              <DarkCard className="flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <GoldButton
                    onClick={() =>
                      router.push(
                        `/create?imagePrompt=${encodeURIComponent(result.visualConcept.dallePrompt)}`
                      )
                    }
                  >
                    <Image className="h-4 w-4" />
                    Generate Image
                  </GoldButton>

                  <GoldButton
                    variant="secondary"
                    onClick={() => router.push("/calendar")}
                  >
                    <CalendarPlus className="h-4 w-4" />
                    Schedule This Post
                  </GoldButton>

                  <GoldButton
                    variant="secondary"
                    onClick={async () => {
                      try {
                        // Post is already saved during swarm — just confirm
                        alert(`All versions saved! Post ID: ${result.postId}`);
                      } catch {
                        alert("Failed to save.");
                      }
                    }}
                  >
                    <Save className="h-4 w-4" />
                    Save All Versions
                  </GoldButton>
                </div>

                {/* Swarm Metrics */}
                <div className="flex items-center gap-4 border-t border-[#1f1f1f] pt-3">
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-[#f0b429]" />
                    <span className="text-xs font-medium text-white">
                      Completed in {(result.swarmMetrics.totalMs / 1000).toFixed(1)}s across 6 agents
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(result.swarmMetrics.agentTimings).map(([name, ms]) => (
                      <span key={name} className="text-xs text-[#555555]">
                        {name}: {(ms / 1000).toFixed(1)}s
                      </span>
                    ))}
                  </div>
                </div>
              </DarkCard>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Sub-Components ────────────────────────────────────────────────────────

function IntelCard({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-lg bg-[#0d0d0d] p-3">
      <span className="mb-1.5 block text-xs font-semibold text-[#888888]">{title}</span>
      <ul className="flex flex-col gap-1">
        {(items ?? []).map((item, i) => (
          <li key={i} className="text-xs text-white">
            - {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

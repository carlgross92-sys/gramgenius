"use client";

import { useState } from "react";
import { GoldButton } from "@/components/ui/GoldButton";
import { DarkCard } from "@/components/ui/DarkCard";
import { Textarea } from "@/components/ui/textarea";
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
  Sparkles,
  Type,
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
} from "lucide-react";

type AgentStatus = "pending" | "running" | "complete" | "failed";

interface AgentRow {
  name: string;
  status: AgentStatus;
  timing?: number;
}

const INITIAL_AGENTS: AgentRow[] = [
  { name: "Research Agent", status: "pending" },
  { name: "Strategy Agent", status: "pending" },
  { name: "Copy Agent", status: "pending" },
  { name: "Editor Agent", status: "pending" },
  { name: "Parallel (Hashtags + Visual + CTA)", status: "pending" },
  { name: "Formatter Agent", status: "pending" },
  { name: "Media Agent", status: "pending" },
];

const AGENT_ICONS = [Brain, Target, PenTool, Edit3, Sparkles, Type, Zap];

export default function SwarmStudioPage() {
  const [topic, setTopic] = useState("");
  const [postType, setPostType] = useState("FEED");
  const [postGoal, setPostGoal] = useState("engagement");
  const [mediaType, setMediaType] = useState<"image" | "video" | "both">("image");
  const [subject, setSubject] = useState("");
  const [autoPost, setAutoPost] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [agents, setAgents] = useState<AgentRow[]>(INITIAL_AGENTS);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);

  async function launchSwarm() {
    if (!topic.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setAgents(INITIAL_AGENTS);

    // Simulate progress
    const delays = [0, 3000, 6000, 9000, 12000, 16000];
    const timers: ReturnType<typeof setTimeout>[] = [];
    for (let i = 0; i < 6; i++) {
      timers.push(
        setTimeout(() => {
          setAgents((prev) =>
            prev.map((a, idx) => {
              if (idx === i) return { ...a, status: "running" };
              if (idx === i - 1 && a.status === "running")
                return { ...a, status: "complete" };
              return a;
            })
          );
        }, delays[i])
      );
    }

    try {
      const res = await fetch("/api/swarm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, postType, postGoal, autoPost, mediaType, subject }),
      });

      const data = await res.json();
      timers.forEach(clearTimeout);

      if (!res.ok) {
        setError(data?.error || "Swarm failed");
        setAgents((prev) =>
          prev.map((a) =>
            a.status === "running" ? { ...a, status: "failed" } : a
          )
        );
        return;
      }

      setResult(data);
      const timings = (data?.swarmMetrics?.agentTimings || {}) as Record<string, number>;
      const timingKeys = ["Research", "Strategy", "Copy", "Editor", "Hashtag", "Formatter"];
      setAgents((prev) =>
        prev.map((a, i) => ({
          ...a,
          status: "complete" as const,
          timing: timings[timingKeys[i]] || 0,
        }))
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Swarm failed");
      setAgents((prev) =>
        prev.map((a) =>
          a.status === "running" ? { ...a, status: "failed" } : a
        )
      );
    } finally {
      setLoading(false);
    }
  }

  // Safe accessor helpers
  const r = result || {};
  const strategy = (r.strategy || {}) as Record<string, unknown>;
  const hashtags = (r.hashtags || {}) as Record<string, unknown>;
  const fullSet = Array.isArray(hashtags.fullSet) ? (hashtags.fullSet as string[]) : [];
  const warningFlags = Array.isArray(hashtags.warningFlags) ? (hashtags.warningFlags as string[]) : [];
  const captions = Array.isArray(r.captions) ? (r.captions as Array<Record<string, string>>) : [];
  const ctas = ((r.ctas || {}) as Record<string, unknown>).ctas;
  const ctaList = Array.isArray(ctas) ? (ctas as Array<Record<string, string>>) : [];
  interface PF { formattedCaption?: string; characterCount?: number; platformTips?: string[] }
  const fmt = (r.formatted || {}) as Record<string, PF>;
  const visual = (r.visualConcept || {}) as { dallePrompt?: string; colorMood?: string; compositionStyle?: string; visualType?: string };
  const metrics = (r.swarmMetrics || {}) as { totalMs?: number };
  const totalMs = metrics.totalMs ?? 0;

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="flex items-center gap-3 text-3xl font-bold text-white">
          <Zap className="text-[#f0b429]" />
          Swarm Studio
        </h1>
        <p className="mt-1 text-[#888]">
          6 specialized AI agents working together to create your best content
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* Left Panel */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <DarkCard>
            <h2 className="mb-4 text-lg font-semibold text-white">Content Swarm Input</h2>
            <div className="flex flex-col gap-4">
              <div>
                <label className="mb-1 block text-sm text-[#888]">Topic</label>
                <Textarea
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="What is this content about?"
                  rows={3}
                  className="border-[#1f1f1f] bg-[#0a0a0a] text-white"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-[#888]">Post Type</label>
                <Select value={postType} onValueChange={(v) => setPostType(v ?? "FEED")}>
                  <SelectTrigger className="border-[#1f1f1f] bg-[#0a0a0a] text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-[#1f1f1f] bg-[#111]">
                    <SelectItem value="FEED">Feed Post</SelectItem>
                    <SelectItem value="CAROUSEL">Carousel</SelectItem>
                    <SelectItem value="REEL">Reel</SelectItem>
                    <SelectItem value="STORY">Story</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="mb-1 block text-sm text-[#888]">Post Goal</label>
                <Select value={postGoal} onValueChange={(v) => setPostGoal(v ?? "engagement")}>
                  <SelectTrigger className="border-[#1f1f1f] bg-[#0a0a0a] text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-[#1f1f1f] bg-[#111]">
                    <SelectItem value="awareness">Awareness</SelectItem>
                    <SelectItem value="engagement">Engagement</SelectItem>
                    <SelectItem value="conversion">Conversion</SelectItem>
                    <SelectItem value="growth">Growth</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="mb-1 block text-sm text-[#888]">Media Type</label>
                <div className="grid grid-cols-3 gap-2">
                  {(["image", "video", "both"] as const).map((t) => (
                    <button key={t} onClick={() => setMediaType(t)}
                      className={`rounded-lg border px-3 py-2 text-sm capitalize transition ${
                        mediaType === t ? "border-[#f0b429] bg-[#f0b429]/10 text-[#f0b429]" : "border-[#1f1f1f] bg-[#0a0a0a] text-[#888] hover:text-white"
                      }`}>{t === "image" ? "\uD83D\uDDBC\uFE0F Image" : t === "video" ? "\uD83C\uDFAC Video" : "\uD83D\uDCF8 Both"}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm text-[#888]">Subject (optional)</label>
                <input value={subject} onChange={(e) => setSubject(e.target.value)}
                  placeholder='e.g. "golden retriever puppy"'
                  className="w-full rounded-lg border border-[#1f1f1f] bg-[#0a0a0a] px-3 py-2 text-sm text-white placeholder:text-[#555]" />
                <p className="mt-1 text-xs text-[#555]">Locks this animal/subject into all images</p>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-[#0a0a0a] border border-[#1f1f1f] p-3">
                <div>
                  <p className="text-sm text-white font-medium">Auto-Post to Instagram</p>
                  <p className="text-xs text-[#888]">Post immediately after generation</p>
                </div>
                <button
                  onClick={() => setAutoPost(!autoPost)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${autoPost ? "bg-[#f0b429]" : "bg-[#333]"}`}
                >
                  <span className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${autoPost ? "translate-x-6" : "translate-x-1"}`} />
                </button>
              </div>
              <GoldButton onClick={launchSwarm} disabled={loading || !topic.trim()} className="w-full">
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Zap className="h-4 w-4 mr-2" />}
                {loading ? "Running Swarm..." : "Launch Swarm"}
              </GoldButton>
            </div>
          </DarkCard>

          {/* Agent Progress */}
          <DarkCard>
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-white">
              <Clock className="h-5 w-5 text-[#f0b429]" />
              Agent Pipeline
            </h2>
            <div className="flex flex-col gap-2">
              {agents.map((agent, i) => {
                const Icon = AGENT_ICONS[i];
                return (
                  <div
                    key={agent.name}
                    className={`flex items-center gap-3 rounded-lg p-3 ${
                      agent.status === "running"
                        ? "bg-[#f0b429]/5 border border-[#f0b429]/20"
                        : agent.status === "complete"
                        ? "bg-[#22c55e]/5 border border-[#22c55e]/20"
                        : agent.status === "failed"
                        ? "bg-[#ef4444]/5 border border-[#ef4444]/20"
                        : "bg-[#0a0a0a] border border-[#1f1f1f]"
                    }`}
                  >
                    <Icon className={`h-4 w-4 ${
                      agent.status === "complete" ? "text-[#22c55e]" :
                      agent.status === "running" ? "text-[#f0b429]" : "text-[#555]"
                    }`} />
                    <span className={`flex-1 text-sm ${agent.status === "pending" ? "text-[#555]" : "text-white"}`}>
                      {agent.name}
                    </span>
                    {agent.status === "running" && <Loader2 className="h-4 w-4 animate-spin text-[#f0b429]" />}
                    {agent.status === "complete" && <CheckCircle className="h-4 w-4 text-[#22c55e]" />}
                    {agent.status === "failed" && <XCircle className="h-4 w-4 text-[#ef4444]" />}
                    {agent.status === "pending" && <div className="h-4 w-4 rounded-full bg-[#333]" />}
                    {(agent.timing ?? 0) > 0 && (
                      <span className="text-xs text-[#888]">{((agent.timing ?? 0) / 1000).toFixed(1)}s</span>
                    )}
                  </div>
                );
              })}
            </div>
          </DarkCard>

          {/* Continuous Mode */}
          <ContinuousMode />
        </div>

        {/* Right Panel */}
        <div className="lg:col-span-3">
          {error && (
            <DarkCard className="mb-6 border-[#ef4444]/30">
              <p className="text-[#ef4444] text-sm">{error}</p>
            </DarkCard>
          )}

          {!result && !loading && (
            <DarkCard className="flex flex-col items-center justify-center py-20">
              <Zap className="h-16 w-16 text-[#333] mb-4" />
              <p className="text-[#888] text-center">Enter a topic and launch the swarm to see results</p>
            </DarkCard>
          )}

          {loading && !result && (
            <DarkCard className="flex flex-col items-center justify-center py-20">
              <Loader2 className="h-12 w-12 animate-spin text-[#f0b429] mb-4" />
              <p className="text-white font-medium">Swarm is running...</p>
              <p className="text-[#888] text-sm mt-1">6 agents analyzing, writing, and optimizing</p>
            </DarkCard>
          )}

          {result && (
            <div className="flex flex-col gap-6">
              {/* Metrics bar */}
              <div className="flex items-center gap-2 text-xs text-[#888]">
                <Clock className="h-3 w-3" />
                Completed in {(totalMs / 1000).toFixed(1)}s across 7 agents
                {r.postId ? <span className="ml-2 text-[#22c55e]">Post saved as draft</span> : null}
              </div>

              {/* Media Agent Status */}
              {(() => {
                const ms = (r.mediaStatus || {}) as Record<string, unknown>;
                const errs = Array.isArray(r.mediaErrors) ? (r.mediaErrors as string[]) : [];
                return (
                  <DarkCard className={errs.length > 0 ? "border-[#f59e0b]/30" : "border-[#22c55e]/30"}>
                    <h3 className="text-sm font-semibold text-[#f0b429] mb-2">Media Agent</h3>
                    <div className="flex flex-col gap-1 text-sm">
                      {ms.imageGenerated ? (
                        <div className="flex items-center gap-2 text-[#22c55e]">
                          <CheckCircle className="h-3 w-3" /> Generated image
                        </div>
                      ) : null}
                      {(ms.scenesGenerated as number) > 0 ? (
                        <div className="flex items-center gap-2 text-[#22c55e]">
                          <CheckCircle className="h-3 w-3" /> Generated {String(ms.scenesGenerated)} scene images
                        </div>
                      ) : null}
                      {(ms.videosGenerated as number) > 0 ? (
                        <div className="flex items-center gap-2 text-[#22c55e]">
                          <CheckCircle className="h-3 w-3" /> Generated {String(ms.videosGenerated)} scene videos (Runway ML)
                        </div>
                      ) : null}
                      {ms.voiceoverGenerated ? (
                        <div className="flex items-center gap-2 text-[#22c55e]">
                          <CheckCircle className="h-3 w-3" /> Generated voiceover (ElevenLabs)
                        </div>
                      ) : null}
                      {ms.postedToInstagram ? (
                        <div className="flex items-center gap-2 text-[#22c55e]">
                          <CheckCircle className="h-3 w-3" /> Posted to Instagram
                        </div>
                      ) : null}
                      {errs.map((err, i) => (
                        <div key={i} className="flex items-center gap-2 text-[#ef4444]">
                          <XCircle className="h-3 w-3" /> {err}
                        </div>
                      ))}
                      {!ms.imageGenerated && !ms.scenesGenerated && errs.length === 0 ? (
                        <div className="text-[#888] text-xs">No media generated</div>
                      ) : null}
                    </div>
                  </DarkCard>
                );
              })()}

              {/* Instagram Caption */}
              <DarkCard>
                <h3 className="text-lg font-semibold text-white mb-3">Instagram Caption</h3>
                <div className="whitespace-pre-wrap rounded-lg bg-[#0a0a0a] p-4 text-white text-sm border border-[#1f1f1f] mb-4">
                  {fmt.instagram?.formattedCaption || captions[0]?.text || "No caption generated"}
                </div>
                {fmt.instagram?.characterCount ? (
                  <p className="text-xs text-[#888] mb-3">{fmt.instagram.characterCount} chars</p>
                ) : null}
              </DarkCard>

              {/* Hashtags */}
              {fullSet.length > 0 && (
                <DarkCard>
                  <h3 className="text-sm font-semibold text-[#f0b429] mb-3">Hashtags ({fullSet.length})</h3>
                  <div className="flex flex-wrap gap-2">
                    {fullSet.map((tag, i) => (
                      <span key={i} className="rounded-full bg-[#f0b429]/10 px-2 py-1 text-xs text-[#f0b429]">
                        #{tag}
                      </span>
                    ))}
                  </div>
                  {warningFlags.length > 0 && (
                    <p className="mt-2 text-xs text-[#ef4444]">Warnings: {warningFlags.join(", ")}</p>
                  )}
                </DarkCard>
              )}

              {/* CTAs */}
              {ctaList.length > 0 && (
                <DarkCard>
                  <h3 className="text-sm font-semibold text-[#f0b429] mb-3">Call-to-Action Options</h3>
                  {ctaList.map((cta, i) => (
                    <div key={i} className="flex items-center gap-3 rounded-lg bg-[#0a0a0a] p-3 border border-[#1f1f1f] mb-2">
                      <span className="rounded-full bg-[#f0b429]/10 px-2 py-0.5 text-xs text-[#f0b429] capitalize">
                        {cta.strength || "cta"}
                      </span>
                      <span className="text-white text-sm">{cta.text || ""}</span>
                    </div>
                  ))}
                </DarkCard>
              )}

              {/* Strategy */}
              <DarkCard>
                <h3 className="text-sm font-semibold text-[#f0b429] mb-3">Strategy</h3>
                <div className="grid grid-cols-3 gap-3 mb-3">
                  <div className="rounded-lg bg-[#0a0a0a] p-3 border border-[#1f1f1f]">
                    <p className="text-xs text-[#888]">Format</p>
                    <p className="text-white text-sm">{String(strategy.format ?? "—")}</p>
                  </div>
                  <div className="rounded-lg bg-[#0a0a0a] p-3 border border-[#1f1f1f]">
                    <p className="text-xs text-[#888]">Tone</p>
                    <p className="text-white text-sm">{String(strategy.tone || "—")}</p>
                  </div>
                  <div className="rounded-lg bg-[#0a0a0a] p-3 border border-[#1f1f1f]">
                    <p className="text-xs text-[#888]">Engagement</p>
                    <p className="text-[#f0b429] text-sm font-bold">{String(strategy.engagementScore || "—")}/10</p>
                  </div>
                </div>
                <p className="text-[#888] text-xs">{String(strategy.strategyRationale || "")}</p>
              </DarkCard>

              {/* Captions */}
              {captions.length > 0 && (
                <DarkCard>
                  <h3 className="text-sm font-semibold text-[#f0b429] mb-3">Caption Variations</h3>
                  {captions.map((cap, i) => (
                    <div key={i} className="mb-3 rounded-lg bg-[#0a0a0a] p-3 border border-[#1f1f1f]">
                      <span className="rounded-full bg-[#f0b429]/10 px-2 py-0.5 text-xs text-[#f0b429] mb-2 inline-block">
                        {cap.type || `Variation ${i + 1}`}
                      </span>
                      <p className="text-white text-sm whitespace-pre-wrap">{cap.text || ""}</p>
                      {cap.editorNotes && (
                        <p className="text-[#888] text-xs mt-2 italic">Editor: {cap.editorNotes}</p>
                      )}
                    </div>
                  ))}
                </DarkCard>
              )}

              {/* Visual Concept */}
              {visual.dallePrompt ? (
                <DarkCard>
                  <h3 className="text-sm font-semibold text-[#f0b429] mb-3">Visual Concept</h3>
                  <div className="rounded-lg bg-[#0a0a0a] p-4 text-white text-sm border border-[#f0b429]/20 font-mono mb-3">
                    {visual.dallePrompt}
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="rounded-lg bg-[#0a0a0a] p-3 border border-[#1f1f1f]">
                      <p className="text-xs text-[#888]">Color Mood</p>
                      <p className="text-white text-sm">{visual.colorMood || "—"}</p>
                    </div>
                    <div className="rounded-lg bg-[#0a0a0a] p-3 border border-[#1f1f1f]">
                      <p className="text-xs text-[#888]">Composition</p>
                      <p className="text-white text-sm">{visual.compositionStyle || "—"}</p>
                    </div>
                    <div className="rounded-lg bg-[#0a0a0a] p-3 border border-[#1f1f1f]">
                      <p className="text-xs text-[#888]">Type</p>
                      <p className="text-white text-sm">{visual.visualType || "—"}</p>
                    </div>
                  </div>
                </DarkCard>
              ) : null}

              {/* Other Platforms */}
              {(fmt.facebook?.formattedCaption || fmt.twitter?.formattedCaption || fmt.linkedin?.formattedCaption) ? (
                <DarkCard>
                  <h3 className="text-sm font-semibold text-[#f0b429] mb-3">Other Platforms</h3>
                  {fmt.facebook?.formattedCaption ? (
                    <div className="mb-3">
                      <p className="text-xs text-[#888] mb-1">Facebook</p>
                      <p className="text-white text-sm whitespace-pre-wrap bg-[#0a0a0a] p-3 rounded-lg border border-[#1f1f1f]">
                        {fmt.facebook.formattedCaption}
                      </p>
                    </div>
                  ) : null}
                  {fmt.twitter?.formattedCaption ? (
                    <div className="mb-3">
                      <p className="text-xs text-[#888] mb-1">Twitter/X</p>
                      <p className="text-white text-sm whitespace-pre-wrap bg-[#0a0a0a] p-3 rounded-lg border border-[#1f1f1f]">
                        {fmt.twitter.formattedCaption}
                      </p>
                    </div>
                  ) : null}
                  {fmt.linkedin?.formattedCaption ? (
                    <div>
                      <p className="text-xs text-[#888] mb-1">LinkedIn</p>
                      <p className="text-white text-sm whitespace-pre-wrap bg-[#0a0a0a] p-3 rounded-lg border border-[#1f1f1f]">
                        {fmt.linkedin.formattedCaption}
                      </p>
                    </div>
                  ) : null}
                </DarkCard>
              ) : null}

              {/* Media Agent Results */}
              {(r.generatedImageUrl || (Array.isArray(r.sceneVideos) && (r.sceneVideos as string[]).length > 0)) ? (
                <DarkCard className="border-[#f0b429]/20">
                  <h3 className="text-sm font-semibold text-[#f0b429] mb-3">Generated Media</h3>
                  {r.generatedImageUrl ? (
                    <img
                      src={String(r.generatedImageUrl)}
                      alt="Generated"
                      className="w-full max-w-sm rounded-lg border border-[#1f1f1f] mb-3"
                    />
                  ) : null}
                  {Array.isArray(r.sceneVideos) && (r.sceneVideos as string[]).length > 0 ? (
                    <div className="grid grid-cols-3 gap-2 mb-3">
                      {(r.sceneVideos as string[]).map((url, i) => (
                        <video key={i} src={url} controls className="w-full rounded-lg border border-[#1f1f1f]" />
                      ))}
                    </div>
                  ) : null}
                  {r.voiceoverUrl ? (
                    <div className="mb-3">
                      <p className="text-xs text-[#888] mb-1">Voiceover</p>
                      <audio src={String(r.voiceoverUrl)} controls className="w-full" />
                    </div>
                  ) : null}
                  {r.instagramPostId ? (
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle className="h-4 w-4 text-[#22c55e]" />
                      <span className="text-[#22c55e]">Posted to Instagram</span>
                      {r.instagramUrl ? (
                        <a href={String(r.instagramUrl)} target="_blank" rel="noopener noreferrer" className="text-[#f0b429] underline text-xs">
                          View Post
                        </a>
                      ) : null}
                    </div>
                  ) : null}
                  <div className="flex flex-wrap gap-2 mt-3">
                    <GoldButton onClick={() => { setResult(null); setAgents(INITIAL_AGENTS); launchSwarm(); }} className="text-sm">
                      {"\uD83D\uDD04"} Make Another
                    </GoldButton>
                    <GoldButton variant="secondary" onClick={() => { setResult(null); setAgents(INITIAL_AGENTS); setMediaType("image"); launchSwarm(); }} className="text-sm">
                      {"\uD83C\uDFA8"} New Image
                    </GoldButton>
                    <a href="/media"><GoldButton variant="secondary" className="text-sm">{"\uD83D\uDCBE"} Media Library</GoldButton></a>
                    <a href="/calendar"><GoldButton variant="secondary" className="text-sm">{"\uD83D\uDCC5"} Schedule</GoldButton></a>
                  </div>
                </DarkCard>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Continuous Mode Component ──────────────────────────────────────────────

function ContinuousMode() {
  const [enabled, setEnabled] = useState(false);
  const [theme, setTheme] = useState("");
  const [postsPerDay, setPostsPerDay] = useState(3);
  const [contMediaType, setContMediaType] = useState<"image" | "video" | "both">("image");
  const [schedule, setSchedule] = useState<"immediate" | "scheduled" | "queue">("queue");
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<{
    total: number;
    succeeded: number;
    failed: number;
    results: Array<{ topic: string; status: string; imageUrl?: string; errors: string[] }>;
  } | null>(null);

  async function startContinuous() {
    setRunning(true);
    setProgress(null);
    try {
      const res = await fetch("/api/auto/continuous", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ theme: theme || undefined, postsPerDay, mediaType: contMediaType, schedule }),
      });
      const data = await res.json();
      if (data.error) {
        setProgress({ total: 0, succeeded: 0, failed: 1, results: [{ topic: "", status: "failed", errors: [data.error] }] });
      } else {
        setProgress(data);
      }
    } catch (e) {
      setProgress({ total: 0, succeeded: 0, failed: 1, results: [{ topic: "", status: "failed", errors: [e instanceof Error ? e.message : "Failed"] }] });
    } finally {
      setRunning(false);
    }
  }

  if (!enabled) {
    return (
      <DarkCard>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">🔄</span>
            <div>
              <p className="text-sm font-medium text-white">Continuous Mode</p>
              <p className="text-xs text-[#888]">Auto-create content based on theme</p>
            </div>
          </div>
          <button
            onClick={() => setEnabled(true)}
            className="rounded-full bg-[#333] px-3 py-1 text-xs text-[#888] hover:text-white"
          >
            Enable
          </button>
        </div>
      </DarkCard>
    );
  }

  return (
    <DarkCard className="border-[#f0b429]/20">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-lg">🔄</span>
          <h3 className="text-sm font-semibold text-[#f0b429]">CONTINUOUS MODE</h3>
        </div>
        <button
          onClick={() => setEnabled(false)}
          className="rounded-full bg-[#f0b429] px-3 py-1 text-xs font-bold text-black"
        >
          ON
        </button>
      </div>

      <div className="flex flex-col gap-3">
        <div>
          <label className="mb-1 block text-xs text-[#888]">Theme (optional)</label>
          <input
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
            placeholder='e.g. "funny dogs" or leave blank for auto'
            className="w-full rounded-lg border border-[#1f1f1f] bg-[#0a0a0a] px-3 py-2 text-sm text-white placeholder:text-[#555]"
          />
        </div>

        <div className="flex gap-4">
          <div className="flex-1">
            <label className="mb-1 block text-xs text-[#888]">Posts ({postsPerDay})</label>
            <input
              type="range" min={1} max={7} value={postsPerDay}
              onChange={(e) => setPostsPerDay(Number(e.target.value))}
              className="w-full accent-[#f0b429]"
            />
          </div>
          <div className="flex-1">
            <label className="mb-1 block text-xs text-[#888]">Media</label>
            <div className="flex gap-1">
              {(["image", "video", "both"] as const).map((t) => (
                <button key={t} onClick={() => setContMediaType(t)}
                  className={`rounded px-2 py-1 text-xs capitalize ${contMediaType === t ? "bg-[#f0b429]/20 text-[#f0b429]" : "bg-[#0a0a0a] text-[#888]"}`}
                >{t}</button>
              ))}
            </div>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs text-[#888]">Schedule</label>
          <div className="flex flex-col gap-1">
            {(["immediate", "scheduled", "queue"] as const).map((s) => (
              <label key={s} className="flex items-center gap-2 text-sm text-white cursor-pointer">
                <input
                  type="radio" name="schedule" checked={schedule === s}
                  onChange={() => setSchedule(s)}
                  className="accent-[#f0b429]"
                />
                {s === "immediate" ? "Post immediately" : s === "scheduled" ? "Schedule at best times" : "Add to queue"}
              </label>
            ))}
          </div>
        </div>

        <GoldButton onClick={startContinuous} disabled={running} className="w-full">
          {running ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Zap className="h-4 w-4 mr-2" />}
          {running ? `Creating ${postsPerDay} posts...` : "Start Continuous Mode"}
        </GoldButton>

        {/* Progress */}
        {running && (
          <div className="rounded-lg bg-[#0a0a0a] p-3 border border-[#1f1f1f]">
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-[#f0b429]" />
              <span className="text-sm text-white">Generating content...</span>
            </div>
            <p className="text-xs text-[#888] mt-1">This may take several minutes for {postsPerDay} posts</p>
          </div>
        )}

        {/* Results */}
        {progress && !running && (
          <div className="rounded-lg bg-[#0a0a0a] p-3 border border-[#1f1f1f]">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="h-4 w-4 text-[#22c55e]" />
              <span className="text-sm text-white">
                {progress.succeeded}/{progress.total} posts created
              </span>
            </div>
            <div className="flex flex-col gap-2 max-h-48 overflow-y-auto">
              {(progress.results || []).map((r, i) => (
                <div key={i} className="flex items-center gap-2">
                  {r.imageUrl ? (
                    <img src={r.imageUrl} alt="" className="h-8 w-8 rounded object-cover" />
                  ) : (
                    <div className="h-8 w-8 rounded bg-[#1f1f1f]" />
                  )}
                  <span className="flex-1 text-xs text-white truncate">{r.topic}</span>
                  <span className={`text-xs ${r.status === "failed" ? "text-[#ef4444]" : "text-[#22c55e]"}`}>
                    {r.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </DarkCard>
  );
}

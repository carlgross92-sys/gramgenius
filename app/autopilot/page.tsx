"use client";

import { useState, useEffect, useCallback } from "react";
import { DarkCard } from "@/components/ui/DarkCard";
import { GoldButton } from "@/components/ui/GoldButton";
import {
  Bot,
  Zap,
  Play,
  Square,
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
} from "lucide-react";

export default function AutopilotPage() {
  const [engine, setEngine] = useState<Record<string, unknown> | null>(null);
  const [brand, setBrand] = useState<Record<string, unknown> | null>(null);
  const [jobs, setJobs] = useState<Array<Record<string, unknown>>>([]);
  const [stats, setStats] = useState<Record<string, number>>({});
  const [postsPerDay, setPostsPerDay] = useState(7);
  const [loading, setLoading] = useState(false);
  const [quickTopic, setQuickTopic] = useState("");
  const [quickLoading, setQuickLoading] = useState(false);

  const getBrandId = () => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("gramgenius-active-brand");
  };

  const fetchEngine = useCallback(async () => {
    try {
      const brandId = getBrandId();
      const url = brandId
        ? `/api/engine?brandId=${brandId}`
        : "/api/engine";
      const res = await fetch(url);
      if (!res.ok) return;
      const data = await res.json();
      setEngine(data.engine ?? null);
      setBrand(data.brand ?? null);
      setJobs(data.jobs ?? []);
      setStats(data.stats ?? {});
      if (data.engine?.postsPerDay) {
        setPostsPerDay(Number(data.engine.postsPerDay));
      }
    } catch (err) {
      console.error("[Autopilot] Failed to fetch engine:", err);
    }
  }, []);

  // Fetch on mount + auto-refresh every 30s
  useEffect(() => {
    fetchEngine();
    const interval = setInterval(fetchEngine, 30_000);
    return () => clearInterval(interval);
  }, [fetchEngine]);

  const isRunning = engine ? Boolean(engine.enabled) : false;

  const toggleEngine = async () => {
    setLoading(true);
    try {
      const brandId = getBrandId();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (brandId) headers["x-brand-id"] = brandId;

      const newEnabled = !isRunning;

      await fetch("/api/engine", {
        method: "POST",
        headers,
        body: JSON.stringify({ enabled: newEnabled, postsPerDay }),
      });

      // If enabling, also kick off content generation
      if (newEnabled) {
        await fetch("/api/cron/generate-content", {
          method: "POST",
          headers,
        }).catch(() => {
          // non-critical
        });
      }

      await fetchEngine();
    } catch (err) {
      console.error("[Autopilot] toggleEngine error:", err);
    } finally {
      setLoading(false);
    }
  };

  const quickCreate = async () => {
    if (!quickTopic.trim()) return;
    setQuickLoading(true);
    try {
      const brandId = getBrandId();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (brandId) headers["x-brand-id"] = brandId;

      await fetch("/api/swarm", {
        method: "POST",
        headers,
        body: JSON.stringify({
          topic: quickTopic,
          postType: "REEL",
          autoPost: true,
          brandProfileId: brandId,
        }),
      });

      setQuickTopic("");
      await fetchEngine();
    } catch (err) {
      console.error("[Autopilot] quickCreate error:", err);
    } finally {
      setQuickLoading(false);
    }
  };

  const updatePostsPerDay = async (value: number) => {
    setPostsPerDay(value);
    try {
      const brandId = getBrandId();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (brandId) headers["x-brand-id"] = brandId;

      await fetch("/api/engine", {
        method: "POST",
        headers,
        body: JSON.stringify({ postsPerDay: value }),
      });
    } catch (err) {
      console.error("[Autopilot] updatePostsPerDay error:", err);
    }
  };

  const retryJob = async (jobId: string) => {
    try {
      const brandId = getBrandId();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (brandId) headers["x-brand-id"] = brandId;

      await fetch("/api/cron/generate-content", {
        method: "POST",
        headers,
        body: JSON.stringify({ retryJobId: jobId }),
      });
      await fetchEngine();
    } catch (err) {
      console.error("[Autopilot] retryJob error:", err);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return <CheckCircle className="h-4 w-4 text-[#22c55e]" />;
      case "PROCESSING":
        return <Loader2 className="h-4 w-4 animate-spin text-[#f0b429]" />;
      case "QUEUED":
        return <Clock className="h-4 w-4 text-[#888]" />;
      case "FAILED":
      case "QUALITY_FAILED":
        return <XCircle className="h-4 w-4 text-[#ef4444]" />;
      default:
        return <Clock className="h-4 w-4 text-[#888]" />;
    }
  };

  const brandName = brand ? String(brand.name ?? "Unknown") : "No brand selected";
  const brandHandle = brand ? String(brand.handle ?? "") : "";
  const brandVoice = brand ? String(brand.voice ?? "") : "";
  const brandPillars: string[] = Array.isArray(brand?.pillars) ? (brand.pillars as string[]) : [];

  return (
    <div className="min-h-screen bg-[#0a0a0a] p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Bot className="h-7 w-7 text-[#f0b429]" />
          <h1 className="text-2xl font-bold text-white tracking-wide">AUTOPILOT</h1>
        </div>
        <p className="text-sm text-[#888]">
          {brandName}
          {brandHandle ? ` (@${brandHandle})` : ""}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Main Control Panel */}
        <DarkCard className="lg:col-span-1">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-white">Engine Control</h2>
            <button onClick={fetchEngine} className="text-[#888] hover:text-white transition-colors">
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>

          {/* Status indicator */}
          <div className="flex items-center justify-between mb-6 rounded-lg border border-[#1f1f1f] bg-[#0a0a0a] px-4 py-3">
            <div className="flex items-center gap-3">
              <span className={`text-lg ${isRunning ? "text-[#22c55e]" : "text-[#ef4444]"}`}>●</span>
              <span className="text-sm font-semibold text-white">
                {isRunning ? "RUNNING" : "STOPPED"}
              </span>
            </div>
            <GoldButton
              onClick={toggleEngine}
              disabled={loading}
              variant={isRunning ? "danger" : "primary"}
              className="text-xs px-3 py-1.5"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : isRunning ? (
                <>
                  <Square className="h-3 w-3" /> Stop
                </>
              ) : (
                <>
                  <Play className="h-3 w-3" /> Start
                </>
              )}
            </GoldButton>
          </div>

          {/* Brand Brain Summary */}
          {brand && (
            <div className="mb-6 space-y-2">
              <h3 className="text-xs uppercase tracking-wider text-[#888]">Brand Brain</h3>
              <p className="text-sm text-white">{brandName}</p>
              {brandVoice && (
                <p className="text-xs text-[#888]">
                  Voice: <span className="text-[#ccc]">{brandVoice}</span>
                </p>
              )}
              {brandPillars.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {brandPillars.slice(0, 5).map((pillar, i) => (
                    <span
                      key={i}
                      className="rounded-full border border-[#1f1f1f] bg-[#0a0a0a] px-2 py-0.5 text-[10px] text-[#ccc]"
                    >
                      {pillar}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Posts Per Day Slider */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs uppercase tracking-wider text-[#888]">Posts Per Day</h3>
              <span className="text-sm font-bold text-[#f0b429]">{postsPerDay}</span>
            </div>
            <input
              type="range"
              min={1}
              max={30}
              value={postsPerDay}
              onChange={(e) => updatePostsPerDay(Number(e.target.value))}
              className="w-full accent-[#f0b429] cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-[#555] mt-1">
              <span>1</span>
              <span>15</span>
              <span>30</span>
            </div>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: "Queued", value: stats.queued ?? 0, color: "text-[#888]" },
              { label: "Processing", value: stats.processing ?? 0, color: "text-[#f0b429]" },
              { label: "Completed", value: stats.completed ?? 0, color: "text-[#22c55e]" },
              { label: "Failed", value: stats.failed ?? 0, color: "text-[#ef4444]" },
            ].map((s) => (
              <div key={s.label} className="rounded-lg border border-[#1f1f1f] bg-[#0a0a0a] p-2.5 text-center">
                <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
                <p className="text-[10px] text-[#888]">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Additional stats */}
          <div className="mt-3 flex items-center gap-4 text-xs text-[#888]">
            <span>
              Posted today: <span className="text-white font-medium">{stats.postedToday ?? 0}</span> / {stats.dailyTarget ?? postsPerDay}
            </span>
            <span>
              Total IG posts: <span className="text-white font-medium">{stats.postedToInstagram ?? 0}</span>
            </span>
          </div>
        </DarkCard>

        {/* Queue Section */}
        <DarkCard className="lg:col-span-1">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Zap className="h-4 w-4 text-[#f0b429]" />
              TODAY&apos;S QUEUE
            </h2>
            <span className="text-xs text-[#888]">{jobs.length} jobs</span>
          </div>

          <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
            {jobs.length === 0 ? (
              <p className="py-8 text-center text-sm text-[#555]">
                No jobs yet. Start the engine or use Quick Create below.
              </p>
            ) : (
              jobs.map((job) => {
                const status = String(job.status ?? "QUEUED");
                const topic = String(job.topic ?? job.theme ?? "Untitled");
                const isFailed = status === "FAILED" || status === "QUALITY_FAILED";
                const igPostId = job.instagramPostId ? String(job.instagramPostId) : null;
                const createdAt = job.createdAt ? new Date(String(job.createdAt)) : null;

                return (
                  <div
                    key={String(job.id)}
                    className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 ${
                      isFailed
                        ? "border-[#ef4444]/30 bg-[#ef4444]/5"
                        : "border-[#1f1f1f] bg-[#0a0a0a]"
                    }`}
                  >
                    {getStatusIcon(status)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white truncate">{topic}</p>
                      <div className="flex items-center gap-2 text-[10px] text-[#888]">
                        <span>{status}</span>
                        {createdAt && (
                          <span>
                            {createdAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        )}
                        {igPostId && (
                          <a
                            href={`https://www.instagram.com/p/${igPostId}/`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[#f0b429] hover:underline"
                          >
                            View on IG
                          </a>
                        )}
                      </div>
                    </div>
                    {isFailed && (
                      <button
                        onClick={() => retryJob(String(job.id))}
                        className="shrink-0 rounded bg-[#ef4444]/20 px-2 py-1 text-[10px] font-semibold text-[#ef4444] hover:bg-[#ef4444]/30 transition-colors"
                      >
                        Retry
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </DarkCard>
      </div>

      {/* Quick Create */}
      <DarkCard className="mt-6">
        <div className="flex items-center gap-2 mb-4">
          <Zap className="h-4 w-4 text-[#f0b429]" />
          <h2 className="text-lg font-semibold text-white">Quick Create</h2>
        </div>
        <div className="flex gap-3">
          <input
            type="text"
            value={quickTopic}
            onChange={(e) => setQuickTopic(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !quickLoading) quickCreate();
            }}
            placeholder="Enter a topic and hit Generate..."
            className="flex-1 rounded-lg border border-[#1f1f1f] bg-[#0a0a0a] px-4 py-2.5 text-sm text-white placeholder-[#555] outline-none focus:border-[#f0b429]/50 transition-colors"
          />
          <GoldButton onClick={quickCreate} disabled={quickLoading || !quickTopic.trim()}>
            {quickLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Zap className="h-4 w-4" />
                Generate &amp; Post Now
              </>
            )}
          </GoldButton>
        </div>
      </DarkCard>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  FileText,
  Clock,
  CheckCircle,
  Edit3,
  PenSquare,
  Film,
  TrendingUp,
  Hash,
  Loader2,
  Heart,
  Zap,
  Play,
  Calendar as CalendarIcon,
} from "lucide-react";
import { Header } from "@/components/layout/Header";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { RecentPosts } from "@/components/dashboard/RecentPosts";
import { UpcomingSchedule } from "@/components/dashboard/UpcomingSchedule";
import { ContentPillarChart } from "@/components/dashboard/ContentPillarChart";
import { GoldButton } from "@/components/ui/GoldButton";
import { DarkCard } from "@/components/ui/DarkCard";

interface PostStats {
  total: number;
  scheduled: number;
  publishedThisWeek: number;
  drafts: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<PostStats>({
    total: 0,
    scheduled: 0,
    publishedThisWeek: 0,
    drafts: 0,
  });
  const [brandActive, setBrandActive] = useState(false);
  const [healthScore, setHealthScore] = useState(0);
  const [recentPosts, setRecentPosts] = useState<Array<{id:string;caption:string;postType:string;status:string;scheduledAt?:string|null}>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [autopilot, setAutopilot] = useState({
    enabled: false,
    lastRun: null as string | null,
    nextRun: null as string | null,
    publishedToday: 0,
    scheduledToday: 0,
    reelsThisWeek: 0,
    nextPostTime: null as string | null,
    nextPostTopic: null as string | null,
  });
  const [engineConfig, setEngineConfig] = useState({
    feedPostsPerDay: 7,
    reelsPerDay: 3,
    maxPostsPerDay: 10,
  });
  const [runningEngine, setRunningEngine] = useState(false);

  const loadAutopilotStatus = async () => {
    try {
      const [statusRes, configRes] = await Promise.allSettled([
        fetch("/api/auto/status"),
        fetch("/api/auto/config"),
      ]);

      if (statusRes.status === "fulfilled" && statusRes.value.ok) {
        const data = await statusRes.value.json();
        setAutopilot((prev) => ({
          ...prev,
          enabled: data.enabled ?? prev.enabled,
          lastRun: data.lastRun ?? prev.lastRun,
          nextRun: data.nextRun ?? prev.nextRun,
          publishedToday: data.publishedToday ?? prev.publishedToday,
          scheduledToday: data.scheduledToday ?? prev.scheduledToday,
          reelsThisWeek: data.reelsThisWeek ?? prev.reelsThisWeek,
          nextPostTime: data.nextPostTime ?? prev.nextPostTime,
          nextPostTopic: data.nextPostTopic ?? prev.nextPostTopic,
        }));
      }

      if (configRes.status === "fulfilled" && configRes.value.ok) {
        const data = await configRes.value.json();
        setEngineConfig((prev) => ({
          feedPostsPerDay: data.feedPostsPerDay ?? prev.feedPostsPerDay,
          reelsPerDay: data.reelsPerDay ?? prev.reelsPerDay,
          maxPostsPerDay: data.maxPostsPerDay ?? prev.maxPostsPerDay,
        }));
      }
    } catch {
      // Silently fail — autopilot status is non-critical
    }
  };

  const toggleAutopilot = async () => {
    try {
      const res = await fetch("/api/auto/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !autopilot.enabled }),
      });
      if (res.ok) {
        setAutopilot((prev) => ({ ...prev, enabled: !prev.enabled }));
      }
    } catch {
      // Silently fail
    }
  };

  const runEngineNow = async () => {
    setRunningEngine(true);
    try {
      await fetch("/api/auto/daily-engine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      await loadAutopilotStatus();
    } catch {
      // Silently fail
    } finally {
      setRunningEngine(false);
    }
  };

  const updateConfig = async (newConfig: Partial<typeof engineConfig>) => {
    const merged = { ...engineConfig, ...newConfig };
    setEngineConfig(merged);
    try {
      await fetch("/api/auto/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(merged),
      });
    } catch {
      // Silently fail
    }
  };

  useEffect(() => {
    loadAutopilotStatus();
    const interval = setInterval(loadAutopilotStatus, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);

        const [postsRes, brandRes] = await Promise.allSettled([
          fetch("/api/posts"),
          fetch("/api/brand"),
        ]);

        if (postsRes.status === "fulfilled" && postsRes.value.ok) {
          const postsData = await postsRes.value.json();
          const posts = postsData.posts || postsData.data || postsData || [];
          const now = new Date();
          const weekStart = new Date(now);
          weekStart.setDate(now.getDate() - now.getDay());
          weekStart.setHours(0, 0, 0, 0);

          setStats({
            total: posts.length,
            scheduled: posts.filter(
              (p: { status: string }) => p.status === "SCHEDULED"
            ).length,
            publishedThisWeek: posts.filter(
              (p: { status: string; publishedAt?: string }) =>
                p.status === "PUBLISHED" &&
                p.publishedAt &&
                new Date(p.publishedAt) >= weekStart
            ).length,
            drafts: posts.filter(
              (p: { status: string }) => p.status === "DRAFT"
            ).length,
          });

          // Calculate health score based on post activity
          const score = Math.min(
            100,
            Math.round(
              (posts.length * 5 +
                posts.filter(
                  (p: { status: string }) => p.status === "PUBLISHED"
                ).length *
                  10) /
                2
            )
          );
          setHealthScore(score || 42);
          setRecentPosts(posts.slice(0, 10));
        }

        if (brandRes.status === "fulfilled" && brandRes.value.ok) {
          const brandData = await brandRes.value.json();
          setBrandActive(!!brandData?.brandName || !!brandData?.handle);
        }
      } catch {
        setError("Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  const quickActions = [
    { label: "Create Post", href: "/create", icon: PenSquare },
    { label: "Make a Reel", href: "/reels", icon: Film },
    { label: "Research Trends", href: "/ideas", icon: TrendingUp },
    { label: "Find Hashtags", href: "/hashtags", icon: Hash },
  ];

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#f0b429]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <DarkCard className="text-center">
          <p className="text-[#ef4444]">{error}</p>
          <GoldButton className="mt-4" onClick={() => window.location.reload()}>
            Retry
          </GoldButton>
        </DarkCard>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <Header title="Dashboard" brandActive={brandActive} />

      <div className="flex flex-col gap-6 p-6">
        {/* Hero header */}
        <div>
          <h2 className="text-3xl font-bold text-[#f0b429]">GramGenius</h2>
          <p className="text-[#888888]">Your Instagram AI Growth Engine</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatsCard icon={FileText} label="Total Posts" value={stats.total} />
          <StatsCard icon={Clock} label="Scheduled" value={stats.scheduled} />
          <StatsCard
            icon={CheckCircle}
            label="Published This Week"
            value={stats.publishedThisWeek}
          />
          <StatsCard icon={Edit3} label="Drafts" value={stats.drafts} />
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap gap-3">
          {quickActions.map((action) => (
            <Link key={action.href} href={action.href}>
              <GoldButton>
                <action.icon className="h-4 w-4" />
                {action.label}
              </GoldButton>
            </Link>
          ))}
        </div>

        {/* Autopilot Control Panel */}
        <DarkCard glow className="flex flex-col gap-5">
          {/* Header row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {autopilot.enabled && (
                <span className="relative flex h-3 w-3">
                  <span className="absolute inline-flex h-full w-full animate-pulse rounded-full bg-[#22c55e] opacity-75" />
                  <span className="relative inline-flex h-3 w-3 rounded-full bg-[#22c55e]" />
                </span>
              )}
              <Zap className="h-5 w-5 text-[#f0b429]" />
              <h3 className="text-lg font-bold text-white tracking-wide">AUTOPILOT</h3>
            </div>
            <button
              onClick={toggleAutopilot}
              className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 ${
                autopilot.enabled ? "bg-[#f0b429]" : "bg-[#333]"
              }`}
              role="switch"
              aria-checked={autopilot.enabled}
            >
              <span
                className={`inline-block h-5 w-5 rounded-full bg-white shadow-md transition-transform duration-200 ${
                  autopilot.enabled ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>

          {/* Status indicators 2x2 grid */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="flex items-center gap-2">
              <CalendarIcon className="h-4 w-4 text-[#f0b429]" />
              <div>
                <p className="text-xs text-[#888]">Next Post</p>
                <p className="text-sm font-medium text-white">
                  {autopilot.nextPostTime
                    ? new Date(autopilot.nextPostTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                    : "—"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-[#f0b429]" />
              <div>
                <p className="text-xs text-[#888]">Published Today</p>
                <p className="text-sm font-medium text-white">{autopilot.publishedToday}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Film className="h-4 w-4 text-[#f0b429]" />
              <div>
                <p className="text-xs text-[#888]">Reels This Week</p>
                <p className="text-sm font-medium text-white">{autopilot.reelsThisWeek}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-[#f0b429]" />
              <div>
                <p className="text-xs text-[#888]">Engine Schedule</p>
                <p className="text-sm font-medium text-white">
                  {autopilot.nextRun
                    ? new Date(autopilot.nextRun).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                    : "Idle"}
                </p>
              </div>
            </div>
          </div>

          {/* Action buttons row */}
          <div className="flex flex-wrap gap-3">
            <GoldButton onClick={runEngineNow} disabled={runningEngine}>
              {runningEngine ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              {runningEngine ? "Running..." : "Run Engine Now"}
            </GoldButton>
            <Link href="/calendar">
              <GoldButton variant="secondary">
                <CalendarIcon className="h-4 w-4" />
                View Schedule
              </GoldButton>
            </Link>
          </div>

          {/* Sliders row */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs text-[#888]">Feed posts / day</label>
                <span className="text-sm font-medium text-white">{engineConfig.feedPostsPerDay}</span>
              </div>
              <input
                type="range"
                min={1}
                max={30}
                value={engineConfig.feedPostsPerDay}
                onChange={(e) =>
                  setEngineConfig((prev) => ({ ...prev, feedPostsPerDay: Number(e.target.value) }))
                }
                onMouseUp={() => updateConfig({ feedPostsPerDay: engineConfig.feedPostsPerDay })}
                onTouchEnd={() => updateConfig({ feedPostsPerDay: engineConfig.feedPostsPerDay })}
                className="w-full accent-[#f0b429]"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs text-[#888]">Reels / day</label>
                <span className="text-sm font-medium text-white">{engineConfig.reelsPerDay}</span>
              </div>
              <input
                type="range"
                min={0}
                max={30}
                value={engineConfig.reelsPerDay}
                onChange={(e) =>
                  setEngineConfig((prev) => ({ ...prev, reelsPerDay: Number(e.target.value) }))
                }
                onMouseUp={() => updateConfig({ reelsPerDay: engineConfig.reelsPerDay })}
                onTouchEnd={() => updateConfig({ reelsPerDay: engineConfig.reelsPerDay })}
                className="w-full accent-[#f0b429]"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs text-[#888]">Max / day</label>
                <span className="text-sm font-medium text-white">{engineConfig.maxPostsPerDay}</span>
              </div>
              <input
                type="range"
                min={1}
                max={30}
                value={engineConfig.maxPostsPerDay}
                onChange={(e) =>
                  setEngineConfig((prev) => ({ ...prev, maxPostsPerDay: Number(e.target.value) }))
                }
                onMouseUp={() => updateConfig({ maxPostsPerDay: engineConfig.maxPostsPerDay })}
                onTouchEnd={() => updateConfig({ maxPostsPerDay: engineConfig.maxPostsPerDay })}
                className="w-full accent-[#f0b429]"
              />
            </div>
          </div>
        </DarkCard>

        {/* Content Grid */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Recent Posts - spans 2 cols */}
          <div className="lg:col-span-2">
            <RecentPosts posts={recentPosts.map(p => ({
              id: p.id,
              caption: p.caption,
              type: (p.postType || "FEED") as "FEED"|"REEL"|"CAROUSEL"|"STORY",
              status: p.status as "DRAFT"|"SCHEDULED"|"PUBLISHED"|"FAILED",
              scheduledAt: p.scheduledAt,
            }))} />
          </div>

          {/* Account Health Score */}
          <DarkCard glow className="flex flex-col items-center gap-4">
            <h3 className="text-sm font-medium text-[#888888]">
              Account Health Score
            </h3>
            <div className="relative flex h-36 w-36 items-center justify-center">
              <svg className="h-36 w-36 -rotate-90" viewBox="0 0 144 144">
                <circle
                  cx="72"
                  cy="72"
                  r="60"
                  fill="none"
                  stroke="#1f1f1f"
                  strokeWidth="10"
                />
                <circle
                  cx="72"
                  cy="72"
                  r="60"
                  fill="none"
                  stroke={
                    healthScore >= 70
                      ? "#22c55e"
                      : healthScore >= 40
                        ? "#f0b429"
                        : "#ef4444"
                  }
                  strokeWidth="10"
                  strokeLinecap="round"
                  strokeDasharray={`${(healthScore / 100) * 377} 377`}
                />
              </svg>
              <div className="absolute flex flex-col items-center">
                <span className="text-3xl font-bold text-white">
                  {healthScore}
                </span>
                <span className="text-xs text-[#888888]">/ 100</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Heart className="h-4 w-4 text-[#f0b429]" />
              <span className="text-sm text-[#888888]">
                {healthScore >= 70
                  ? "Healthy"
                  : healthScore >= 40
                    ? "Needs Attention"
                    : "Critical"}
              </span>
            </div>
          </DarkCard>
        </div>

        {/* Upcoming Schedule & Content Pillar Chart */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <UpcomingSchedule posts={recentPosts.filter(p => p.scheduledAt).map(p => ({
            id: p.id,
            type: (p.postType || "FEED") as "FEED"|"REEL"|"CAROUSEL"|"STORY",
            status: p.status as "DRAFT"|"SCHEDULED"|"PUBLISHED"|"FAILED",
            scheduledAt: p.scheduledAt || new Date().toISOString(),
          }))} />
          <ContentPillarChart posts={recentPosts.map(p => ({
            id: p.id,
            type: (p.postType || "FEED") as "FEED"|"REEL"|"CAROUSEL"|"STORY",
          }))} />
        </div>
      </div>
    </div>
  );
}

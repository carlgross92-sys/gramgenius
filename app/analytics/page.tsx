"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/layout/Header";
import { GoldButton } from "@/components/ui/GoldButton";
import { DarkCard } from "@/components/ui/DarkCard";
import { GrowthChart } from "@/components/analytics/GrowthChart";
import { TopPostsTable } from "@/components/analytics/TopPostsTable";
import {
  Loader2,
  TrendingUp,
  BarChart3,
  FileText,
  Sparkles,
} from "lucide-react";

interface GrowthData {
  date: string;
  followers: number;
  engagementRate: number;
  reach: number;
}

interface Post {
  id: string;
  topic: string;
  caption: string;
  postType: string;
  status: string;
  likes: number;
  comments: number;
  reach: number;
  saves: number;
  publishedAt: string | null;
}

interface ContentBreakdown {
  type: string;
  count: number;
  avgReach: number;
  avgLikes: number;
}

interface AIReport {
  whatsWorking: string;
  bestContentType: string;
  bestHookStyle: string;
  strategyAdjustments: string[];
}

export default function AnalyticsPage() {
  const [growthData, setGrowthData] = useState<GrowthData[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [report, setReport] = useState<AIReport | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [growthRes, postsRes] = await Promise.allSettled([
          fetch("/api/analytics/growth"),
          fetch("/api/posts"),
        ]);

        if (growthRes.status === "fulfilled" && growthRes.value.ok) {
          const data = await growthRes.value.json();
          setGrowthData(data.data || data || []);
        }

        if (postsRes.status === "fulfilled" && postsRes.value.ok) {
          const data = await postsRes.value.json();
          setPosts(data.posts || data.data || data || []);
        }
      } catch {
        // Silent fail
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  function getContentBreakdown(): ContentBreakdown[] {
    const types = ["Feed", "Reel", "Carousel", "Story"];
    return types.map((type) => {
      const typePosts = posts.filter(
        (p) =>
          p.postType === type && p.status === "PUBLISHED"
      );
      const count = typePosts.length;
      const avgReach =
        count > 0
          ? Math.round(
              typePosts.reduce((sum, p) => sum + (p.reach || 0), 0) / count
            )
          : 0;
      const avgLikes =
        count > 0
          ? Math.round(
              typePosts.reduce((sum, p) => sum + (p.likes || 0), 0) / count
            )
          : 0;
      return { type, count, avgReach, avgLikes };
    });
  }

  async function generateReport() {
    try {
      setGeneratingReport(true);
      const res = await fetch("/api/analytics/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          posts: posts.filter((p) => p.status === "PUBLISHED"),
          growthData,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setReport(
          data.report || {
            whatsWorking: data.whatsWorking || "Analysis pending",
            bestContentType: data.bestContentType || "N/A",
            bestHookStyle: data.bestHookStyle || "N/A",
            strategyAdjustments: data.strategyAdjustments || [],
          }
        );
      }
    } catch {
      // Silent fail
    } finally {
      setGeneratingReport(false);
    }
  }

  const breakdown = getContentBreakdown();
  const maxBreakdownReach = Math.max(...breakdown.map((b) => b.avgReach), 1);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#f0b429]" />
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <Header title="Analytics" />

      <div className="flex flex-col gap-6 p-6">
        {/* Growth Chart */}
        <DarkCard>
          <div className="mb-4 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-[#f0b429]" />
            <h3 className="text-lg font-semibold text-white">
              90-Day Growth Chart
            </h3>
          </div>
          <GrowthChart data={growthData} />
        </DarkCard>

        {/* Top Posts Table */}
        <DarkCard>
          <div className="mb-4 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-[#f0b429]" />
            <h3 className="text-lg font-semibold text-white">
              Best Performing Posts
            </h3>
          </div>
          <TopPostsTable posts={posts.filter(p => p.status === "PUBLISHED").map(p => ({
            id: p.id,
            caption: p.caption,
            type: p.postType as "FEED" | "REEL" | "CAROUSEL" | "STORY",
            likes: p.likes,
            comments: p.comments,
            saves: p.saves,
            reach: p.reach,
            engagementRate: p.reach > 0 ? ((p.likes + p.comments + p.saves) / p.reach) * 100 : 0,
          }))} />
        </DarkCard>

        {/* Content Type Breakdown */}
        <DarkCard>
          <div className="mb-4 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-[#f0b429]" />
            <h3 className="text-lg font-semibold text-white">
              Content Type Breakdown
            </h3>
          </div>
          <div className="flex flex-col gap-4">
            {breakdown.map((item) => {
              const barWidth =
                maxBreakdownReach > 0
                  ? (item.avgReach / maxBreakdownReach) * 100
                  : 0;
              const colors: Record<string, string> = {
                Feed: "#3b82f6",
                Reel: "#a855f7",
                Carousel: "#22c55e",
                Story: "#f0b429",
              };
              return (
                <div key={item.type} className="flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-white">
                      {item.type}
                    </span>
                    <span className="text-xs text-[#888888]">
                      {item.count} posts | Avg Reach: {item.avgReach.toLocaleString()} | Avg Likes: {item.avgLikes.toLocaleString()}
                    </span>
                  </div>
                  <div className="h-6 w-full rounded-full bg-[#1f1f1f]">
                    <div
                      className="flex h-6 items-center rounded-full px-2 text-xs font-medium text-white transition-all duration-500"
                      style={{
                        width: `${Math.max(barWidth, 5)}%`,
                        backgroundColor:
                          colors[item.type] || "#f0b429",
                      }}
                    >
                      {item.avgReach > 0 && item.avgReach.toLocaleString()}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </DarkCard>

        {/* AI Monthly Report */}
        <DarkCard glow>
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-[#f0b429]" />
              <h3 className="text-lg font-semibold text-white">
                AI Monthly Report
              </h3>
            </div>
            <GoldButton onClick={generateReport} disabled={generatingReport}>
              {generatingReport ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              Generate Monthly Report
            </GoldButton>
          </div>

          {report ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="rounded-lg border border-[#1f1f1f] bg-[#1a1a1a] p-4">
                <h4 className="mb-2 text-sm font-medium text-[#f0b429]">
                  What&apos;s Working
                </h4>
                <p className="text-sm text-[#cccccc]">
                  {report.whatsWorking}
                </p>
              </div>
              <div className="rounded-lg border border-[#1f1f1f] bg-[#1a1a1a] p-4">
                <h4 className="mb-2 text-sm font-medium text-[#f0b429]">
                  Best Content Type
                </h4>
                <p className="text-sm text-[#cccccc]">
                  {report.bestContentType}
                </p>
              </div>
              <div className="rounded-lg border border-[#1f1f1f] bg-[#1a1a1a] p-4">
                <h4 className="mb-2 text-sm font-medium text-[#f0b429]">
                  Best Hook Style
                </h4>
                <p className="text-sm text-[#cccccc]">
                  {report.bestHookStyle}
                </p>
              </div>
              <div className="rounded-lg border border-[#1f1f1f] bg-[#1a1a1a] p-4">
                <h4 className="mb-2 text-sm font-medium text-[#f0b429]">
                  Strategy Adjustments
                </h4>
                <ul className="flex flex-col gap-1">
                  {report.strategyAdjustments.map((adj, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2 text-sm text-[#cccccc]"
                    >
                      <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#f0b429]" />
                      {adj}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            <p className="text-sm text-[#888888]">
              Generate a report to get AI-powered insights about your content
              performance and strategy recommendations.
            </p>
          )}
        </DarkCard>
      </div>
    </div>
  );
}

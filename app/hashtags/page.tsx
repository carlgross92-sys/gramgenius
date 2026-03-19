"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/layout/Header";
import { GoldButton } from "@/components/ui/GoldButton";
import { DarkCard } from "@/components/ui/DarkCard";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Loader2,
  Hash,
  Search,
  AlertTriangle,
  TrendingUp,
  ArrowUpDown,
  Trash2,
} from "lucide-react";

interface ResearchedHashtag {
  tag: string;
  size: number;
  tier: "mega" | "mid" | "niche" | "micro";
  recommended: boolean;
  banned: boolean;
}

interface HashtagPerformance {
  id: string;
  tag: string;
  size: number;
  timesUsed: number;
  avgReach: number;
  avgLikes: number;
}

type SortKey = "tag" | "size" | "timesUsed" | "avgReach" | "avgLikes";
type SortDir = "asc" | "desc";

export default function HashtagsPage() {
  const [keyword, setKeyword] = useState("");
  const [researching, setResearching] = useState(false);
  const [researchResults, setResearchResults] = useState<ResearchedHashtag[]>(
    []
  );
  const [performance, setPerformance] = useState<HashtagPerformance[]>([]);
  const [loadingPerformance, setLoadingPerformance] = useState(true);
  const [sortKey, setSortKey] = useState<SortKey>("avgReach");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  useEffect(() => {
    async function loadPerformance() {
      try {
        const res = await fetch("/api/hashtags/performance");
        if (res.ok) {
          const data = await res.json();
          setPerformance(data.hashtags || data || []);
        }
      } catch {
        // Silent fail
      } finally {
        setLoadingPerformance(false);
      }
    }
    loadPerformance();
  }, []);

  async function handleResearch() {
    if (!keyword.trim()) return;
    try {
      setResearching(true);
      setResearchResults([]);
      const res = await fetch("/api/hashtags/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyword: keyword.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        setResearchResults(data.hashtags || data || []);
      }
    } catch {
      // Silent fail
    } finally {
      setResearching(false);
    }
  }

  async function retireHashtag(id: string) {
    try {
      await fetch(`/api/hashtags/${id}`, { method: "DELETE" });
      setPerformance((prev) => prev.filter((h) => h.id !== id));
    } catch {
      // Silent fail
    }
  }

  function getTierHashtags(tier: string) {
    return researchResults.filter((h) => h.tier === tier);
  }

  function getRecommendedSet() {
    return researchResults.filter((h) => h.recommended);
  }

  const tierConfig = {
    mega: {
      label: "Mega (1M+)",
      color: "text-purple-400",
      bg: "bg-purple-400/10",
    },
    mid: {
      label: "Mid (100K-1M)",
      color: "text-blue-400",
      bg: "bg-blue-400/10",
    },
    niche: {
      label: "Niche (10K-100K)",
      color: "text-[#f0b429]",
      bg: "bg-[#f0b429]/10",
    },
    micro: {
      label: "Micro (<10K)",
      color: "text-[#22c55e]",
      bg: "bg-[#22c55e]/10",
    },
  };

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  const sortedPerformance = [...performance].sort((a, b) => {
    const aVal = a[sortKey];
    const bVal = b[sortKey];
    if (typeof aVal === "string" && typeof bVal === "string") {
      return sortDir === "asc"
        ? aVal.localeCompare(bVal)
        : bVal.localeCompare(aVal);
    }
    return sortDir === "asc"
      ? (aVal as number) - (bVal as number)
      : (bVal as number) - (aVal as number);
  });

  return (
    <div className="flex flex-col">
      <Header title="Hashtag Intelligence" />

      <div className="flex flex-col gap-6 p-6">
        {/* Research Section */}
        <DarkCard glow>
          <div className="mb-4 flex items-center gap-2">
            <Search className="h-5 w-5 text-[#f0b429]" />
            <h3 className="text-lg font-semibold text-white">
              Hashtag Research
            </h3>
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <Input
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleResearch()}
                className="border-[#1f1f1f] bg-[#1a1a1a] text-white"
                placeholder="Enter a keyword to research hashtags..."
              />
            </div>
            <GoldButton
              onClick={handleResearch}
              disabled={researching || !keyword.trim()}
            >
              {researching ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Hash className="h-4 w-4" />
              )}
              Research
            </GoldButton>
          </div>
        </DarkCard>

        {/* Research Results */}
        {researchResults.length > 0 && (
          <div className="flex flex-col gap-4">
            {/* Recommended Set */}
            {getRecommendedSet().length > 0 && (
              <DarkCard className="border-[#f0b429]/30">
                <div className="mb-3 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-[#f0b429]" />
                  <h4 className="text-sm font-semibold text-[#f0b429]">
                    Recommended 20-Tag Set
                  </h4>
                </div>
                <div className="flex flex-wrap gap-2">
                  {getRecommendedSet()
                    .slice(0, 20)
                    .map((h) => (
                      <span
                        key={h.tag}
                        className="rounded-full bg-[#f0b429]/15 px-3 py-1 text-sm font-medium text-[#f0b429]"
                      >
                        #{h.tag.replace(/^#/, "")}
                      </span>
                    ))}
                </div>
              </DarkCard>
            )}

            {/* Banned warnings */}
            {researchResults.some((h) => h.banned) && (
              <DarkCard className="border-[#ef4444]/30">
                <div className="mb-2 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-[#ef4444]" />
                  <h4 className="text-sm font-semibold text-[#ef4444]">
                    Banned / Restricted Tags
                  </h4>
                </div>
                <div className="flex flex-wrap gap-2">
                  {researchResults
                    .filter((h) => h.banned)
                    .map((h) => (
                      <span
                        key={h.tag}
                        className="rounded-full bg-[#ef4444]/15 px-3 py-1 text-sm text-[#ef4444] line-through"
                      >
                        #{h.tag.replace(/^#/, "")}
                      </span>
                    ))}
                </div>
              </DarkCard>
            )}

            {/* 4-tier columns */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              {(Object.keys(tierConfig) as Array<keyof typeof tierConfig>).map(
                (tier) => {
                  const tierTags = getTierHashtags(tier);
                  const config = tierConfig[tier];
                  return (
                    <DarkCard key={tier}>
                      <h4
                        className={`mb-3 text-sm font-semibold ${config.color}`}
                      >
                        {config.label} ({tierTags.length})
                      </h4>
                      <div className="flex flex-col gap-1.5 max-h-[400px] overflow-y-auto">
                        {tierTags.map((h) => (
                          <div
                            key={h.tag}
                            className={`flex items-center justify-between rounded-md px-2 py-1.5 text-sm ${config.bg} ${h.recommended ? "ring-1 ring-[#f0b429]/40" : ""} ${h.banned ? "opacity-40 line-through" : ""}`}
                          >
                            <span className={config.color}>
                              #{h.tag.replace(/^#/, "")}
                            </span>
                            <span className="text-xs text-[#888888]">
                              {h.size >= 1000000
                                ? `${(h.size / 1000000).toFixed(1)}M`
                                : h.size >= 1000
                                  ? `${(h.size / 1000).toFixed(0)}K`
                                  : h.size}
                            </span>
                          </div>
                        ))}
                        {tierTags.length === 0 && (
                          <p className="py-2 text-center text-xs text-[#555555]">
                            No tags in this tier
                          </p>
                        )}
                      </div>
                    </DarkCard>
                  );
                }
              )}
            </div>
          </div>
        )}

        {/* Performance Section */}
        <DarkCard>
          <div className="mb-4 flex items-center gap-2">
            <BarChartIcon className="h-5 w-5 text-[#f0b429]" />
            <h3 className="text-lg font-semibold text-white">
              Hashtag Performance
            </h3>
          </div>

          {loadingPerformance ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-[#f0b429]" />
            </div>
          ) : sortedPerformance.length === 0 ? (
            <p className="py-8 text-center text-[#888888]">
              No hashtag performance data yet. Start posting to track hashtag
              effectiveness.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#1f1f1f]">
                    {[
                      { key: "tag" as SortKey, label: "Tag" },
                      { key: "size" as SortKey, label: "Size" },
                      { key: "timesUsed" as SortKey, label: "Times Used" },
                      { key: "avgReach" as SortKey, label: "Avg Reach" },
                      { key: "avgLikes" as SortKey, label: "Avg Likes" },
                    ].map((col) => (
                      <th
                        key={col.key}
                        className="cursor-pointer px-4 py-3 text-left text-xs font-medium text-[#888888] hover:text-white"
                        onClick={() => toggleSort(col.key)}
                      >
                        <div className="flex items-center gap-1">
                          {col.label}
                          <ArrowUpDown className="h-3 w-3" />
                        </div>
                      </th>
                    ))}
                    <th className="px-4 py-3 text-right text-xs font-medium text-[#888888]">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedPerformance.map((h) => (
                    <tr
                      key={h.id}
                      className="border-b border-[#1f1f1f]/50 transition-colors hover:bg-[#1a1a1a]"
                    >
                      <td className="px-4 py-3 text-sm font-medium text-[#f0b429]">
                        #{h.tag.replace(/^#/, "")}
                      </td>
                      <td className="px-4 py-3 text-sm text-[#cccccc]">
                        {h.size >= 1000000
                          ? `${(h.size / 1000000).toFixed(1)}M`
                          : h.size >= 1000
                            ? `${(h.size / 1000).toFixed(0)}K`
                            : h.size}
                      </td>
                      <td className="px-4 py-3 text-sm text-[#cccccc]">
                        {h.timesUsed}
                      </td>
                      <td className="px-4 py-3 text-sm text-[#cccccc]">
                        {h.avgReach.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-sm text-[#cccccc]">
                        {h.avgLikes.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => retireHashtag(h.id)}
                          className="rounded-lg p-1.5 text-[#888888] transition-colors hover:bg-[#ef4444]/10 hover:text-[#ef4444]"
                          title="Retire hashtag"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </DarkCard>
      </div>
    </div>
  );
}

function BarChartIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <line x1="12" x2="12" y1="20" y2="10" />
      <line x1="18" x2="18" y1="20" y2="4" />
      <line x1="6" x2="6" y1="20" y2="16" />
    </svg>
  );
}

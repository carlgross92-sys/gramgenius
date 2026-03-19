"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { GoldButton } from "@/components/ui/GoldButton";
import { DarkCard } from "@/components/ui/DarkCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Loader2,
  TrendingUp,
  Sparkles,
  ArrowRight,
  Hash,
} from "lucide-react";

interface Idea {
  id: string;
  title: string;
  trendingReason: string;
  postType: string;
  captionAngle: string;
  hashtags: string[];
  used: boolean;
  createdAt: string;
}

type FilterTab = "all" | "unused" | "used" | "reels" | "carousels" | "feed";

export default function IdeasPage() {
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [generatedIdeas, setGeneratedIdeas] = useState<Idea[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterTab>("all");

  useEffect(() => {
    async function loadIdeas() {
      try {
        const res = await fetch("/api/ideas");
        if (res.ok) {
          const data = await res.json();
          setIdeas(data.ideas || data || []);
        }
      } catch {
        // Silent fail
      } finally {
        setLoading(false);
      }
    }
    loadIdeas();
  }, []);

  async function researchTrends() {
    try {
      setGenerating(true);
      setGeneratedIdeas([]);
      const res = await fetch("/api/generate/ideas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (res.ok) {
        const data = await res.json();
        setGeneratedIdeas(data.ideas || data || []);
      }
    } catch {
      // Silent fail
    } finally {
      setGenerating(false);
    }
  }

  function getPostTypeBadge(type: string) {
    const colors: Record<string, string> = {
      Feed: "bg-blue-500/15 text-blue-400",
      Reel: "bg-purple-500/15 text-purple-400",
      Carousel: "bg-green-500/15 text-green-400",
      Story: "bg-orange-500/15 text-orange-400",
    };
    return colors[type] || "bg-[#1f1f1f] text-[#888888]";
  }

  const filteredIdeas = ideas.filter((idea) => {
    switch (activeFilter) {
      case "unused":
        return !idea.used;
      case "used":
        return idea.used;
      case "reels":
        return idea.postType?.toLowerCase() === "reel";
      case "carousels":
        return idea.postType?.toLowerCase() === "carousel";
      case "feed":
        return idea.postType?.toLowerCase() === "feed";
      default:
        return true;
    }
  });

  return (
    <div className="flex flex-col">
      <Header title="Trend Research" />

      <div className="flex flex-col gap-6 p-6">
        {/* Research CTA */}
        <DarkCard glow className="flex flex-col items-center gap-4 py-8">
          <TrendingUp className="h-10 w-10 text-[#f0b429]" />
          <h2 className="text-xl font-bold text-white">
            Discover Trending Content Ideas
          </h2>
          <p className="max-w-md text-center text-sm text-[#888888]">
            AI analyzes trending topics in your niche and generates content
            ideas tailored to your brand voice and audience.
          </p>
          <GoldButton onClick={researchTrends} disabled={generating}>
            {generating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            Research Trends Now
          </GoldButton>
        </DarkCard>

        {/* Loading spinner */}
        {generating && (
          <div className="flex flex-col items-center gap-3 py-8">
            <Loader2 className="h-8 w-8 animate-spin text-[#f0b429]" />
            <p className="text-sm text-[#888888]">
              Analyzing trends and generating ideas...
            </p>
          </div>
        )}

        {/* Generated Ideas */}
        {generatedIdeas.length > 0 && (
          <div className="flex flex-col gap-4">
            <h3 className="text-lg font-semibold text-white">
              Fresh Ideas ({generatedIdeas.length})
            </h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {generatedIdeas.map((idea) => (
                <DarkCard
                  key={idea.id}
                  className="flex flex-col gap-3 transition-all hover:border-[#f0b429]/30"
                >
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-bold text-white">{idea.title}</h4>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${getPostTypeBadge(idea.postType)}`}
                    >
                      {idea.postType}
                    </span>
                  </div>
                  <p className="text-sm text-[#f0b429]">
                    {idea.trendingReason}
                  </p>
                  <p className="text-sm text-[#888888]">{idea.captionAngle}</p>
                  <div className="flex flex-wrap gap-1">
                    {idea.hashtags?.slice(0, 5).map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center rounded-full bg-[#1a1a1a] px-2 py-0.5 text-xs text-[#888888]"
                      >
                        <Hash className="mr-0.5 h-3 w-3" />
                        {tag.replace(/^#/, "")}
                      </span>
                    ))}
                  </div>
                  <Link href={`/create?idea=${idea.id}`}>
                    <GoldButton variant="secondary" className="mt-auto w-full">
                      Use This Idea
                      <ArrowRight className="h-4 w-4" />
                    </GoldButton>
                  </Link>
                </DarkCard>
              ))}
            </div>
          </div>
        )}

        {/* Saved Ideas */}
        <div className="flex flex-col gap-4">
          <h3 className="text-lg font-semibold text-white">Saved Ideas</h3>

          <Tabs
            value={activeFilter}
            onValueChange={(v) => setActiveFilter(v as FilterTab)}
          >
            <TabsList className="bg-[#111111]">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="unused">Unused</TabsTrigger>
              <TabsTrigger value="used">Used</TabsTrigger>
              <TabsTrigger value="reels">Reels</TabsTrigger>
              <TabsTrigger value="carousels">Carousels</TabsTrigger>
              <TabsTrigger value="feed">Feed</TabsTrigger>
            </TabsList>
          </Tabs>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-[#f0b429]" />
            </div>
          ) : filteredIdeas.length === 0 ? (
            <DarkCard className="py-8 text-center">
              <p className="text-[#888888]">
                No ideas found. Research some trends to get started!
              </p>
            </DarkCard>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredIdeas.map((idea) => (
                <DarkCard
                  key={idea.id}
                  className="flex flex-col gap-3 transition-all hover:border-[#f0b429]/30"
                >
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-bold text-white">{idea.title}</h4>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${getPostTypeBadge(idea.postType)}`}
                    >
                      {idea.postType}
                    </span>
                  </div>
                  <p className="text-sm text-[#f0b429]">
                    {idea.trendingReason}
                  </p>
                  <p className="text-sm text-[#888888]">{idea.captionAngle}</p>
                  <div className="flex flex-wrap gap-1">
                    {idea.hashtags?.slice(0, 5).map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center rounded-full bg-[#1a1a1a] px-2 py-0.5 text-xs text-[#888888]"
                      >
                        <Hash className="mr-0.5 h-3 w-3" />
                        {tag.replace(/^#/, "")}
                      </span>
                    ))}
                  </div>
                  <div className="mt-auto flex items-center justify-between">
                    {idea.used ? (
                      <StatusBadge status="PUBLISHED" />
                    ) : (
                      <StatusBadge status="DRAFT" />
                    )}
                    <Link href={`/create?idea=${idea.id}`}>
                      <GoldButton variant="secondary">
                        Use
                        <ArrowRight className="h-3 w-3" />
                      </GoldButton>
                    </Link>
                  </div>
                </DarkCard>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

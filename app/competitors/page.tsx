"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { GoldButton } from "@/components/ui/GoldButton";
import { DarkCard } from "@/components/ui/DarkCard";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Loader2,
  Users,
  Plus,
  X,
  Search,
  Lightbulb,
  ArrowRight,
  Target,
} from "lucide-react";

interface CompetitorResult {
  handle: string;
  niche: string;
  followers: number;
  engagementRate: number;
  insightsSummary: string;
  contentGaps: string[];
  topAngles: string[];
}

export default function CompetitorsPage() {
  const router = useRouter();
  const [handles, setHandles] = useState<string[]>([""]);
  const [analyzing, setAnalyzing] = useState(false);
  const [results, setResults] = useState<CompetitorResult[]>([]);
  const [contentGapReport, setContentGapReport] = useState<string[]>([]);

  function addHandle() {
    if (handles.length < 5) {
      setHandles((prev) => [...prev, ""]);
    }
  }

  function removeHandle(index: number) {
    setHandles((prev) => prev.filter((_, i) => i !== index));
  }

  function updateHandle(index: number, value: string) {
    setHandles((prev) =>
      prev.map((h, i) => (i === index ? value.replace(/^@/, "") : h))
    );
  }

  async function analyze() {
    const validHandles = handles.filter((h) => h.trim());
    if (validHandles.length === 0) return;

    try {
      setAnalyzing(true);
      setResults([]);
      setContentGapReport([]);

      const res = await fetch("/api/competitors/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ handles: validHandles }),
      });

      if (res.ok) {
        const data = await res.json();
        setResults(data.competitors || data.results || []);
        setContentGapReport(data.contentGaps || data.gapReport || []);
      }
    } catch {
      // Silent fail
    } finally {
      setAnalyzing(false);
    }
  }

  function borrowAngle(angle: string) {
    const encoded = encodeURIComponent(angle);
    router.push(`/create?topic=${encoded}`);
  }

  return (
    <div className="flex flex-col">
      <Header title="Competitor Analysis" />

      <div className="flex flex-col gap-6 p-6">
        {/* Input Section */}
        <DarkCard glow>
          <div className="mb-4 flex items-center gap-2">
            <Users className="h-5 w-5 text-[#f0b429]" />
            <h3 className="text-lg font-semibold text-white">
              Competitor Handles
            </h3>
          </div>
          <p className="mb-4 text-sm text-[#888888]">
            Add up to 5 competitor Instagram handles to analyze their content
            strategy.
          </p>

          <div className="flex flex-col gap-3">
            {handles.map((handle, index) => (
              <div key={index} className="flex items-center gap-2">
                <span className="flex h-10 items-center rounded-l-md border border-r-0 border-[#1f1f1f] bg-[#1a1a1a] px-3 text-[#888888]">
                  @
                </span>
                <Input
                  value={handle}
                  onChange={(e) => updateHandle(index, e.target.value)}
                  className="rounded-l-none border-[#1f1f1f] bg-[#1a1a1a] text-white"
                  placeholder={`competitor${index + 1}`}
                />
                {handles.length > 1 && (
                  <button
                    onClick={() => removeHandle(index)}
                    className="rounded-lg p-2 text-[#888888] hover:bg-[#1f1f1f] hover:text-white"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}

            <div className="flex gap-3">
              {handles.length < 5 && (
                <GoldButton variant="secondary" onClick={addHandle}>
                  <Plus className="h-4 w-4" />
                  Add Handle
                </GoldButton>
              )}
              <GoldButton
                onClick={analyze}
                disabled={analyzing || handles.every((h) => !h.trim())}
              >
                {analyzing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
                Analyze
              </GoldButton>
            </div>
          </div>
        </DarkCard>

        {/* Loading */}
        {analyzing && (
          <div className="flex flex-col items-center gap-3 py-8">
            <Loader2 className="h-8 w-8 animate-spin text-[#f0b429]" />
            <p className="text-sm text-[#888888]">
              Analyzing competitor profiles...
            </p>
          </div>
        )}

        {/* Results Grid */}
        {results.length > 0 && (
          <div className="flex flex-col gap-6">
            <h3 className="text-lg font-semibold text-white">
              Analysis Results
            </h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {results.map((comp) => (
                <DarkCard
                  key={comp.handle}
                  className="flex flex-col gap-3 transition-all hover:border-[#f0b429]/30"
                >
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-[#f0b429]">
                      @{comp.handle}
                    </h4>
                    <span className="rounded-full bg-[#1f1f1f] px-2 py-0.5 text-xs text-[#888888]">
                      {comp.niche}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-lg bg-[#1a1a1a] p-2 text-center">
                      <p className="text-lg font-bold text-white">
                        {comp.followers >= 1000000
                          ? `${(comp.followers / 1000000).toFixed(1)}M`
                          : comp.followers >= 1000
                            ? `${(comp.followers / 1000).toFixed(0)}K`
                            : comp.followers}
                      </p>
                      <p className="text-xs text-[#888888]">Followers</p>
                    </div>
                    <div className="rounded-lg bg-[#1a1a1a] p-2 text-center">
                      <p className="text-lg font-bold text-[#22c55e]">
                        {comp.engagementRate.toFixed(1)}%
                      </p>
                      <p className="text-xs text-[#888888]">Engagement</p>
                    </div>
                  </div>

                  <p className="text-sm text-[#cccccc]">
                    {comp.insightsSummary}
                  </p>

                  {comp.contentGaps.length > 0 && (
                    <div>
                      <Label className="text-xs text-[#888888]">
                        Content Gaps
                      </Label>
                      <ul className="mt-1 flex flex-col gap-1">
                        {comp.contentGaps.map((gap, i) => (
                          <li
                            key={i}
                            className="flex items-start gap-1.5 text-xs text-[#cccccc]"
                          >
                            <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-[#f0b429]" />
                            {gap}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {comp.topAngles.length > 0 && (
                    <div className="flex flex-col gap-1">
                      {comp.topAngles.map((angle, i) => (
                        <button
                          key={i}
                          onClick={() => borrowAngle(angle)}
                          className="flex items-center justify-between rounded-lg bg-[#1a1a1a] px-3 py-2 text-left text-xs text-[#cccccc] transition-colors hover:bg-[#f0b429]/10 hover:text-[#f0b429]"
                        >
                          <span className="flex-1">{angle}</span>
                          <ArrowRight className="ml-2 h-3 w-3 shrink-0" />
                        </button>
                      ))}
                    </div>
                  )}
                </DarkCard>
              ))}
            </div>

            {/* Content Gap Report */}
            {contentGapReport.length > 0 && (
              <DarkCard glow>
                <div className="mb-3 flex items-center gap-2">
                  <Target className="h-5 w-5 text-[#f0b429]" />
                  <h3 className="text-lg font-semibold text-white">
                    Content Gap Report
                  </h3>
                </div>
                <p className="mb-4 text-sm text-[#888888]">
                  Opportunities where competitors are weak or absent:
                </p>
                <div className="flex flex-col gap-3">
                  {contentGapReport.map((gap, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-3 rounded-lg border border-[#1f1f1f] bg-[#1a1a1a] p-3"
                    >
                      <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-[#f0b429]" />
                      <div className="flex-1">
                        <p className="text-sm text-[#cccccc]">{gap}</p>
                      </div>
                      <button
                        onClick={() => borrowAngle(gap)}
                        className="shrink-0"
                      >
                        <GoldButton variant="secondary">
                          Borrow This Angle
                          <ArrowRight className="h-3 w-3" />
                        </GoldButton>
                      </button>
                    </div>
                  ))}
                </div>
              </DarkCard>
            )}
          </div>
        )}

        {/* Empty state */}
        {!analyzing && results.length === 0 && (
          <DarkCard className="py-12 text-center">
            <Users className="mx-auto mb-3 h-10 w-10 text-[#333333]" />
            <p className="text-[#888888]">
              Add competitor handles above and click &quot;Analyze&quot; to
              discover content gaps and strategy insights.
            </p>
          </DarkCard>
        )}
      </div>
    </div>
  );
}

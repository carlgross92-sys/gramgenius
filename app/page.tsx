"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Bot,
  Plus,
  ExternalLink,
  CheckCircle,
  Clock,
  Loader2,
  Film,
} from "lucide-react";
import { DarkCard } from "@/components/ui/DarkCard";
import { GoldButton } from "@/components/ui/GoldButton";

interface BrandWithEngine {
  id: string;
  name: string;
  handle: string;
  niche: string;
  postCount: number;
  engineEnabled: boolean;
  todayPosted: number;
  queued: number;
  jobs: Array<Record<string, unknown>>;
}

const BRAND_COLORS = ["#f0b429", "#8b5cf6", "#3b82f6", "#22c55e", "#ec4899"];

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.floor((now - then) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function statusText(status: string): string {
  switch (status) {
    case "COMPLETED":
      return "Posted";
    case "PROCESSING":
      return "Processing";
    case "QUEUED":
      return "Queued";
    case "FAILED":
    case "QUALITY_FAILED":
      return "Failed";
    default:
      return status;
  }
}

function statusColor(status: string): string {
  switch (status) {
    case "COMPLETED":
      return "text-[#22c55e]";
    case "PROCESSING":
      return "text-[#f0b429]";
    case "QUEUED":
      return "text-[#3b82f6]";
    case "FAILED":
    case "QUALITY_FAILED":
      return "text-[#ef4444]";
    default:
      return "text-[#888]";
  }
}

export default function DashboardPage() {
  const [brands, setBrands] = useState<BrandWithEngine[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAllData = async () => {
    try {
      const brandsRes = await fetch("/api/brands");
      if (!brandsRes.ok) return;
      const brandsData = await brandsRes.json();
      const brandList = brandsData.brands || [];

      // Fetch engine status for each brand in parallel
      const engineResults = await Promise.all(
        brandList.map(async (brand: { id: string; name: string; handle: string; niche: string; postCount: number; engineEnabled: boolean }) => {
          try {
            const res = await fetch(`/api/engine?brandId=${brand.id}`);
            if (!res.ok) return { ...brand, todayPosted: 0, queued: 0, jobs: [] };
            const data = await res.json();
            return {
              id: brand.id,
              name: brand.name,
              handle: brand.handle,
              niche: brand.niche,
              postCount: brand.postCount,
              engineEnabled: data.engine?.enabled ?? brand.engineEnabled,
              todayPosted: data.stats?.postedToday ?? 0,
              queued: data.stats?.queued ?? 0,
              jobs: data.jobs || [],
            };
          } catch {
            return {
              id: brand.id,
              name: brand.name,
              handle: brand.handle,
              niche: brand.niche,
              postCount: brand.postCount,
              engineEnabled: brand.engineEnabled,
              todayPosted: 0,
              queued: 0,
              jobs: [],
            };
          }
        })
      );

      setBrands(engineResults);
    } catch {
      // Silent fail
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
    const interval = setInterval(fetchAllData, 60000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleEngine = async (brandId: string, currentEnabled: boolean) => {
    try {
      const res = await fetch(`/api/engine?brandId=${brandId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !currentEnabled, brandProfileId: brandId }),
      });
      if (res.ok) {
        setBrands((prev) =>
          prev.map((b) =>
            b.id === brandId ? { ...b, engineEnabled: !currentEnabled } : b
          )
        );
      }
    } catch {
      // Silent fail
    }
  };

  // Combine all jobs from all brands, sort by createdAt descending, take 10
  type JobWithBrand = Record<string, unknown> & { brandName: string; brandHandle: string };
  const allJobs: JobWithBrand[] = brands
    .flatMap((b) =>
      b.jobs.map((j): JobWithBrand => ({ ...j, brandName: b.name, brandHandle: b.handle }))
    )
    .sort((a, b) => {
      const aDate = new Date(a.createdAt as string).getTime();
      const bDate = new Date(b.createdAt as string).getTime();
      return bDate - aDate;
    })
    .slice(0, 10);

  // Quick stats
  const totalPostsToday = brands.reduce((sum, b) => sum + b.todayPosted, 0);
  const totalPostsEver = brands.reduce((sum, b) => sum + b.postCount, 0);
  const brandsActive = brands.filter((b) => b.engineEnabled).length;
  const videosInQueue = brands.reduce((sum, b) => sum + b.queued, 0);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a]">
        <Loader2 className="h-8 w-8 animate-spin text-[#f0b429]" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#0a0a0a]">
      <div className="flex flex-col gap-6 p-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-[#f0b429]">GramGenius</h1>
          <p className="text-[#888]">Multi-Brand Video Machine</p>
        </div>

        {/* Brand Cards Section */}
        <div>
          <h2 className="mb-3 text-sm font-medium uppercase tracking-wider text-[#888]">
            Your Brands
          </h2>
          <div className="flex gap-4 overflow-x-auto pb-2 md:grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 md:overflow-visible">
            {brands.map((brand, idx) => {
              const color = BRAND_COLORS[idx % BRAND_COLORS.length];
              return (
                <DarkCard
                  key={brand.id}
                  className="min-w-[280px] flex-shrink-0 flex flex-col gap-3 md:min-w-0"
                  style={{ borderLeft: `3px solid ${color}` }}
                >
                  {/* Brand name + handle */}
                  <div>
                    <h3 className="text-base font-semibold text-white">
                      {brand.name}
                    </h3>
                    <span className="text-sm text-[#888]">@{brand.handle}</span>
                  </div>

                  {/* Engine status */}
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-block h-2 w-2 rounded-full ${
                        brand.engineEnabled ? "bg-[#22c55e]" : "bg-[#ef4444]"
                      }`}
                    />
                    <span
                      className={`text-xs font-bold uppercase tracking-wide ${
                        brand.engineEnabled ? "text-[#22c55e]" : "text-[#ef4444]"
                      }`}
                    >
                      {brand.engineEnabled ? "RUNNING" : "STOPPED"}
                    </span>
                  </div>

                  {/* Post counts */}
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-[#888]">
                      Today:{" "}
                      <span className="font-medium text-white">
                        {brand.todayPosted} posts
                      </span>
                    </span>
                    <span className="text-[#888]">
                      Total:{" "}
                      <span className="font-medium text-white">
                        {brand.postCount} posts
                      </span>
                    </span>
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-2 pt-1">
                    <Link href="/autopilot" className="flex-1">
                      <GoldButton variant="secondary" className="w-full text-xs">
                        <Bot className="h-3.5 w-3.5" />
                        Manage
                      </GoldButton>
                    </Link>
                    <GoldButton
                      variant={brand.engineEnabled ? "danger" : "primary"}
                      className="flex-1 text-xs"
                      onClick={() => toggleEngine(brand.id, brand.engineEnabled)}
                    >
                      {brand.engineEnabled ? "Stop" : "Start"}
                    </GoldButton>
                  </div>
                </DarkCard>
              );
            })}

            {/* Add New Brand card */}
            <Link href="/brands" className="min-w-[280px] flex-shrink-0 md:min-w-0">
              <DarkCard className="flex h-full min-h-[200px] flex-col items-center justify-center gap-3 border-dashed border-[#333] transition-colors hover:border-[#f0b429]/50">
                <div className="flex h-12 w-12 items-center justify-center rounded-full border border-[#333]">
                  <Plus className="h-6 w-6 text-[#888]" />
                </div>
                <span className="text-sm font-medium text-[#888]">
                  Add New Brand
                </span>
              </DarkCard>
            </Link>
          </div>
        </div>

        {/* Activity Feed */}
        <DarkCard>
          <h2 className="mb-4 text-sm font-medium uppercase tracking-wider text-[#888]">
            Today&apos;s Activity
          </h2>
          {allJobs.length === 0 ? (
            <p className="py-8 text-center text-sm text-[#555]">
              No activity yet. Start an engine to begin generating content.
            </p>
          ) : (
            <div className="flex flex-col divide-y divide-[#1f1f1f]">
              {allJobs.map((job, idx) => (
                <div
                  key={(job.id as string) || idx}
                  className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <Film className="h-4 w-4 shrink-0 text-[#f0b429]" />
                  <div className="flex min-w-0 flex-1 flex-col">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-[#f0b429]">
                        {job.brandName as string}
                      </span>
                      <span className="truncate text-sm text-white">
                        {((job.topic as string) || (job.theme as string) || "Untitled").slice(0, 60)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs ${statusColor(job.status as string)}`}>
                        {statusText(job.status as string)}
                      </span>
                      {job.createdAt ? (
                        <span className="text-xs text-[#555]">
                          {timeAgo(job.createdAt as string)}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  {job.instagramPostId ? (
                    <a
                      href={`https://www.instagram.com/p/${job.instagramPostId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 text-[#888] transition-colors hover:text-[#f0b429]"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </DarkCard>

        {/* Quick Stats Bar */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <DarkCard className="flex flex-col items-center gap-1 py-4">
            <CheckCircle className="h-5 w-5 text-[#22c55e]" />
            <span className="text-2xl font-bold text-white">{totalPostsToday}</span>
            <span className="text-xs text-[#888]">Posts Today</span>
          </DarkCard>
          <DarkCard className="flex flex-col items-center gap-1 py-4">
            <Film className="h-5 w-5 text-[#f0b429]" />
            <span className="text-2xl font-bold text-white">{totalPostsEver}</span>
            <span className="text-xs text-[#888]">Total Posts</span>
          </DarkCard>
          <DarkCard className="flex flex-col items-center gap-1 py-4">
            <Bot className="h-5 w-5 text-[#8b5cf6]" />
            <span className="text-2xl font-bold text-white">{brandsActive}</span>
            <span className="text-xs text-[#888]">Brands Active</span>
          </DarkCard>
          <DarkCard className="flex flex-col items-center gap-1 py-4">
            <Clock className="h-5 w-5 text-[#3b82f6]" />
            <span className="text-2xl font-bold text-white">{videosInQueue}</span>
            <span className="text-xs text-[#888]">In Queue</span>
          </DarkCard>
        </div>
      </div>
    </div>
  );
}

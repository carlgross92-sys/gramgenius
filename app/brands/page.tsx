"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { DarkCard } from "@/components/ui/DarkCard";
import { GoldButton } from "@/components/ui/GoldButton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  Plus,
  Bot,
  Brain,
  Instagram,
  BarChart3,
  Circle,
} from "lucide-react";

interface Brand {
  id: string;
  name: string;
  handle: string;
  niche: string;
  brandVoice: string;
  targetAudience: string;
  contentPillars: string[];
  postingGoal: number;
  autoPostEnabled: boolean;
  timezone: string;
  postCount: number;
  pillarCount: number;
  activeJobCount: number;
  engineEnabled: boolean;
  createdAt: string;
}

interface BrandEngineInfo {
  brand: Brand;
  todayPosted: number;
  queued: number;
  failed: number;
}

const NICHES = [
  "Personal Brand",
  "E-commerce",
  "Fitness",
  "Food & Beverage",
  "Travel",
  "Education",
  "Coaching",
  "Other",
];

const VOICES = [
  "Professional",
  "Casual & Friendly",
  "Humorous",
  "Inspirational",
  "Authoritative",
  "Conversational",
  "Bold & Direct",
];

export default function BrandsPage() {
  const [brands, setBrands] = useState<BrandEngineInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [creating, setCreating] = useState(false);

  // New brand form state
  const [newHandle, setNewHandle] = useState("");
  const [newName, setNewName] = useState("");
  const [newNiche, setNewNiche] = useState("");
  const [newVoice, setNewVoice] = useState("");
  const [newAudience, setNewAudience] = useState("");

  const fetchBrands = useCallback(async () => {
    try {
      const res = await fetch("/api/brands");
      if (!res.ok) return;
      const data = await res.json();
      const brandList: Brand[] = data.brands || [];

      // Fetch engine stats for each brand in parallel
      const enriched = await Promise.all(
        brandList.map(async (brand) => {
          try {
            const engineRes = await fetch(`/api/engine?brandId=${brand.id}`);
            if (!engineRes.ok) {
              return { brand, todayPosted: 0, queued: 0, failed: 0 };
            }
            const engineData = await engineRes.json();
            return {
              brand: {
                ...brand,
                engineEnabled: engineData.engine?.enabled ?? brand.engineEnabled,
              },
              todayPosted: engineData.stats?.postedToday ?? 0,
              queued: engineData.stats?.queued ?? 0,
              failed: engineData.stats?.failed ?? 0,
            };
          } catch {
            return { brand, todayPosted: 0, queued: 0, failed: 0 };
          }
        })
      );

      setBrands(enriched);
    } catch {
      // Silent fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBrands();
  }, [fetchBrands]);

  function resetForm() {
    setNewHandle("");
    setNewName("");
    setNewNiche("");
    setNewVoice("");
    setNewAudience("");
  }

  async function handleCreate() {
    if (!newHandle.trim() || !newName.trim() || !newNiche) return;

    try {
      setCreating(true);
      const res = await fetch("/api/brands", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName.trim(),
          handle: newHandle.trim().replace(/^@/, ""),
          niche: newNiche,
          brandVoice: newVoice || "Casual & Friendly",
          targetAudience: newAudience.trim(),
        }),
      });

      if (res.ok) {
        resetForm();
        setShowModal(false);
        await fetchBrands();
      }
    } catch {
      // Silent fail
    } finally {
      setCreating(false);
    }
  }

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
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white">My Brands</h1>
            <span className="rounded-full bg-[#1f1f1f] px-2.5 py-0.5 text-xs font-medium text-[#888]">
              {brands.length}
            </span>
          </div>
          <GoldButton onClick={() => setShowModal(true)}>
            <Plus className="h-4 w-4" />
            Add New Brand
          </GoldButton>
        </div>

        {/* Brand Cards - vertical stack */}
        {brands.length === 0 ? (
          <DarkCard className="flex flex-col items-center justify-center py-16">
            <Bot className="mb-4 h-12 w-12 text-[#333]" />
            <p className="mb-2 text-lg font-medium text-white">
              No brands yet
            </p>
            <p className="mb-6 text-sm text-[#888]">
              Create your first brand to start generating content
            </p>
            <GoldButton onClick={() => setShowModal(true)}>
              <Plus className="h-4 w-4" />
              Create Your First Brand
            </GoldButton>
          </DarkCard>
        ) : (
          <div className="flex flex-col gap-4">
            {brands.map(({ brand, todayPosted, queued, failed }) => (
              <DarkCard
                key={brand.id}
                className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
              >
                {/* Left side: brand info */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-semibold text-white">
                      {brand.name}
                    </h3>
                    <span className="text-sm text-[#f0b429]">
                      @{brand.handle}
                    </span>
                  </div>

                  {/* Engine status */}
                  <div className="flex items-center gap-2">
                    <Circle
                      className={`h-2.5 w-2.5 ${
                        brand.engineEnabled
                          ? "fill-[#22c55e] text-[#22c55e]"
                          : "fill-[#ef4444] text-[#ef4444]"
                      }`}
                    />
                    <span
                      className={`text-xs font-bold uppercase tracking-wide ${
                        brand.engineEnabled ? "text-[#22c55e]" : "text-[#ef4444]"
                      }`}
                    >
                      {brand.engineEnabled ? "Engine Running" : "Engine Stopped"}
                    </span>
                  </div>

                  {/* Stats line */}
                  <p className="text-sm text-[#888]">
                    Today:{" "}
                    <span className="text-white">{todayPosted} posted</span>
                    {" \u2022 "}
                    <span className="text-white">{queued} queued</span>
                    {" \u2022 "}
                    <span className={failed > 0 ? "text-[#ef4444]" : "text-white"}>
                      {failed} failed
                    </span>
                  </p>

                  {/* Instagram connection */}
                  <div className="flex items-center gap-1.5">
                    <Instagram className="h-3.5 w-3.5 text-[#888]" />
                    <span className="text-xs text-[#888]">
                      {brand.autoPostEnabled
                        ? "Instagram connected"
                        : "Instagram not connected"}
                    </span>
                  </div>
                </div>

                {/* Right side: action buttons */}
                <div className="flex flex-wrap items-center gap-2">
                  <Link href="/autopilot">
                    <GoldButton variant="secondary" className="text-xs">
                      <Bot className="h-3.5 w-3.5" />
                      Autopilot
                    </GoldButton>
                  </Link>
                  <Link href="/brand">
                    <GoldButton variant="secondary" className="text-xs">
                      <Brain className="h-3.5 w-3.5" />
                      Brand Brain
                    </GoldButton>
                  </Link>
                  {brand.autoPostEnabled ? (
                    <Link href="/analytics">
                      <GoldButton variant="secondary" className="text-xs">
                        <BarChart3 className="h-3.5 w-3.5" />
                        Stats
                      </GoldButton>
                    </Link>
                  ) : (
                    <Link href="/settings">
                      <GoldButton variant="secondary" className="text-xs">
                        <Instagram className="h-3.5 w-3.5" />
                        Connect IG
                      </GoldButton>
                    </Link>
                  )}
                </div>
              </DarkCard>
            ))}
          </div>
        )}
      </div>

      {/* Add Brand Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="border-[#1f1f1f] bg-[#0f0f0f] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-white">Add New Brand</DialogTitle>
            <DialogDescription className="text-[#888]">
              Set up a new Instagram brand profile for content generation
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4">
            {/* Handle */}
            <div className="flex flex-col gap-1.5">
              <Label className="text-[#888]">Instagram Handle *</Label>
              <div className="flex items-center">
                <span className="flex h-8 items-center rounded-l-md border border-r-0 border-[#1f1f1f] bg-[#1a1a1a] px-3 text-sm text-[#888]">
                  @
                </span>
                <Input
                  value={newHandle}
                  onChange={(e) => setNewHandle(e.target.value.replace(/^@/, ""))}
                  className="rounded-l-none border-[#1f1f1f] bg-[#1a1a1a] text-white"
                  placeholder="yourhandle"
                />
              </div>
            </div>

            {/* Name */}
            <div className="flex flex-col gap-1.5">
              <Label className="text-[#888]">Brand Name *</Label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="border-[#1f1f1f] bg-[#1a1a1a] text-white"
                placeholder="My Awesome Brand"
              />
            </div>

            {/* Niche */}
            <div className="flex flex-col gap-1.5">
              <Label className="text-[#888]">Niche *</Label>
              <Select value={newNiche} onValueChange={(v) => setNewNiche(v ?? "")}>
                <SelectTrigger className="w-full border-[#1f1f1f] bg-[#1a1a1a] text-white">
                  <SelectValue placeholder="Select your niche" />
                </SelectTrigger>
                <SelectContent className="border-[#1f1f1f] bg-[#111]">
                  {NICHES.map((niche) => (
                    <SelectItem key={niche} value={niche} className="text-white">
                      {niche}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Voice */}
            <div className="flex flex-col gap-1.5">
              <Label className="text-[#888]">Brand Voice</Label>
              <Select value={newVoice} onValueChange={(v) => setNewVoice(v ?? "")}>
                <SelectTrigger className="w-full border-[#1f1f1f] bg-[#1a1a1a] text-white">
                  <SelectValue placeholder="Select brand voice" />
                </SelectTrigger>
                <SelectContent className="border-[#1f1f1f] bg-[#111]">
                  {VOICES.map((voice) => (
                    <SelectItem key={voice} value={voice} className="text-white">
                      {voice}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Target Audience */}
            <div className="flex flex-col gap-1.5">
              <Label className="text-[#888]">Target Audience</Label>
              <Textarea
                value={newAudience}
                onChange={(e) => setNewAudience(e.target.value)}
                className="border-[#1f1f1f] bg-[#1a1a1a] text-white"
                placeholder="e.g., Fitness enthusiasts aged 25-40 looking for workout tips"
                rows={3}
              />
            </div>

            {/* Submit */}
            <div className="mt-2 flex items-center gap-3">
              <GoldButton
                onClick={handleCreate}
                disabled={creating || !newHandle.trim() || !newName.trim() || !newNiche}
                className="flex-1"
              >
                {creating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                Create Brand
              </GoldButton>
              <GoldButton
                variant="secondary"
                onClick={() => {
                  setShowModal(false);
                  resetForm();
                }}
              >
                Cancel
              </GoldButton>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

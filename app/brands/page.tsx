"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { DarkCard } from "@/components/ui/DarkCard";
import { GoldButton } from "@/components/ui/GoldButton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  LayoutGrid,
  Plus,
  Pencil,
  Trash2,
  Circle,
  ArrowRight,
  Hash,
  FileText,
  Zap,
  X,
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

const NICHES = [
  "Personal Brand",
  "E-commerce",
  "Local Business",
  "Legal/Professional",
  "Real Estate",
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
  const router = useRouter();
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  // New brand form
  const [newName, setNewName] = useState("");
  const [newHandle, setNewHandle] = useState("");
  const [newNiche, setNewNiche] = useState("");
  const [newVoice, setNewVoice] = useState("");
  const [newAudience, setNewAudience] = useState("");

  const fetchBrands = useCallback(async () => {
    try {
      const res = await fetch("/api/brands");
      if (res.ok) {
        const data = await res.json();
        setBrands(data.brands || []);
      }
    } catch {
      // Silent fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBrands();
  }, [fetchBrands]);

  function switchToBrand(brandId: string) {
    localStorage.setItem("gramgenius-active-brand", brandId);
    router.push("/");
  }

  function editBrand(brandId: string) {
    localStorage.setItem("gramgenius-active-brand", brandId);
    router.push("/brand");
  }

  async function deleteBrand(brandId: string) {
    if (!confirm("Delete this brand and all its data? This cannot be undone.")) {
      return;
    }

    try {
      setDeleting(brandId);
      const res = await fetch(`/api/brands?id=${brandId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setBrands((prev) => prev.filter((b) => b.id !== brandId));

        // If deleted brand was active, clear or switch
        const activeBrandId = localStorage.getItem("gramgenius-active-brand");
        if (activeBrandId === brandId) {
          const remaining = brands.filter((b) => b.id !== brandId);
          if (remaining.length > 0) {
            localStorage.setItem("gramgenius-active-brand", remaining[0].id);
          } else {
            localStorage.removeItem("gramgenius-active-brand");
          }
        }
      }
    } catch {
      // Silent fail
    } finally {
      setDeleting(null);
    }
  }

  async function handleCreate() {
    if (!newName.trim() || !newHandle.trim() || !newNiche) return;

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
        const data = await res.json();
        setBrands((prev) => [data.brand, ...prev]);
        resetForm();
        setShowModal(false);
      }
    } catch {
      // Silent fail
    } finally {
      setCreating(false);
    }
  }

  function resetForm() {
    setNewName("");
    setNewHandle("");
    setNewNiche("");
    setNewVoice("");
    setNewAudience("");
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#f0b429]" />
      </div>
    );
  }

  const activeBrandId =
    typeof window !== "undefined"
      ? localStorage.getItem("gramgenius-active-brand")
      : null;

  return (
    <div className="flex flex-col">
      <Header title="My Brands" />

      <div className="flex flex-col gap-6 p-6">
        {/* Header row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <LayoutGrid className="h-6 w-6 text-[#f0b429]" />
            <div>
              <h2 className="text-lg font-semibold text-white">My Brands</h2>
              <p className="text-sm text-[#888]">
                {brands.length} brand{brands.length !== 1 ? "s" : ""} configured
              </p>
            </div>
          </div>
          <GoldButton onClick={() => setShowModal(true)}>
            <Plus className="h-4 w-4" />
            Add New Brand
          </GoldButton>
        </div>

        {/* Brand grid */}
        {brands.length === 0 ? (
          <DarkCard className="flex flex-col items-center justify-center py-16">
            <LayoutGrid className="mb-4 h-12 w-12 text-[#333]" />
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
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {brands.map((brand) => {
              const isActive = brand.id === activeBrandId;

              return (
                <DarkCard
                  key={brand.id}
                  glow={isActive}
                  className={`relative flex flex-col gap-4 transition-all ${
                    isActive ? "border-[#f0b429]/30" : ""
                  }`}
                >
                  {/* Active indicator */}
                  {isActive && (
                    <span className="absolute right-4 top-4 rounded-full bg-[#f0b429]/15 px-2 py-0.5 text-[10px] font-bold text-[#f0b429]">
                      ACTIVE
                    </span>
                  )}

                  {/* Brand header */}
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-semibold text-white">
                        {brand.name}
                      </h3>
                      {brand.engineEnabled && (
                        <Circle className="h-2.5 w-2.5 fill-[#22c55e] text-[#22c55e]" />
                      )}
                    </div>
                    <span className="text-sm text-[#f0b429]">
                      @{brand.handle}
                    </span>
                  </div>

                  {/* Info grid */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col">
                      <span className="text-[10px] uppercase tracking-wider text-[#555]">
                        Niche
                      </span>
                      <span className="text-sm text-[#ccc]">{brand.niche}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] uppercase tracking-wider text-[#555]">
                        Voice
                      </span>
                      <span className="text-sm text-[#ccc]">
                        {brand.brandVoice}
                      </span>
                    </div>
                  </div>

                  {/* Stats row */}
                  <div className="flex items-center gap-4 border-t border-[#1f1f1f] pt-3">
                    <div className="flex items-center gap-1.5">
                      <Hash className="h-3.5 w-3.5 text-[#888]" />
                      <span className="text-xs text-[#888]">
                        {brand.pillarCount} pillars
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <FileText className="h-3.5 w-3.5 text-[#888]" />
                      <span className="text-xs text-[#888]">
                        {brand.postCount} posts
                      </span>
                    </div>
                    {brand.engineEnabled && (
                      <div className="flex items-center gap-1.5">
                        <Zap className="h-3.5 w-3.5 text-[#22c55e]" />
                        <span className="text-xs text-[#22c55e]">
                          Engine On
                        </span>
                      </div>
                    )}
                    {brand.activeJobCount > 0 && (
                      <span className="ml-auto rounded-full bg-[#f0b429] px-2 py-0.5 text-[10px] font-bold text-black">
                        {brand.activeJobCount} active
                      </span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 border-t border-[#1f1f1f] pt-3">
                    {!isActive && (
                      <GoldButton
                        variant="secondary"
                        className="flex-1 text-xs"
                        onClick={() => switchToBrand(brand.id)}
                      >
                        <ArrowRight className="h-3.5 w-3.5" />
                        Switch to this brand
                      </GoldButton>
                    )}
                    <button
                      onClick={() => editBrand(brand.id)}
                      className="rounded-lg border border-[#1f1f1f] bg-[#111] p-2 text-[#888] transition-colors hover:border-[#f0b429]/30 hover:text-[#f0b429]"
                      title="Edit brand"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => deleteBrand(brand.id)}
                      disabled={deleting === brand.id}
                      className="rounded-lg border border-[#1f1f1f] bg-[#111] p-2 text-[#888] transition-colors hover:border-[#ef4444]/30 hover:text-[#ef4444] disabled:opacity-50"
                      title="Delete brand"
                    >
                      {deleting === brand.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </DarkCard>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Brand Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => {
              setShowModal(false);
              resetForm();
            }}
          />

          {/* Modal content */}
          <div className="relative z-10 mx-4 w-full max-w-lg rounded-xl border border-[#1f1f1f] bg-[#0f0f0f] p-6 shadow-2xl">
            {/* Close button */}
            <button
              onClick={() => {
                setShowModal(false);
                resetForm();
              }}
              className="absolute right-4 top-4 text-[#888] transition-colors hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>

            <h2 className="mb-1 text-lg font-semibold text-white">
              Add New Brand
            </h2>
            <p className="mb-6 text-sm text-[#888]">
              Set up a new Instagram brand profile for content generation
            </p>

            <div className="flex flex-col gap-4">
              {/* Brand Name */}
              <div className="flex flex-col gap-1.5">
                <Label className="text-[#888]">Brand Name *</Label>
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="border-[#1f1f1f] bg-[#1a1a1a] text-white"
                  placeholder="My Awesome Brand"
                />
              </div>

              {/* Handle */}
              <div className="flex flex-col gap-1.5">
                <Label className="text-[#888]">Instagram Handle *</Label>
                <div className="flex items-center">
                  <span className="flex h-10 items-center rounded-l-md border border-r-0 border-[#1f1f1f] bg-[#1a1a1a] px-3 text-[#888]">
                    @
                  </span>
                  <Input
                    value={newHandle}
                    onChange={(e) =>
                      setNewHandle(e.target.value.replace(/^@/, ""))
                    }
                    className="rounded-l-none border-[#1f1f1f] bg-[#1a1a1a] text-white"
                    placeholder="yourhandle"
                  />
                </div>
              </div>

              {/* Niche */}
              <div className="flex flex-col gap-1.5">
                <Label className="text-[#888]">Niche *</Label>
                <Select value={newNiche} onValueChange={(v) => setNewNiche(v ?? "")}>
                  <SelectTrigger className="border-[#1f1f1f] bg-[#1a1a1a] text-white">
                    <SelectValue placeholder="Select your niche" />
                  </SelectTrigger>
                  <SelectContent className="border-[#1f1f1f] bg-[#111]">
                    {NICHES.map((niche) => (
                      <SelectItem
                        key={niche}
                        value={niche}
                        className="text-white"
                      >
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
                  <SelectTrigger className="border-[#1f1f1f] bg-[#1a1a1a] text-white">
                    <SelectValue placeholder="Select brand voice" />
                  </SelectTrigger>
                  <SelectContent className="border-[#1f1f1f] bg-[#111]">
                    {VOICES.map((voice) => (
                      <SelectItem
                        key={voice}
                        value={voice}
                        className="text-white"
                      >
                        {voice}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Target Audience */}
              <div className="flex flex-col gap-1.5">
                <Label className="text-[#888]">Target Audience</Label>
                <Input
                  value={newAudience}
                  onChange={(e) => setNewAudience(e.target.value)}
                  className="border-[#1f1f1f] bg-[#1a1a1a] text-white"
                  placeholder="e.g., Dog lovers aged 25-40"
                />
              </div>

              {/* Actions */}
              <div className="mt-2 flex items-center gap-3">
                <GoldButton
                  onClick={handleCreate}
                  disabled={
                    creating ||
                    !newName.trim() ||
                    !newHandle.trim() ||
                    !newNiche
                  }
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
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { ChevronDown, ChevronUp, Plus, Circle, Loader2 } from "lucide-react";

interface Brand {
  id: string;
  name: string;
  handle: string;
  niche: string;
  brandVoice: string;
  activeJobCount: number;
  engineEnabled: boolean;
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

export function getActiveBrandId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("gramgenius-active-brand");
}

export function BrandSwitcher() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [activeBrandId, setActiveBrandId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showNewForm, setShowNewForm] = useState(false);
  const [creating, setCreating] = useState(false);

  // New brand form state
  const [newName, setNewName] = useState("");
  const [newHandle, setNewHandle] = useState("");
  const [newNiche, setNewNiche] = useState("");

  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchBrands = useCallback(async () => {
    try {
      const res = await fetch("/api/brands");
      if (res.ok) {
        const data = await res.json();
        setBrands(data.brands || []);

        const storedId = localStorage.getItem("gramgenius-active-brand");
        if (storedId && data.brands?.some((b: Brand) => b.id === storedId)) {
          setActiveBrandId(storedId);
        } else if (data.brands?.length > 0) {
          const firstId = data.brands[0].id;
          setActiveBrandId(firstId);
          localStorage.setItem("gramgenius-active-brand", firstId);
        }
      }
    } catch {
      // Silent fail on fetch error
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBrands();
  }, [fetchBrands]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
        setShowNewForm(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function switchBrand(brandId: string) {
    localStorage.setItem("gramgenius-active-brand", brandId);
    setActiveBrandId(brandId);
    setShowDropdown(false);
    setShowNewForm(false);
    window.location.reload();
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
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const newBrand = data.brand;

        // Add to list and switch
        setBrands((prev) => [newBrand, ...prev]);
        setNewName("");
        setNewHandle("");
        setNewNiche("");
        setShowNewForm(false);

        // Switch to the new brand
        localStorage.setItem("gramgenius-active-brand", newBrand.id);
        setActiveBrandId(newBrand.id);
        setShowDropdown(false);
        window.location.reload();
      }
    } catch {
      // Silent fail
    } finally {
      setCreating(false);
    }
  }

  const activeBrand = brands.find((b) => b.id === activeBrandId);

  if (loading) {
    return (
      <div className="flex items-center justify-center rounded-lg border border-[#1f1f1f] bg-[#0a0a0a] px-3 py-3">
        <Loader2 className="h-4 w-4 animate-spin text-[#888]" />
      </div>
    );
  }

  if (brands.length === 0) {
    return (
      <div ref={dropdownRef} className="relative">
        <button
          onClick={() => setShowNewForm(!showNewForm)}
          className="flex w-full items-center gap-2 rounded-lg border border-[#1f1f1f] bg-[#0a0a0a] px-3 py-3 text-left transition-colors hover:border-[#f0b429]/30"
        >
          <Plus className="h-4 w-4 text-[#f0b429]" />
          <span className="text-sm text-[#f0b429]">Add Your First Brand</span>
        </button>

        {showNewForm && (
          <div className="absolute left-0 right-0 top-full z-50 mt-1 rounded-lg border border-[#1f1f1f] bg-[#0a0a0a] p-3 shadow-xl">
            <div className="flex flex-col gap-2">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Brand name"
                className="w-full rounded-md border border-[#1f1f1f] bg-[#111] px-3 py-1.5 text-sm text-white placeholder-[#555] outline-none focus:border-[#f0b429]/50"
              />
              <div className="flex items-center">
                <span className="flex h-[34px] items-center rounded-l-md border border-r-0 border-[#1f1f1f] bg-[#111] px-2 text-xs text-[#555]">
                  @
                </span>
                <input
                  type="text"
                  value={newHandle}
                  onChange={(e) =>
                    setNewHandle(e.target.value.replace(/^@/, ""))
                  }
                  placeholder="handle"
                  className="w-full rounded-r-md border border-[#1f1f1f] bg-[#111] px-3 py-1.5 text-sm text-white placeholder-[#555] outline-none focus:border-[#f0b429]/50"
                />
              </div>
              <select
                value={newNiche}
                onChange={(e) => setNewNiche(e.target.value)}
                className="w-full rounded-md border border-[#1f1f1f] bg-[#111] px-3 py-1.5 text-sm text-white outline-none focus:border-[#f0b429]/50"
              >
                <option value="" disabled>
                  Select niche
                </option>
                {NICHES.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
              <button
                onClick={handleCreate}
                disabled={
                  creating || !newName.trim() || !newHandle.trim() || !newNiche
                }
                className="flex items-center justify-center gap-1.5 rounded-md bg-[#f0b429] px-3 py-1.5 text-sm font-semibold text-black transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
              >
                {creating ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Plus className="h-3.5 w-3.5" />
                )}
                Create
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div ref={dropdownRef} className="relative">
      {/* Collapsed / trigger button */}
      <button
        onClick={() => {
          setShowDropdown(!showDropdown);
          if (showDropdown) setShowNewForm(false);
        }}
        className="flex w-full items-center justify-between rounded-lg border border-[#1f1f1f] bg-[#0a0a0a] px-3 py-2.5 text-left transition-colors hover:border-[#f0b429]/30"
      >
        <div className="flex min-w-0 flex-col">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-sm font-medium text-white">
              @{activeBrand?.handle || "..."}
            </span>
            {activeBrand && activeBrand.engineEnabled && (
              <Circle className="h-2 w-2 fill-[#22c55e] text-[#22c55e]" />
            )}
          </div>
          <span className="truncate text-xs text-[#888]">
            {activeBrand?.name || ""}
            {activeBrand?.brandVoice
              ? ` \u00B7 ${activeBrand.brandVoice}`
              : ""}
          </span>
        </div>
        {showDropdown ? (
          <ChevronUp className="h-4 w-4 shrink-0 text-[#888]" />
        ) : (
          <ChevronDown className="h-4 w-4 shrink-0 text-[#888]" />
        )}
      </button>

      {/* Dropdown */}
      {showDropdown && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-lg border border-[#1f1f1f] bg-[#0a0a0a] shadow-xl">
          {/* Brand list */}
          <div className="max-h-60 overflow-y-auto">
            {brands.map((brand) => {
              const isActive = brand.id === activeBrandId;
              return (
                <button
                  key={brand.id}
                  onClick={() => {
                    if (!isActive) switchBrand(brand.id);
                  }}
                  className={`flex w-full items-center justify-between border-b border-[#1f1f1f] px-3 py-2.5 text-left transition-colors last:border-b-0 ${
                    isActive
                      ? "bg-[#f0b429]/5"
                      : "hover:bg-[#111]"
                  }`}
                >
                  <div className="flex min-w-0 flex-col">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`truncate text-sm ${
                          isActive
                            ? "font-semibold text-[#f0b429]"
                            : "text-white"
                        }`}
                      >
                        @{brand.handle}
                      </span>
                      {brand.engineEnabled && (
                        <Circle className="h-2 w-2 fill-[#22c55e] text-[#22c55e]" />
                      )}
                    </div>
                    <span className="truncate text-xs text-[#888]">
                      {brand.niche}
                      {brand.brandVoice
                        ? ` \u00B7 ${brand.brandVoice}`
                        : ""}
                    </span>
                  </div>
                  {brand.activeJobCount > 0 && (
                    <span className="ml-2 shrink-0 rounded-full bg-[#f0b429] px-1.5 py-0.5 text-[10px] font-bold leading-none text-black">
                      {brand.activeJobCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Divider + New Brand button/form */}
          <div className="border-t border-[#1f1f1f]">
            {!showNewForm ? (
              <button
                onClick={() => setShowNewForm(true)}
                className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-[#f0b429] transition-colors hover:bg-[#111]"
              >
                <Plus className="h-4 w-4" />
                New Brand
              </button>
            ) : (
              <div className="flex flex-col gap-2 p-3">
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Brand name"
                  className="w-full rounded-md border border-[#1f1f1f] bg-[#111] px-3 py-1.5 text-sm text-white placeholder-[#555] outline-none focus:border-[#f0b429]/50"
                />
                <div className="flex items-center">
                  <span className="flex h-[34px] items-center rounded-l-md border border-r-0 border-[#1f1f1f] bg-[#111] px-2 text-xs text-[#555]">
                    @
                  </span>
                  <input
                    type="text"
                    value={newHandle}
                    onChange={(e) =>
                      setNewHandle(e.target.value.replace(/^@/, ""))
                    }
                    placeholder="handle"
                    className="w-full rounded-r-md border border-[#1f1f1f] bg-[#111] px-3 py-1.5 text-sm text-white placeholder-[#555] outline-none focus:border-[#f0b429]/50"
                  />
                </div>
                <select
                  value={newNiche}
                  onChange={(e) => setNewNiche(e.target.value)}
                  className="w-full rounded-md border border-[#1f1f1f] bg-[#111] px-3 py-1.5 text-sm text-white outline-none focus:border-[#f0b429]/50"
                >
                  <option value="" disabled>
                    Select niche
                  </option>
                  {NICHES.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
                <button
                  onClick={handleCreate}
                  disabled={
                    creating ||
                    !newName.trim() ||
                    !newHandle.trim() ||
                    !newNiche
                  }
                  className="flex items-center justify-center gap-1.5 rounded-md bg-[#f0b429] px-3 py-1.5 text-sm font-semibold text-black transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
                >
                  {creating ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Plus className="h-3.5 w-3.5" />
                  )}
                  Create
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

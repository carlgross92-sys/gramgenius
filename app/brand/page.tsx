"use client";

import { useEffect, useState, useCallback } from "react";
import { Header } from "@/components/layout/Header";
import { GoldButton } from "@/components/ui/GoldButton";
import { DarkCard } from "@/components/ui/DarkCard";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Loader2,
  X,
  Plus,
  Check,
  Sparkles,
  Brain,
} from "lucide-react";

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

const TIMEZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Anchorage",
  "Pacific/Honolulu",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Asia/Tokyo",
  "Asia/Shanghai",
  "Asia/Kolkata",
  "Australia/Sydney",
  "Pacific/Auckland",
];

const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

const HOURS = Array.from({ length: 24 }, (_, i) => {
  const period = i >= 12 ? "PM" : "AM";
  const hour = i % 12 || 12;
  return { value: String(i), label: `${hour}:00 ${period}` };
});

interface TimeSlot {
  day: string;
  hour: string;
}

interface BrandProfile {
  handle: string;
  brandName: string;
  niche: string;
  targetAudience: string;
  brandVoice: string;
  contentPillars: string[];
  postingGoal: number;
  bestPostingTimes: TimeSlot[];
  autoPost: boolean;
  timezone: string;
}

export default function BrandPage() {
  const [profile, setProfile] = useState<BrandProfile>({
    handle: "",
    brandName: "",
    niche: "",
    targetAudience: "",
    brandVoice: "",
    contentPillars: [],
    postingGoal: 3,
    bestPostingTimes: [],
    autoPost: false,
    timezone: "America/New_York",
  });
  const [pillarInput, setPillarInput] = useState("");
  const [newTimeSlot, setNewTimeSlot] = useState<TimeSlot>({
    day: "Monday",
    hour: "9",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [brandActive, setBrandActive] = useState(false);
  const [currentBio, setCurrentBio] = useState("");
  const [bioVariations, setBioVariations] = useState<string[]>([]);
  const [optimizingBio, setOptimizingBio] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const loadProfile = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/brand");
      if (res.ok) {
        const data = await res.json();
        if (data && (data.handle || data.brandName)) {
          setProfile({
            handle: data.handle || "",
            brandName: data.brandName || "",
            niche: data.niche || "",
            targetAudience: data.targetAudience || "",
            brandVoice: data.brandVoice || "",
            contentPillars: data.contentPillars || [],
            postingGoal: data.postingGoal || 3,
            bestPostingTimes: data.bestPostingTimes || [],
            autoPost: data.autoPost || false,
            timezone: data.timezone || "America/New_York",
          });
          setBrandActive(true);
        }
      }
    } catch {
      // Profile not found, use defaults
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  async function handleSave() {
    try {
      setSaving(true);
      const res = await fetch("/api/brand", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });
      if (res.ok) {
        setBrandActive(true);
        setSaveMessage("Brand profile saved successfully!");
        setTimeout(() => setSaveMessage(null), 3000);
      } else {
        setSaveMessage("Failed to save profile. Please try again.");
        setTimeout(() => setSaveMessage(null), 3000);
      }
    } catch {
      setSaveMessage("Failed to save profile. Please try again.");
      setTimeout(() => setSaveMessage(null), 3000);
    } finally {
      setSaving(false);
    }
  }

  function addPillar() {
    const trimmed = pillarInput.trim();
    if (
      trimmed &&
      profile.contentPillars.length < 5 &&
      !profile.contentPillars.includes(trimmed)
    ) {
      setProfile((prev) => ({
        ...prev,
        contentPillars: [...prev.contentPillars, trimmed],
      }));
      setPillarInput("");
    }
  }

  function removePillar(pillar: string) {
    setProfile((prev) => ({
      ...prev,
      contentPillars: prev.contentPillars.filter((p) => p !== pillar),
    }));
  }

  function addTimeSlot() {
    if (profile.bestPostingTimes.length >= 7) return;
    const exists = profile.bestPostingTimes.some(
      (t) => t.day === newTimeSlot.day && t.hour === newTimeSlot.hour
    );
    if (!exists) {
      setProfile((prev) => ({
        ...prev,
        bestPostingTimes: [...prev.bestPostingTimes, { ...newTimeSlot }],
      }));
    }
  }

  function removeTimeSlot(index: number) {
    setProfile((prev) => ({
      ...prev,
      bestPostingTimes: prev.bestPostingTimes.filter((_, i) => i !== index),
    }));
  }

  async function optimizeBio() {
    if (!currentBio.trim()) return;
    try {
      setOptimizingBio(true);
      setBioVariations([]);
      const res = await fetch("/api/generate/caption", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "bio",
          bio: currentBio,
          brandName: profile.brandName,
          niche: profile.niche,
          brandVoice: profile.brandVoice,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setBioVariations(
          data.variations || data.captions || [data.caption || ""]
        );
      }
    } catch {
      // Silent fail
    } finally {
      setOptimizingBio(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#f0b429]" />
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <Header title="Brand Brain" brandActive={brandActive} />

      <div className="flex flex-col gap-6 p-6">
        {/* Brand Active Indicator */}
        {brandActive && (
          <DarkCard glow className="flex items-center gap-3">
            <Brain className="h-5 w-5 text-[#f0b429]" />
            <div>
              <p className="font-semibold text-[#22c55e]">
                Brand Brain Active
              </p>
              <p className="text-sm text-[#888888]">
                Your brand profile is loaded and guiding all AI generation
              </p>
            </div>
          </DarkCard>
        )}

        {/* Main Form */}
        <DarkCard>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* Instagram Handle */}
            <div className="flex flex-col gap-2">
              <Label htmlFor="handle" className="text-[#888888]">
                Instagram Handle
              </Label>
              <div className="flex items-center">
                <span className="flex h-10 items-center rounded-l-md border border-r-0 border-[#1f1f1f] bg-[#1a1a1a] px-3 text-[#888888]">
                  @
                </span>
                <Input
                  id="handle"
                  value={profile.handle}
                  onChange={(e) =>
                    setProfile((prev) => ({
                      ...prev,
                      handle: e.target.value.replace(/^@/, ""),
                    }))
                  }
                  className="rounded-l-none border-[#1f1f1f] bg-[#1a1a1a] text-white"
                  placeholder="yourhandle"
                />
              </div>
            </div>

            {/* Brand Name */}
            <div className="flex flex-col gap-2">
              <Label htmlFor="brandName" className="text-[#888888]">
                Brand Name
              </Label>
              <Input
                id="brandName"
                value={profile.brandName}
                onChange={(e) =>
                  setProfile((prev) => ({
                    ...prev,
                    brandName: e.target.value,
                  }))
                }
                className="border-[#1f1f1f] bg-[#1a1a1a] text-white"
                placeholder="Your Brand Name"
              />
            </div>

            {/* Niche */}
            <div className="flex flex-col gap-2">
              <Label className="text-[#888888]">Niche</Label>
              <Select
                value={profile.niche}
                onValueChange={(value) =>
                  setProfile((prev) => ({ ...prev, niche: value ?? "" }))
                }
              >
                <SelectTrigger className="border-[#1f1f1f] bg-[#1a1a1a] text-white">
                  <SelectValue placeholder="Select your niche" />
                </SelectTrigger>
                <SelectContent className="border-[#1f1f1f] bg-[#111111]">
                  {NICHES.map((niche) => (
                    <SelectItem key={niche} value={niche} className="text-white">
                      {niche}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Brand Voice */}
            <div className="flex flex-col gap-2">
              <Label className="text-[#888888]">Brand Voice</Label>
              <Select
                value={profile.brandVoice}
                onValueChange={(value) =>
                  setProfile((prev) => ({ ...prev, brandVoice: value ?? "" }))
                }
              >
                <SelectTrigger className="border-[#1f1f1f] bg-[#1a1a1a] text-white">
                  <SelectValue placeholder="Select brand voice" />
                </SelectTrigger>
                <SelectContent className="border-[#1f1f1f] bg-[#111111]">
                  {VOICES.map((voice) => (
                    <SelectItem key={voice} value={voice} className="text-white">
                      {voice}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Target Audience */}
            <div className="col-span-1 flex flex-col gap-2 md:col-span-2">
              <Label htmlFor="targetAudience" className="text-[#888888]">
                Target Audience
              </Label>
              <Textarea
                id="targetAudience"
                value={profile.targetAudience}
                onChange={(e) =>
                  setProfile((prev) => ({
                    ...prev,
                    targetAudience: e.target.value,
                  }))
                }
                className="min-h-[100px] border-[#1f1f1f] bg-[#1a1a1a] text-white"
                placeholder="Describe your target audience (age, interests, pain points...)"
              />
            </div>

            {/* Content Pillars */}
            <div className="col-span-1 flex flex-col gap-2 md:col-span-2">
              <Label className="text-[#888888]">
                Content Pillars ({profile.contentPillars.length}/5)
              </Label>
              <div className="flex flex-wrap gap-2">
                {profile.contentPillars.map((pillar) => (
                  <span
                    key={pillar}
                    className="inline-flex items-center gap-1 rounded-full bg-[#f0b429]/15 px-3 py-1 text-sm text-[#f0b429]"
                  >
                    {pillar}
                    <button
                      onClick={() => removePillar(pillar)}
                      className="ml-1 rounded-full p-0.5 hover:bg-[#f0b429]/30"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
              {profile.contentPillars.length < 5 && (
                <div className="flex gap-2">
                  <Input
                    value={pillarInput}
                    onChange={(e) => setPillarInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addPillar()}
                    className="border-[#1f1f1f] bg-[#1a1a1a] text-white"
                    placeholder="Add a content pillar"
                  />
                  <GoldButton variant="secondary" onClick={addPillar}>
                    <Plus className="h-4 w-4" />
                  </GoldButton>
                </div>
              )}
            </div>

            {/* Posting Goal */}
            <div className="flex flex-col gap-2">
              <Label className="text-[#888888]">
                Posting Goal: {profile.postingGoal} posts/week
              </Label>
              <input
                type="range"
                min={1}
                max={7}
                value={profile.postingGoal}
                onChange={(e) =>
                  setProfile((prev) => ({
                    ...prev,
                    postingGoal: Number(e.target.value),
                  }))
                }
                className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-[#1f1f1f] accent-[#f0b429]"
              />
              <div className="flex justify-between text-xs text-[#888888]">
                <span>1</span>
                <span>7</span>
              </div>
            </div>

            {/* Timezone */}
            <div className="flex flex-col gap-2">
              <Label className="text-[#888888]">Timezone</Label>
              <Select
                value={profile.timezone}
                onValueChange={(value) =>
                  setProfile((prev) => ({ ...prev, timezone: value ?? "" }))
                }
              >
                <SelectTrigger className="border-[#1f1f1f] bg-[#1a1a1a] text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-[#1f1f1f] bg-[#111111]">
                  {TIMEZONES.map((tz) => (
                    <SelectItem key={tz} value={tz} className="text-white">
                      {tz.replace(/_/g, " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Best Posting Times */}
            <div className="col-span-1 flex flex-col gap-2 md:col-span-2">
              <Label className="text-[#888888]">
                Best Posting Times ({profile.bestPostingTimes.length}/7)
              </Label>
              <div className="flex flex-wrap gap-2">
                {profile.bestPostingTimes.map((slot, index) => (
                  <span
                    key={`${slot.day}-${slot.hour}-${index}`}
                    className="inline-flex items-center gap-1 rounded-full border border-[#1f1f1f] bg-[#1a1a1a] px-3 py-1 text-sm text-white"
                  >
                    {slot.day.slice(0, 3)}{" "}
                    {HOURS.find((h) => h.value === slot.hour)?.label}
                    <button
                      onClick={() => removeTimeSlot(index)}
                      className="ml-1 rounded-full p-0.5 hover:bg-[#1f1f1f]"
                    >
                      <X className="h-3 w-3 text-[#888888]" />
                    </button>
                  </span>
                ))}
              </div>
              {profile.bestPostingTimes.length < 7 && (
                <div className="flex gap-2">
                  <Select
                    value={newTimeSlot.day}
                    onValueChange={(value) =>
                      setNewTimeSlot((prev) => ({ ...prev, day: value ?? "" }))
                    }
                  >
                    <SelectTrigger className="w-40 border-[#1f1f1f] bg-[#1a1a1a] text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="border-[#1f1f1f] bg-[#111111]">
                      {DAYS.map((day) => (
                        <SelectItem key={day} value={day} className="text-white">
                          {day}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={newTimeSlot.hour}
                    onValueChange={(value) =>
                      setNewTimeSlot((prev) => ({ ...prev, hour: value ?? "" }))
                    }
                  >
                    <SelectTrigger className="w-32 border-[#1f1f1f] bg-[#1a1a1a] text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="border-[#1f1f1f] bg-[#111111]">
                      {HOURS.map((hour) => (
                        <SelectItem
                          key={hour.value}
                          value={hour.value}
                          className="text-white"
                        >
                          {hour.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <GoldButton variant="secondary" onClick={addTimeSlot}>
                    <Plus className="h-4 w-4" />
                  </GoldButton>
                </div>
              )}
            </div>

            {/* Auto-Post Toggle */}
            <div className="col-span-1 flex items-center justify-between md:col-span-2">
              <div>
                <Label className="text-white">Auto-Post</Label>
                <p className="text-sm text-[#888888]">
                  Automatically publish posts at scheduled times
                </p>
              </div>
              <button
                onClick={() =>
                  setProfile((prev) => ({ ...prev, autoPost: !prev.autoPost }))
                }
                className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full transition-colors ${
                  profile.autoPost ? "bg-[#f0b429]" : "bg-[#333333]"
                }`}
              >
                <span
                  className={`pointer-events-none block h-5 w-5 translate-y-1 rounded-full bg-white shadow-sm transition-transform ${
                    profile.autoPost ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Save Button */}
          <div className="mt-6 flex items-center gap-4">
            <GoldButton onClick={handleSave} disabled={saving}>
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              Save Brand Profile
            </GoldButton>
            {saveMessage && (
              <span
                className={`text-sm ${saveMessage.includes("success") ? "text-[#22c55e]" : "text-[#ef4444]"}`}
              >
                {saveMessage}
              </span>
            )}
          </div>
        </DarkCard>

        <Separator className="bg-[#1f1f1f]" />

        {/* Bio Optimizer */}
        <DarkCard>
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-[#f0b429]" />
              <h3 className="text-lg font-semibold text-white">
                Bio Optimizer
              </h3>
            </div>
            <p className="text-sm text-[#888888]">
              Paste your current Instagram bio and get 3 AI-optimized variations
            </p>
            <Textarea
              value={currentBio}
              onChange={(e) => setCurrentBio(e.target.value)}
              className="min-h-[100px] border-[#1f1f1f] bg-[#1a1a1a] text-white"
              placeholder="Paste your current Instagram bio here..."
            />
            <GoldButton onClick={optimizeBio} disabled={optimizingBio}>
              {optimizingBio ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              Optimize Bio
            </GoldButton>

            {bioVariations.length > 0 && (
              <div className="mt-4 flex flex-col gap-3">
                <h4 className="text-sm font-medium text-[#f0b429]">
                  Optimized Variations
                </h4>
                {bioVariations.map((variation, index) => (
                  <div
                    key={index}
                    className="rounded-lg border border-[#1f1f1f] bg-[#1a1a1a] p-4"
                  >
                    <p className="mb-2 text-xs text-[#888888]">
                      Variation {index + 1}
                    </p>
                    <p className="whitespace-pre-wrap text-sm text-white">
                      {variation}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DarkCard>
      </div>
    </div>
  );
}

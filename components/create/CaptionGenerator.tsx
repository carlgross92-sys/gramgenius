"use client";

import * as React from "react";
import { DarkCard } from "@/components/ui/DarkCard";
import { GoldButton } from "@/components/ui/GoldButton";
import { Loader2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

type PostType = "FEED" | "CAROUSEL" | "STORY";
type Platform = "INSTAGRAM" | "FACEBOOK" | "BOTH";

interface CaptionVariation {
  id: string;
  caption: string;
  hooks: string[];
}

interface CaptionGeneratorProps {
  onCaptionSelect?: (caption: string) => void;
  className?: string;
}

function CaptionGenerator({ onCaptionSelect, className }: CaptionGeneratorProps) {
  const [topic, setTopic] = React.useState("");
  const [postType, setPostType] = React.useState<PostType>("FEED");
  const [platform, setPlatform] = React.useState<Platform>("INSTAGRAM");
  const [isLoading, setIsLoading] = React.useState(false);
  const [variations, setVariations] = React.useState<CaptionVariation[]>([]);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);

  const postTypes: PostType[] = ["FEED", "CAROUSEL", "STORY"];
  const platforms: Platform[] = ["INSTAGRAM", "FACEBOOK", "BOTH"];

  const handleGenerate = async () => {
    if (!topic.trim()) return;
    setIsLoading(true);
    setVariations([]);
    setSelectedId(null);

    try {
      const res = await fetch("/api/ai/caption", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, postType, platform }),
      });
      const data = await res.json();
      if (data.variations) {
        setVariations(data.variations);
      }
    } catch {
      // Error handling could be added here
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelect = (variation: CaptionVariation) => {
    setSelectedId(variation.id);
    onCaptionSelect?.(variation.caption);
  };

  return (
    <div className={cn("flex flex-col gap-6", className)}>
      {/* Input Section */}
      <DarkCard className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold text-white">Generate Caption</h2>

        {/* Topic */}
        <div className="flex flex-col gap-2">
          <label className="text-sm text-[#888888]">Topic or idea</label>
          <textarea
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="Describe what your post is about..."
            rows={3}
            className="w-full resize-none rounded-lg border border-[#1f1f1f] bg-[#0a0a0a] px-4 py-3 text-sm text-white placeholder-[#555] outline-none transition-colors focus:border-[#f0b429]/50"
          />
        </div>

        {/* Post Type Selector */}
        <div className="flex flex-col gap-2">
          <label className="text-sm text-[#888888]">Post Type</label>
          <div className="flex gap-2">
            {postTypes.map((type) => (
              <button
                key={type}
                onClick={() => setPostType(type)}
                className={cn(
                  "rounded-lg border px-4 py-2 text-sm font-medium transition-all",
                  postType === type
                    ? "border-[#f0b429] bg-[#f0b429]/10 text-[#f0b429]"
                    : "border-[#1f1f1f] text-[#888888] hover:border-[#333] hover:text-white"
                )}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {/* Platform Selector */}
        <div className="flex flex-col gap-2">
          <label className="text-sm text-[#888888]">Platform</label>
          <div className="flex gap-2">
            {platforms.map((p) => (
              <button
                key={p}
                onClick={() => setPlatform(p)}
                className={cn(
                  "rounded-lg border px-4 py-2 text-sm font-medium transition-all",
                  platform === p
                    ? "border-[#f0b429] bg-[#f0b429]/10 text-[#f0b429]"
                    : "border-[#1f1f1f] text-[#888888] hover:border-[#333] hover:text-white"
                )}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Generate Button */}
        <GoldButton
          onClick={handleGenerate}
          disabled={!topic.trim() || isLoading}
          className="self-start"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              Generate Caption
            </>
          )}
        </GoldButton>
      </DarkCard>

      {/* Variations */}
      {variations.length > 0 && (
        <div className="flex flex-col gap-3">
          <h3 className="text-sm font-medium text-[#888888]">
            Choose a variation
          </h3>
          {variations.map((variation) => (
            <DarkCard
              key={variation.id}
              className={cn(
                "cursor-pointer transition-all",
                selectedId === variation.id
                  ? "border-[#f0b429] shadow-[0_0_20px_rgba(240,180,41,0.15)]"
                  : "hover:border-[#333]"
              )}
              onClick={() => handleSelect(variation)}
            >
              <div className="flex flex-col gap-3">
                {/* Radio indicator */}
                <div className="flex items-start gap-3">
                  <div
                    className={cn(
                      "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                      selectedId === variation.id
                        ? "border-[#f0b429]"
                        : "border-[#555]"
                    )}
                  >
                    {selectedId === variation.id && (
                      <div className="h-2 w-2 rounded-full bg-[#f0b429]" />
                    )}
                  </div>
                  <p className="text-sm leading-relaxed text-white">
                    {variation.caption}
                  </p>
                </div>

                {/* Hook alternatives */}
                {variation.hooks.length > 0 && (
                  <div className="ml-7 flex flex-col gap-1">
                    <span className="text-xs text-[#888888]">
                      Hook alternatives:
                    </span>
                    {variation.hooks.map((hook, i) => (
                      <span key={i} className="text-xs text-[#666]">
                        &bull; {hook}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </DarkCard>
          ))}
        </div>
      )}
    </div>
  );
}

export { CaptionGenerator };
export type { CaptionGeneratorProps, CaptionVariation };

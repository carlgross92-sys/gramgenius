"use client";

import * as React from "react";
import { DarkCard } from "@/components/ui/DarkCard";
import { cn } from "@/lib/utils";

type HashtagTier = "mega" | "mid" | "niche" | "micro";

interface HashtagsByTier {
  mega?: string[];
  mid?: string[];
  niche?: string[];
  micro?: string[];
}

interface HashtagPanelProps {
  hashtags: HashtagsByTier;
  onSelect?: (selected: string[]) => void;
  className?: string;
}

const TIER_CONFIG: Record<HashtagTier, { label: string; color: string; bg: string }> = {
  mega: { label: "Mega", color: "#f0b429", bg: "rgba(240,180,41,0.15)" },
  mid: { label: "Mid", color: "#3b82f6", bg: "rgba(59,130,246,0.15)" },
  niche: { label: "Niche", color: "#22c55e", bg: "rgba(34,197,94,0.15)" },
  micro: { label: "Micro", color: "#a855f7", bg: "rgba(168,85,247,0.15)" },
};

const MAX_HASHTAGS = 20;

function HashtagPanel({ hashtags, onSelect, className }: HashtagPanelProps) {
  const [selected, setSelected] = React.useState<Set<string>>(new Set());

  const toggleHashtag = (tag: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(tag)) {
        next.delete(tag);
      } else if (next.size < MAX_HASHTAGS) {
        next.add(tag);
      }
      const arr = Array.from(next);
      onSelect?.(arr);
      return next;
    });
  };

  const tiers: HashtagTier[] = ["mega", "mid", "niche", "micro"];

  return (
    <DarkCard className={cn("flex flex-col gap-5", className)}>
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Hashtags</h2>
        <span
          className={cn(
            "text-sm font-medium",
            selected.size >= MAX_HASHTAGS ? "text-[#ef4444]" : "text-[#888888]"
          )}
        >
          {selected.size}/{MAX_HASHTAGS} selected
        </span>
      </div>

      {tiers.map((tier) => {
        const tags = hashtags[tier];
        if (!tags || tags.length === 0) return null;
        const config = TIER_CONFIG[tier];

        return (
          <div key={tier} className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: config.color }}
              />
              <span className="text-sm font-medium" style={{ color: config.color }}>
                {config.label}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => {
                const isSelected = selected.has(tag);
                return (
                  <button
                    key={tag}
                    onClick={() => toggleHashtag(tag)}
                    className={cn(
                      "rounded-full px-3 py-1 text-xs font-medium transition-all",
                      isSelected
                        ? "scale-[1.02]"
                        : "hover:scale-[1.02]"
                    )}
                    style={{
                      color: isSelected ? "#000" : config.color,
                      backgroundColor: isSelected ? config.color : config.bg,
                      borderWidth: 1,
                      borderStyle: "solid",
                      borderColor: isSelected ? config.color : "transparent",
                    }}
                  >
                    #{tag.replace(/^#/, "")}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </DarkCard>
  );
}

export { HashtagPanel };
export type { HashtagPanelProps, HashtagsByTier, HashtagTier };

"use client";

import * as React from "react";
import { GoldButton } from "@/components/ui/GoldButton";
import { Download } from "lucide-react";
import { cn } from "@/lib/utils";

interface ReelPreviewProps {
  videoUrl?: string | null;
  caption?: string;
  className?: string;
}

function ReelPreview({ videoUrl, caption, className }: ReelPreviewProps) {
  return (
    <div className={cn("flex flex-col items-center gap-4", className)}>
      {/* Phone mockup */}
      <div
        className="overflow-hidden rounded-[2rem] border-4 border-[#333] bg-black"
        style={{ aspectRatio: "9/16", width: 280 }}
      >
        {videoUrl ? (
          <video
            src={videoUrl}
            controls
            className="h-full w-full object-cover"
            playsInline
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <span className="text-sm text-[#555]">No video yet</span>
          </div>
        )}
      </div>

      {/* Caption */}
      {caption && (
        <p className="max-w-sm text-center text-sm leading-relaxed text-[#ccc]">
          {caption}
        </p>
      )}

      {/* Download button */}
      {videoUrl && (
        <GoldButton
          variant="secondary"
          onClick={() => {
            const a = document.createElement("a");
            a.href = videoUrl;
            a.download = "reel.mp4";
            a.click();
          }}
        >
          <Download className="h-4 w-4" />
          Download Reel
        </GoldButton>
      )}
    </div>
  );
}

export { ReelPreview };
export type { ReelPreviewProps };

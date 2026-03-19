"use client";

import * as React from "react";
import { DarkCard } from "@/components/ui/DarkCard";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type SceneStatus = "pending" | "generating_image" | "creating_video" | "done" | "failed";

interface SceneProgress {
  sceneNumber: number;
  status: SceneStatus;
}

interface ReelVideoGeneratorProps {
  scenes: SceneProgress[];
  status: "idle" | "generating" | "complete" | "error";
  className?: string;
}

const statusLabels: Record<SceneStatus, string> = {
  pending: "Waiting...",
  generating_image: "Generating image...",
  creating_video: "Creating video...",
  done: "Done",
  failed: "Failed",
};

function getStatusIcon(status: SceneStatus) {
  switch (status) {
    case "pending":
      return <div className="h-4 w-4 rounded-full border-2 border-[#333]" />;
    case "generating_image":
    case "creating_video":
      return <Loader2 className="h-4 w-4 animate-spin text-[#f0b429]" />;
    case "done":
      return <CheckCircle2 className="h-4 w-4 text-[#22c55e]" />;
    case "failed":
      return <XCircle className="h-4 w-4 text-[#ef4444]" />;
  }
}

function ReelVideoGenerator({
  scenes,
  status,
  className,
}: ReelVideoGeneratorProps) {
  const completedCount = scenes.filter((s) => s.status === "done").length;
  const totalCount = scenes.length;
  const progressPercent = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  return (
    <DarkCard className={cn("flex flex-col gap-5", className)}>
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Video Generation</h2>
        {status === "complete" && (
          <span className="text-xs font-medium text-[#22c55e]">Complete</span>
        )}
        {status === "error" && (
          <span className="text-xs font-medium text-[#ef4444]">Error</span>
        )}
      </div>

      {/* Overall progress */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between text-xs text-[#888888]">
          <span>Overall progress</span>
          <span>
            {completedCount}/{totalCount} scenes
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-[#1f1f1f]">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-700",
              status === "error" ? "bg-[#ef4444]" : "bg-[#f0b429]"
            )}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Per-scene status */}
      <div className="flex flex-col gap-3">
        {scenes.map((scene) => (
          <div
            key={scene.sceneNumber}
            className="flex items-center gap-3 rounded-lg border border-[#1f1f1f] bg-[#0a0a0a] px-4 py-3"
          >
            {getStatusIcon(scene.status)}
            <span className="text-sm font-medium text-white">
              Scene {scene.sceneNumber}
            </span>
            <span
              className={cn(
                "ml-auto text-xs",
                scene.status === "done"
                  ? "text-[#22c55e]"
                  : scene.status === "failed"
                  ? "text-[#ef4444]"
                  : scene.status === "pending"
                  ? "text-[#555]"
                  : "text-[#f0b429]"
              )}
            >
              {statusLabels[scene.status]}
            </span>
          </div>
        ))}
      </div>
    </DarkCard>
  );
}

export { ReelVideoGenerator };
export type { ReelVideoGeneratorProps, SceneProgress, SceneStatus };

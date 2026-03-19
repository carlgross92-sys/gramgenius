"use client";

import * as React from "react";
import { DarkCard } from "@/components/ui/DarkCard";
import { Pencil, Check, Film } from "lucide-react";
import { cn } from "@/lib/utils";

interface SceneData {
  id: string;
  sceneNumber: number;
  duration: string;
  onScreenText: string;
  voiceoverLine: string;
  visualDescription: string;
  bRollSuggestion: string;
}

interface ReelScript {
  scenes: SceneData[];
}

interface ReelScriptPanelProps {
  script: ReelScript;
  onUpdate?: (scenes: SceneData[]) => void;
  className?: string;
}

interface EditableFieldProps {
  label: string;
  value: string;
  onSave: (value: string) => void;
}

function EditableField({ label, value, onSave }: EditableFieldProps) {
  const [isEditing, setIsEditing] = React.useState(false);
  const [editValue, setEditValue] = React.useState(value);

  const handleSave = () => {
    onSave(editValue);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    }
    if (e.key === "Escape") {
      setEditValue(value);
      setIsEditing(false);
    }
  };

  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-[#888888]">{label}</span>
      {isEditing ? (
        <div className="flex items-start gap-2">
          <textarea
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
            rows={2}
            className="flex-1 resize-none rounded-md border border-[#f0b429]/50 bg-[#0a0a0a] px-3 py-2 text-sm text-white outline-none"
          />
          <button
            onClick={handleSave}
            className="mt-1 rounded-md p-1.5 text-[#22c55e] transition-colors hover:bg-[#22c55e]/10"
          >
            <Check className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <div
          onClick={() => setIsEditing(true)}
          className="group flex cursor-pointer items-start gap-2 rounded-md px-3 py-2 transition-colors hover:bg-[#1a1a1a]"
        >
          <p className="flex-1 text-sm text-white">{value}</p>
          <Pencil className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#555] opacity-0 transition-opacity group-hover:opacity-100" />
        </div>
      )}
    </div>
  );
}

function ReelScriptPanel({ script, onUpdate, className }: ReelScriptPanelProps) {
  const [scenes, setScenes] = React.useState<SceneData[]>(script.scenes);

  React.useEffect(() => {
    setScenes(script.scenes);
  }, [script.scenes]);

  const updateScene = (
    sceneId: string,
    field: keyof SceneData,
    value: string
  ) => {
    const updated = scenes.map((s) =>
      s.id === sceneId ? { ...s, [field]: value } : s
    );
    setScenes(updated);
    onUpdate?.(updated);
  };

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <h2 className="text-lg font-semibold text-white">Reel Script</h2>
      {scenes.map((scene) => (
        <DarkCard key={scene.id} className="flex flex-col gap-4">
          {/* Scene header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#f0b429] text-xs font-bold text-black">
                {scene.sceneNumber}
              </span>
              <Film className="h-4 w-4 text-[#888888]" />
              <span className="text-sm font-medium text-white">
                Scene {scene.sceneNumber}
              </span>
            </div>
            <span className="rounded-full bg-[#1f1f1f] px-2.5 py-0.5 text-xs text-[#888888]">
              {scene.duration}
            </span>
          </div>

          {/* Editable fields */}
          <EditableField
            label="On-screen Text"
            value={scene.onScreenText}
            onSave={(v) => updateScene(scene.id, "onScreenText", v)}
          />
          <EditableField
            label="Voiceover Line"
            value={scene.voiceoverLine}
            onSave={(v) => updateScene(scene.id, "voiceoverLine", v)}
          />
          <EditableField
            label="Visual Description"
            value={scene.visualDescription}
            onSave={(v) => updateScene(scene.id, "visualDescription", v)}
          />
          <EditableField
            label="B-Roll Suggestion"
            value={scene.bRollSuggestion}
            onSave={(v) => updateScene(scene.id, "bRollSuggestion", v)}
          />
        </DarkCard>
      ))}
      {scenes.length === 0 && (
        <DarkCard>
          <p className="text-center text-sm text-[#888888]">
            No script scenes yet. Generate a reel script to get started.
          </p>
        </DarkCard>
      )}
    </div>
  );
}

export { ReelScriptPanel };
export type { ReelScriptPanelProps, ReelScript, SceneData };

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { GoldButton } from "@/components/ui/GoldButton";
import { DarkCard } from "@/components/ui/DarkCard";
import { ReelScriptPanel } from "@/components/reels/ReelScriptPanel";
import { ReelVideoGenerator } from "@/components/reels/ReelVideoGenerator";
import { VoiceoverPanel } from "@/components/reels/VoiceoverPanel";
import { ReelPreview } from "@/components/reels/ReelPreview";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Loader2,
  Film,
  Sparkles,
  Check,
  Mic,
  Video,
  Eye,
  FileText,
  Clock,
  Send,
  Download,
} from "lucide-react";

const REEL_STYLES = [
  "Educational",
  "Entertaining",
  "Inspirational",
  "Behind-the-Scenes",
  "Controversial",
  "Before & After",
];

const DURATIONS = [
  { value: "15", label: "15 seconds" },
  { value: "30", label: "30 seconds" },
  { value: "60", label: "60 seconds" },
  { value: "90", label: "90 seconds" },
];

interface Scene {
  id: string;
  sceneNumber: number;
  visual: string;
  narration: string;
  duration: number;
  textOverlay: string;
}

interface ReelState {
  topic: string;
  style: string;
  duration: string;
  scenes: Scene[];
  voiceoverUrl: string;
  videoUrl: string;
  scheduledDate: Date | undefined;
  scheduledHour: string;
}

const STEPS = [
  { label: "Script", icon: FileText, step: 0 },
  { label: "Edit Scenes", icon: Film, step: 1 },
  { label: "Voiceover", icon: Mic, step: 2 },
  { label: "Generate Video", icon: Video, step: 3 },
  { label: "Preview & Publish", icon: Eye, step: 4 },
];

export default function ReelsPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [reel, setReel] = useState<ReelState>({
    topic: "",
    style: "Educational",
    duration: "30",
    scenes: [],
    voiceoverUrl: "",
    videoUrl: "",
    scheduledDate: undefined,
    scheduledHour: "9",
  });
  const [generatingScript, setGeneratingScript] = useState(false);
  const [generatingVoiceover, setGeneratingVoiceover] = useState(false);
  const [generatingVideo, setGeneratingVideo] = useState(false);
  const [videoProgress, setVideoProgress] = useState<Record<string, number>>(
    {}
  );
  const [submitting, setSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);

  const HOURS = Array.from({ length: 24 }, (_, i) => {
    const period = i >= 12 ? "PM" : "AM";
    const hour = i % 12 || 12;
    return { value: String(i), label: `${hour}:00 ${period}` };
  });

  async function generateScript() {
    if (!reel.topic.trim()) return;
    try {
      setGeneratingScript(true);
      const res = await fetch("/api/generate/reel-script", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: reel.topic,
          style: reel.style,
          duration: Number(reel.duration),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setReel((prev) => ({
          ...prev,
          scenes: data.scenes || data.script?.scenes || [],
        }));
        setCurrentStep(1);
      }
    } catch {
      // Silent fail
    } finally {
      setGeneratingScript(false);
    }
  }

  async function generateVoiceover() {
    try {
      setGeneratingVoiceover(true);
      const res = await fetch("/api/generate/reel-voiceover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scenes: reel.scenes,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setReel((prev) => ({
          ...prev,
          voiceoverUrl: data.audioUrl || data.url || "",
        }));
        setCurrentStep(3);
      }
    } catch {
      // Silent fail
    } finally {
      setGeneratingVoiceover(false);
    }
  }

  async function generateVideo() {
    try {
      setGeneratingVideo(true);
      setVideoProgress({});

      // Simulate progress per scene
      for (let i = 0; i < reel.scenes.length; i++) {
        const scene = reel.scenes[i];
        setVideoProgress((prev) => ({ ...prev, [scene.id]: 0 }));

        // Simulate progressive loading
        for (let p = 0; p <= 100; p += 20) {
          await new Promise((resolve) => setTimeout(resolve, 300));
          setVideoProgress((prev) => ({ ...prev, [scene.id]: p }));
        }
      }

      const res = await fetch("/api/generate/reel-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scenes: reel.scenes,
          voiceoverUrl: reel.voiceoverUrl,
          style: reel.style,
          duration: Number(reel.duration),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setReel((prev) => ({
          ...prev,
          videoUrl: data.videoUrl || data.url || "",
        }));
        setCurrentStep(4);
      }
    } catch {
      // Silent fail
    } finally {
      setGeneratingVideo(false);
    }
  }

  async function publishReel() {
    try {
      setSubmitting(true);
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postType: "Reel",
          topic: reel.topic,
          videoUrl: reel.videoUrl,
          voiceoverUrl: reel.voiceoverUrl,
          scenes: reel.scenes,
          status: "PUBLISHED",
        }),
      });
      if (res.ok) {
        setSubmitMessage("Reel published successfully!");
        setTimeout(() => router.push("/"), 2000);
      }
    } catch {
      setSubmitMessage("Failed to publish reel.");
    } finally {
      setSubmitting(false);
    }
  }

  async function scheduleReel() {
    if (!reel.scheduledDate) return;
    try {
      setSubmitting(true);
      const scheduledAt = new Date(reel.scheduledDate);
      scheduledAt.setHours(Number(reel.scheduledHour), 0, 0, 0);

      await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postType: "Reel",
          topic: reel.topic,
          videoUrl: reel.videoUrl,
          voiceoverUrl: reel.voiceoverUrl,
          scenes: reel.scenes,
          status: "SCHEDULED",
          scheduledAt: scheduledAt.toISOString(),
        }),
      });
      setSubmitMessage("Reel scheduled!");
      setTimeout(() => router.push("/calendar"), 2000);
    } catch {
      setSubmitMessage("Failed to schedule reel.");
    } finally {
      setSubmitting(false);
    }
  }

  function updateScene(sceneId: string, updates: Partial<Scene>) {
    setReel((prev) => ({
      ...prev,
      scenes: prev.scenes.map((s) =>
        s.id === sceneId ? { ...s, ...updates } : s
      ),
    }));
  }

  return (
    <div className="flex flex-col">
      <Header title="AI Reel Studio" />

      <div className="flex gap-6 p-6">
        {/* Vertical Step Indicator */}
        <div className="hidden w-48 shrink-0 flex-col gap-1 lg:flex">
          {STEPS.map((s, index) => {
            const Icon = s.icon;
            const isActive = index === currentStep;
            const isCompleted = index < currentStep;
            return (
              <button
                key={s.label}
                onClick={() => {
                  if (isCompleted || isActive) setCurrentStep(index);
                }}
                className={`flex items-center gap-3 rounded-lg px-3 py-3 text-left text-sm transition-all ${
                  isActive
                    ? "bg-[#f0b429]/10 text-[#f0b429]"
                    : isCompleted
                      ? "text-[#22c55e]"
                      : "text-[#555555]"
                }`}
              >
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    isActive
                      ? "bg-[#f0b429] text-black"
                      : isCompleted
                        ? "bg-[#22c55e]/20 text-[#22c55e]"
                        : "bg-[#1f1f1f] text-[#555555]"
                  }`}
                >
                  {isCompleted ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Icon className="h-4 w-4" />
                  )}
                </div>
                <span className="font-medium">{s.label}</span>
              </button>
            );
          })}
        </div>

        {/* Main Content */}
        <div className="flex flex-1 flex-col gap-6 lg:flex-row">
          {/* Left Panel: Inputs / Script */}
          <div className="flex flex-1 flex-col gap-6">
            {/* Step 1: Topic & Style */}
            {currentStep === 0 && (
              <DarkCard>
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-2">
                    <Film className="h-5 w-5 text-[#f0b429]" />
                    <h3 className="text-lg font-semibold text-white">
                      Reel Setup
                    </h3>
                  </div>

                  <div className="flex flex-col gap-2">
                    <Label className="text-[#888888]">Topic</Label>
                    <Textarea
                      value={reel.topic}
                      onChange={(e) =>
                        setReel((prev) => ({
                          ...prev,
                          topic: e.target.value,
                        }))
                      }
                      className="min-h-[100px] border-[#1f1f1f] bg-[#1a1a1a] text-white"
                      placeholder="What should this reel be about?"
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="flex flex-col gap-2">
                      <Label className="text-[#888888]">Reel Style</Label>
                      <Select
                        value={reel.style}
                        onValueChange={(value) =>
                          setReel((prev) => ({ ...prev, style: value ?? "" }))
                        }
                      >
                        <SelectTrigger className="border-[#1f1f1f] bg-[#1a1a1a] text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="border-[#1f1f1f] bg-[#111111]">
                          {REEL_STYLES.map((style) => (
                            <SelectItem
                              key={style}
                              value={style}
                              className="text-white"
                            >
                              {style}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex flex-col gap-2">
                      <Label className="text-[#888888]">Duration</Label>
                      <Select
                        value={reel.duration}
                        onValueChange={(value) =>
                          setReel((prev) => ({ ...prev, duration: value ?? "" }))
                        }
                      >
                        <SelectTrigger className="border-[#1f1f1f] bg-[#1a1a1a] text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="border-[#1f1f1f] bg-[#111111]">
                          {DURATIONS.map((d) => (
                            <SelectItem
                              key={d.value}
                              value={d.value}
                              className="text-white"
                            >
                              {d.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <GoldButton
                    onClick={generateScript}
                    disabled={generatingScript || !reel.topic.trim()}
                    className="mt-2"
                  >
                    {generatingScript ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Sparkles className="h-4 w-4" />
                    )}
                    Generate Reel Script
                  </GoldButton>
                </div>
              </DarkCard>
            )}

            {/* Step 2: Edit Scenes */}
            {currentStep === 1 && (
              <div className="flex flex-col gap-4">
                <ReelScriptPanel
                  script={{ scenes: reel.scenes.map(s => ({
                    id: s.id,
                    sceneNumber: s.sceneNumber,
                    duration: String(s.duration),
                    onScreenText: s.textOverlay || "",
                    voiceoverLine: s.narration || "",
                    visualDescription: s.visual || "",
                    bRollSuggestion: "",
                  })) }}
                />
                <div className="flex gap-3">
                  <GoldButton
                    variant="secondary"
                    onClick={() => setCurrentStep(0)}
                  >
                    Back to Setup
                  </GoldButton>
                  <GoldButton onClick={() => setCurrentStep(2)}>
                    Continue to Voiceover
                  </GoldButton>
                </div>
              </div>
            )}

            {/* Step 3: Voiceover */}
            {currentStep === 2 && (
              <div className="flex flex-col gap-4">
                <VoiceoverPanel
                  script={reel.scenes.map(s => s.narration || "").join(" ")}
                  voiceoverUrl={reel.voiceoverUrl || null}
                />
                <GoldButton
                  onClick={generateVoiceover}
                  disabled={generatingVoiceover}
                >
                  {generatingVoiceover ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Mic className="h-4 w-4" />
                  )}
                  Generate Voiceover
                </GoldButton>
                {reel.voiceoverUrl && (
                  <DarkCard>
                    <h4 className="mb-2 text-sm font-medium text-[#888888]">
                      Audio Preview
                    </h4>
                    <audio
                      controls
                      src={reel.voiceoverUrl}
                      className="w-full"
                    />
                  </DarkCard>
                )}
                <div className="flex gap-3">
                  <GoldButton
                    variant="secondary"
                    onClick={() => setCurrentStep(1)}
                  >
                    Back
                  </GoldButton>
                  <GoldButton onClick={() => setCurrentStep(3)}>
                    Continue to Video
                  </GoldButton>
                </div>
              </div>
            )}

            {/* Step 4: Generate Video */}
            {currentStep === 3 && (
              <div className="flex flex-col gap-4">
                <ReelVideoGenerator
                  scenes={reel.scenes.map((s) => ({
                    sceneNumber: s.sceneNumber,
                    status: (generatingVideo
                      ? (videoProgress[s.id] === 100 ? "done" : videoProgress[s.id] > 0 ? "creating_video" : "pending")
                      : reel.videoUrl ? "done" : "pending"
                    ) as "pending" | "generating_image" | "creating_video" | "done" | "failed",
                  }))}
                  status={generatingVideo ? "generating" : reel.videoUrl ? "complete" : "idle"}
                />
                <GoldButton
                  onClick={generateVideo}
                  disabled={generatingVideo}
                >
                  {generatingVideo ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Video className="h-4 w-4" />
                  )}
                  Generate Video
                </GoldButton>

                {/* Per-scene progress */}
                {generatingVideo && reel.scenes.length > 0 && (
                  <DarkCard>
                    <h4 className="mb-3 text-sm font-medium text-[#888888]">
                      Rendering Progress
                    </h4>
                    <div className="flex flex-col gap-2">
                      {reel.scenes.map((scene) => (
                        <div key={scene.id} className="flex items-center gap-3">
                          <span className="w-20 text-xs text-[#888888]">
                            Scene {scene.sceneNumber}
                          </span>
                          <div className="flex-1 rounded-full bg-[#1f1f1f]">
                            <div
                              className="h-2 rounded-full bg-[#f0b429] transition-all duration-300"
                              style={{
                                width: `${videoProgress[scene.id] || 0}%`,
                              }}
                            />
                          </div>
                          <span className="w-10 text-right text-xs text-[#888888]">
                            {videoProgress[scene.id] || 0}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </DarkCard>
                )}

                <div className="flex gap-3">
                  <GoldButton
                    variant="secondary"
                    onClick={() => setCurrentStep(2)}
                  >
                    Back
                  </GoldButton>
                  {reel.videoUrl && (
                    <GoldButton onClick={() => setCurrentStep(4)}>
                      Preview & Publish
                    </GoldButton>
                  )}
                </div>
              </div>
            )}

            {/* Step 5: Preview & Publish */}
            {currentStep === 4 && (
              <div className="flex flex-col gap-4">
                <DarkCard>
                  <h3 className="mb-4 text-lg font-semibold text-white">
                    Publish Options
                  </h3>
                  <div className="flex flex-col gap-3">
                    <GoldButton
                      onClick={publishReel}
                      disabled={submitting}
                      className="w-full"
                    >
                      {submitting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                      Publish Reel
                    </GoldButton>

                    <div className="rounded-lg border border-[#1f1f1f] p-4">
                      <h4 className="mb-3 text-sm font-medium text-white">
                        Schedule Reel
                      </h4>
                      <Calendar
                        mode="single"
                        selected={reel.scheduledDate}
                        onSelect={(date) =>
                          setReel((prev) => ({
                            ...prev,
                            scheduledDate: date,
                          }))
                        }
                        className="rounded-md border border-[#1f1f1f]"
                      />
                      <Select
                        value={reel.scheduledHour}
                        onValueChange={(value) =>
                          setReel((prev) => ({
                            ...prev,
                            scheduledHour: value ?? "",
                          }))
                        }
                      >
                        <SelectTrigger className="mt-3 border-[#1f1f1f] bg-[#1a1a1a] text-white">
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
                      <GoldButton
                        variant="secondary"
                        onClick={scheduleReel}
                        disabled={submitting || !reel.scheduledDate}
                        className="mt-3 w-full"
                      >
                        <Clock className="h-4 w-4" />
                        Schedule Reel
                      </GoldButton>
                    </div>

                    {reel.videoUrl && (
                      <a
                        href={reel.videoUrl}
                        download
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <GoldButton variant="secondary" className="w-full">
                          <Download className="h-4 w-4" />
                          Download Reel
                        </GoldButton>
                      </a>
                    )}
                  </div>

                  {submitMessage && (
                    <p
                      className={`mt-4 text-center text-sm ${submitMessage.includes("success") || submitMessage.includes("scheduled") ? "text-[#22c55e]" : "text-[#ef4444]"}`}
                    >
                      {submitMessage}
                    </p>
                  )}
                </DarkCard>
              </div>
            )}
          </div>

          {/* Right Panel: Preview */}
          <div className="hidden w-80 shrink-0 flex-col gap-4 xl:flex">
            <ReelPreview
              videoUrl={reel.videoUrl || undefined}
              caption={reel.topic}
            />

            {/* Status summary */}
            <DarkCard>
              <h4 className="mb-3 text-sm font-medium text-[#888888]">
                Reel Status
              </h4>
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[#888888]">Script</span>
                  <span
                    className={`text-xs font-medium ${reel.scenes.length > 0 ? "text-[#22c55e]" : "text-[#555555]"}`}
                  >
                    {reel.scenes.length > 0
                      ? `${reel.scenes.length} scenes`
                      : "Not generated"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[#888888]">Voiceover</span>
                  <span
                    className={`text-xs font-medium ${reel.voiceoverUrl ? "text-[#22c55e]" : "text-[#555555]"}`}
                  >
                    {reel.voiceoverUrl ? "Ready" : "Not generated"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[#888888]">Video</span>
                  <span
                    className={`text-xs font-medium ${reel.videoUrl ? "text-[#22c55e]" : "text-[#555555]"}`}
                  >
                    {reel.videoUrl ? "Ready" : "Not generated"}
                  </span>
                </div>
              </div>
            </DarkCard>
          </div>
        </div>
      </div>
    </div>
  );
}

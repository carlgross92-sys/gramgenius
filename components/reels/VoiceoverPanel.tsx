"use client";

import * as React from "react";
import { DarkCard } from "@/components/ui/DarkCard";
import { GoldButton } from "@/components/ui/GoldButton";
import { Play, Pause, Loader2, RefreshCw, Volume2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface VoiceoverPanelProps {
  script: string;
  voiceoverUrl?: string | null;
  onGenerate?: () => void;
  className?: string;
}

function VoiceoverPanel({
  script,
  voiceoverUrl,
  onGenerate,
  className,
}: VoiceoverPanelProps) {
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [currentTime, setCurrentTime] = React.useState(0);
  const [duration, setDuration] = React.useState(0);
  const [isGenerating, setIsGenerating] = React.useState(false);
  const audioRef = React.useRef<HTMLAudioElement>(null);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    audioRef.current.currentTime = ratio * duration;
    setCurrentTime(ratio * duration);
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    onGenerate?.();
    // The parent handles actual generation; we just show loading state
    // Reset after a timeout in case parent doesn't update voiceoverUrl
    setTimeout(() => setIsGenerating(false), 10000);
  };

  React.useEffect(() => {
    if (voiceoverUrl) {
      setIsGenerating(false);
    }
  }, [voiceoverUrl]);

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <DarkCard className={cn("flex flex-col gap-5", className)}>
      <div className="flex items-center gap-2">
        <Volume2 className="h-5 w-5 text-[#f0b429]" />
        <h2 className="text-lg font-semibold text-white">Voiceover</h2>
      </div>

      {/* Script text */}
      <div className="rounded-lg border border-[#1f1f1f] bg-[#0a0a0a] p-4">
        <p className="text-sm leading-relaxed text-[#ccc]">{script}</p>
      </div>

      {/* Audio player */}
      {voiceoverUrl ? (
        <div className="flex flex-col gap-3">
          <audio
            ref={audioRef}
            src={voiceoverUrl}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onEnded={handleEnded}
            preload="metadata"
          />

          <div className="flex items-center gap-3">
            <button
              onClick={togglePlay}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#f0b429] text-black transition-transform hover:scale-105"
            >
              {isPlaying ? (
                <Pause className="h-4 w-4" />
              ) : (
                <Play className="ml-0.5 h-4 w-4" />
              )}
            </button>

            {/* Progress bar */}
            <div className="flex flex-1 flex-col gap-1">
              <div
                onClick={handleSeek}
                className="group h-2 w-full cursor-pointer overflow-hidden rounded-full bg-[#1f1f1f]"
              >
                <div
                  className="h-full rounded-full bg-[#f0b429] transition-all duration-100"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-[#888888]">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>
          </div>

          <GoldButton variant="secondary" onClick={handleGenerate} className="self-start">
            <RefreshCw className="h-4 w-4" />
            Regenerate
          </GoldButton>
        </div>
      ) : (
        <GoldButton
          onClick={handleGenerate}
          disabled={isGenerating || !script.trim()}
          className="self-start"
        >
          {isGenerating ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Generating Voiceover...
            </>
          ) : (
            "Generate Voiceover"
          )}
        </GoldButton>
      )}
    </DarkCard>
  );
}

export { VoiceoverPanel };
export type { VoiceoverPanelProps };

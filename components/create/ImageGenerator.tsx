"use client";

import * as React from "react";
import { DarkCard } from "@/components/ui/DarkCard";
import { GoldButton } from "@/components/ui/GoldButton";
import { Loader2, ImageIcon, RefreshCw, Upload } from "lucide-react";
import { cn } from "@/lib/utils";

interface ImageGeneratorProps {
  onImageGenerated?: (url: string) => void;
  className?: string;
}

function ImageGenerator({ onImageGenerated, className }: ImageGeneratorProps) {
  const [prompt, setPrompt] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [progress, setProgress] = React.useState(0);
  const [imageUrl, setImageUrl] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setIsLoading(true);
    setProgress(0);
    setImageUrl(null);

    // Simulate progress
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90;
        }
        return prev + 10;
      });
    }, 500);

    try {
      const res = await fetch("/api/ai/image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      const data = await res.json();
      clearInterval(progressInterval);
      setProgress(100);

      if (data.url) {
        setImageUrl(data.url);
        onImageGenerated?.(data.url);
      }
    } catch {
      clearInterval(progressInterval);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegenerate = () => {
    handleGenerate();
  };

  const handleUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    setImageUrl(url);
    onImageGenerated?.(url);
  };

  return (
    <div className={cn("flex flex-col gap-6", className)}>
      <DarkCard className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold text-white">Generate Image</h2>

        <div className="flex flex-col gap-2">
          <label className="text-sm text-[#888888]">Image description</label>
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe the image you want to create..."
            className="w-full rounded-lg border border-[#1f1f1f] bg-[#0a0a0a] px-4 py-3 text-sm text-white placeholder-[#555] outline-none transition-colors focus:border-[#f0b429]/50"
          />
        </div>

        <GoldButton
          onClick={handleGenerate}
          disabled={!prompt.trim() || isLoading}
          className="self-start"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <ImageIcon className="h-4 w-4" />
              Generate Image
            </>
          )}
        </GoldButton>

        {/* Progress bar */}
        {isLoading && (
          <div className="flex flex-col gap-2">
            <div className="h-2 w-full overflow-hidden rounded-full bg-[#1f1f1f]">
              <div
                className="h-full rounded-full bg-[#f0b429] transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-xs text-[#888888]">{progress}% complete</span>
          </div>
        )}
      </DarkCard>

      {/* Phone Mockup Preview */}
      {imageUrl && (
        <div className="flex flex-col items-center gap-4">
          <div className="overflow-hidden rounded-[2rem] border-4 border-[#333] bg-black" style={{ aspectRatio: "9/16", width: 280 }}>
            <img
              src={imageUrl}
              alt="Generated"
              className="h-full w-full object-cover"
            />
          </div>

          <div className="flex gap-3">
            <GoldButton variant="secondary" onClick={handleRegenerate}>
              <RefreshCw className="h-4 w-4" />
              Regenerate
            </GoldButton>
            <GoldButton variant="secondary" onClick={handleUpload}>
              <Upload className="h-4 w-4" />
              Upload Your Own
            </GoldButton>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>
      )}
    </div>
  );
}

export { ImageGenerator };
export type { ImageGeneratorProps };

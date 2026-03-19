"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { GoldButton } from "@/components/ui/GoldButton";
import { DarkCard } from "@/components/ui/DarkCard";
import { CaptionGenerator } from "@/components/create/CaptionGenerator";
import { ImageGenerator } from "@/components/create/ImageGenerator";
import { PostPreview } from "@/components/create/PostPreview";
import { HashtagPanel } from "@/components/create/HashtagPanel";
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
  ChevronLeft,
  ChevronRight,
  Check,
  Clock,
  Save,
  Send,
  Image as ImageIcon,
  Type,
  FileText,
  Palette,
} from "lucide-react";

const STEPS = [
  { label: "Topic", icon: FileText },
  { label: "Caption", icon: Type },
  { label: "Image", icon: ImageIcon },
  { label: "Schedule", icon: Clock },
];

const POST_TYPES = ["Feed", "Carousel", "Story"];
const PLATFORMS = ["Instagram"];

interface PostState {
  topic: string;
  postType: string;
  platform: string;
  caption: string;
  hashtags: string[];
  imageUrl: string;
  scheduledDate: Date | undefined;
  scheduledHour: string;
  ideaId: string | null;
}

export default function CreatePage() {
  return (
    <Suspense fallback={<div className="p-8 text-[#888]">Loading...</div>}>
      <CreatePageContent />
    </Suspense>
  );
}

function CreatePageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [post, setPost] = useState<PostState>({
    topic: "",
    postType: "Feed",
    platform: "Instagram",
    caption: "",
    hashtags: [],
    imageUrl: "",
    scheduledDate: undefined,
    scheduledHour: "9",
    ideaId: null,
  });
  const [savedIdeas, setSavedIdeas] = useState<
    { id: string; title: string; captionAngle: string }[]
  >([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);

  // Load idea from query param
  useEffect(() => {
    const ideaId = searchParams.get("idea");
    if (ideaId) {
      setPost((prev) => ({ ...prev, ideaId: ideaId }));
    }

    // Load saved ideas for dropdown
    async function loadIdeas() {
      try {
        const res = await fetch("/api/ideas");
        if (res.ok) {
          const data = await res.json();
          setSavedIdeas(data.ideas || data || []);
        }
      } catch {
        // Silent fail
      }
    }
    loadIdeas();
  }, [searchParams]);

  // If ideaId is set, load the idea details
  useEffect(() => {
    if (post.ideaId && savedIdeas.length > 0) {
      const idea = savedIdeas.find((i) => i.id === post.ideaId);
      if (idea) {
        setPost((prev) => ({
          ...prev,
          topic: idea.captionAngle || idea.title,
        }));
      }
    }
  }, [post.ideaId, savedIdeas]);

  const HOURS = Array.from({ length: 24 }, (_, i) => {
    const period = i >= 12 ? "PM" : "AM";
    const hour = i % 12 || 12;
    return { value: String(i), label: `${hour}:00 ${period}` };
  });

  async function handlePublishNow() {
    try {
      setSubmitting(true);
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...post,
          status: "PUBLISHED",
        }),
      });
      if (res.ok) {
        const data = await res.json();
        await fetch("/api/publish", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ postId: data.id || data.post?.id }),
        });
        setSubmitMessage("Post published successfully!");
        setTimeout(() => router.push("/"), 2000);
      }
    } catch {
      setSubmitMessage("Failed to publish. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSchedule() {
    if (!post.scheduledDate) return;
    try {
      setSubmitting(true);
      const scheduledAt = new Date(post.scheduledDate);
      scheduledAt.setHours(Number(post.scheduledHour), 0, 0, 0);

      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...post,
          status: "SCHEDULED",
          scheduledAt: scheduledAt.toISOString(),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        await fetch("/api/schedule", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            postId: data.id || data.post?.id,
            scheduledAt: scheduledAt.toISOString(),
          }),
        });
        setSubmitMessage("Post scheduled successfully!");
        setTimeout(() => router.push("/calendar"), 2000);
      }
    } catch {
      setSubmitMessage("Failed to schedule. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSaveDraft() {
    try {
      setSubmitting(true);
      await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...post,
          status: "DRAFT",
        }),
      });
      setSubmitMessage("Draft saved!");
      setTimeout(() => router.push("/"), 2000);
    } catch {
      setSubmitMessage("Failed to save draft.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col">
      <Header title="Create Post" />

      <div className="flex flex-col gap-6 p-6">
        {/* Swarm Banner */}
        <Link
          href="/swarm"
          className="flex items-center justify-between rounded-xl border border-[#f0b429]/30 bg-[#f0b429]/5 p-4 transition-colors hover:bg-[#f0b429]/10"
        >
          <div className="flex items-center gap-3">
            <span className="text-[#f0b429] text-lg">&#9889;</span>
            <div>
              <p className="text-white font-medium text-sm">Want better results? Try the Swarm Engine</p>
              <p className="text-[#888] text-xs">6 specialized AI agents vs 1 prompt</p>
            </div>
          </div>
          <span className="rounded-full bg-[#f0b429] px-3 py-1 text-xs font-bold text-black">
            Launch Swarm
          </span>
        </Link>

        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-2">
          {STEPS.map((s, index) => {
            const Icon = s.icon;
            const isActive = index === step;
            const isCompleted = index < step;
            return (
              <div key={s.label} className="flex items-center">
                <button
                  onClick={() => setStep(index)}
                  className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                    isActive
                      ? "bg-[#f0b429] text-black"
                      : isCompleted
                        ? "bg-[#f0b429]/20 text-[#f0b429]"
                        : "bg-[#1f1f1f] text-[#888888]"
                  }`}
                >
                  {isCompleted ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Icon className="h-4 w-4" />
                  )}
                  {s.label}
                </button>
                {index < STEPS.length - 1 && (
                  <div
                    className={`mx-2 h-px w-8 ${
                      index < step ? "bg-[#f0b429]" : "bg-[#1f1f1f]"
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Step 1: Topic */}
        {step === 0 && (
          <div className="flex flex-col gap-6">
            <DarkCard>
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <Label className="text-[#888888]">Topic / Main Idea</Label>
                  <Textarea
                    value={post.topic}
                    onChange={(e) =>
                      setPost((prev) => ({ ...prev, topic: e.target.value }))
                    }
                    className="min-h-[120px] border-[#1f1f1f] bg-[#1a1a1a] text-white"
                    placeholder="What do you want to post about? Describe your topic, angle, or idea..."
                  />
                </div>

                {savedIdeas.length > 0 && (
                  <div className="flex flex-col gap-2">
                    <Label className="text-[#888888]">
                      Or pick from saved ideas
                    </Label>
                    <Select
                      value={post.ideaId || ""}
                      onValueChange={(value) => {
                        const idea = savedIdeas.find((i) => i.id === value);
                        if (idea) {
                          setPost((prev) => ({
                            ...prev,
                            ideaId: value,
                            topic: idea.captionAngle || idea.title,
                          }));
                        }
                      }}
                    >
                      <SelectTrigger className="border-[#1f1f1f] bg-[#1a1a1a] text-white">
                        <SelectValue placeholder="Choose a saved idea..." />
                      </SelectTrigger>
                      <SelectContent className="border-[#1f1f1f] bg-[#111111]">
                        {savedIdeas.map((idea) => (
                          <SelectItem
                            key={idea.id}
                            value={idea.id}
                            className="text-white"
                          >
                            {idea.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="flex flex-col gap-2">
                    <Label className="text-[#888888]">Post Type</Label>
                    <div className="flex gap-2">
                      {POST_TYPES.map((type) => (
                        <button
                          key={type}
                          onClick={() =>
                            setPost((prev) => ({ ...prev, postType: type }))
                          }
                          className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                            post.postType === type
                              ? "bg-[#f0b429] text-black"
                              : "border border-[#1f1f1f] bg-[#1a1a1a] text-[#888888] hover:text-white"
                          }`}
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <Label className="text-[#888888]">Platform</Label>
                    <div className="flex gap-2">
                      {PLATFORMS.map((platform) => (
                        <button
                          key={platform}
                          onClick={() =>
                            setPost((prev) => ({ ...prev, platform }))
                          }
                          className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                            post.platform === platform
                              ? "bg-[#f0b429] text-black"
                              : "border border-[#1f1f1f] bg-[#1a1a1a] text-[#888888] hover:text-white"
                          }`}
                        >
                          {platform}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </DarkCard>
          </div>
        )}

        {/* Step 2: Caption */}
        {step === 1 && (
          <div className="flex flex-col gap-6">
            <CaptionGenerator
              onCaptionSelect={(caption: string) =>
                setPost((prev) => ({ ...prev, caption }))
              }
            />
            <HashtagPanel
              hashtags={{ mega: [], mid: [], niche: [], micro: [] }}
              onSelect={(hashtags: string[]) =>
                setPost((prev) => ({ ...prev, hashtags }))
              }
            />
          </div>
        )}

        {/* Step 3: Image */}
        {step === 2 && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <ImageGenerator
              onImageGenerated={(imageUrl: string) =>
                setPost((prev) => ({ ...prev, imageUrl }))
              }
            />
            <PostPreview
              caption={post.caption}
              imageUrl={post.imageUrl}
              hashtags={post.hashtags}
            />
          </div>
        )}

        {/* Step 4: Schedule */}
        {step === 3 && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="flex flex-col gap-6">
              <PostPreview
                caption={post.caption}
                imageUrl={post.imageUrl}
                hashtags={post.hashtags}
              />
            </div>
            <div className="flex flex-col gap-4">
              <DarkCard>
                <h3 className="mb-4 text-lg font-semibold text-white">
                  <Palette className="mr-2 inline h-5 w-5 text-[#f0b429]" />
                  Publish Options
                </h3>

                <div className="flex flex-col gap-4">
                  <GoldButton
                    onClick={handlePublishNow}
                    disabled={submitting}
                    className="w-full"
                  >
                    {submitting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                    Publish Now
                  </GoldButton>

                  <div className="flex flex-col gap-3 rounded-lg border border-[#1f1f1f] p-4">
                    <h4 className="text-sm font-medium text-white">
                      Schedule Post
                    </h4>
                    <Calendar
                      mode="single"
                      selected={post.scheduledDate}
                      onSelect={(date) =>
                        setPost((prev) => ({
                          ...prev,
                          scheduledDate: date,
                        }))
                      }
                      className="rounded-md border border-[#1f1f1f]"
                    />
                    <Select
                      value={post.scheduledHour}
                      onValueChange={(value) =>
                        setPost((prev) => ({
                          ...prev,
                          scheduledHour: value ?? "",
                        }))
                      }
                    >
                      <SelectTrigger className="border-[#1f1f1f] bg-[#1a1a1a] text-white">
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
                      onClick={handleSchedule}
                      disabled={submitting || !post.scheduledDate}
                      className="w-full"
                    >
                      <Clock className="h-4 w-4" />
                      Schedule Post
                    </GoldButton>
                  </div>

                  <GoldButton
                    variant="secondary"
                    onClick={handleSaveDraft}
                    disabled={submitting}
                    className="w-full"
                  >
                    <Save className="h-4 w-4" />
                    Save as Draft
                  </GoldButton>
                </div>

                {submitMessage && (
                  <p
                    className={`mt-4 text-center text-sm ${submitMessage.includes("success") || submitMessage.includes("saved") ? "text-[#22c55e]" : "text-[#ef4444]"}`}
                  >
                    {submitMessage}
                  </p>
                )}
              </DarkCard>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <GoldButton
            variant="secondary"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
          >
            <ChevronLeft className="h-4 w-4" />
            Back
          </GoldButton>
          {step < STEPS.length - 1 && (
            <GoldButton
              onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </GoldButton>
          )}
        </div>
      </div>
    </div>
  );
}

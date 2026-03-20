"use client";

import { useEffect, useState, useCallback } from "react";
import { Header } from "@/components/layout/Header";
import { GoldButton } from "@/components/ui/GoldButton";
import { DarkCard } from "@/components/ui/DarkCard";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Image,
  Film,
  Music,
  Instagram,
  Download,
  Trash2,
  ExternalLink,
  Loader2,
  Filter,
  Copy,
  Hash,
} from "lucide-react";

interface MediaItem {
  id: string;
  type: string;
  url: string;
  thumbnailUrl: string | null;
  topic: string;
  caption: string | null;
  hashtags: string | null;
  instagramPostId: string | null;
  instagramUrl: string | null;
  postType: string;
  fileSize: number | null;
  duration: number | null;
  width: number | null;
  height: number | null;
  status: string;
  createdAt: string;
}

type FilterTab =
  | "all"
  | "images"
  | "videos"
  | "reels"
  | "audio"
  | "posted"
  | "unposted";

function getTypeIcon(type: string) {
  switch (type) {
    case "IMAGE":
      return <Image className="h-5 w-5" />;
    case "VIDEO":
      return <Film className="h-5 w-5" />;
    case "REEL":
      return <Film className="h-5 w-5" />;
    case "AUDIO":
      return <Music className="h-5 w-5" />;
    default:
      return <Image className="h-5 w-5" />;
  }
}

function getTypeBadgeColor(type: string) {
  switch (type) {
    case "IMAGE":
      return "bg-blue-500/15 text-blue-400";
    case "VIDEO":
      return "bg-purple-500/15 text-purple-400";
    case "REEL":
      return "bg-pink-500/15 text-pink-400";
    case "AUDIO":
      return "bg-green-500/15 text-green-400";
    default:
      return "bg-[#1f1f1f] text-[#888888]";
  }
}

function getStatusBadgeColor(status: string) {
  switch (status) {
    case "POSTED":
      return "bg-green-500/15 text-green-400";
    case "FAILED":
      return "bg-red-500/15 text-red-400";
    case "SAVED":
    default:
      return "bg-[#1f1f1f] text-[#888888]";
  }
}

function formatDate(dateStr: string) {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function parseHashtags(hashtags: string | null): string[] {
  if (!hashtags) return [];
  try {
    const parsed = JSON.parse(hashtags);
    if (Array.isArray(parsed)) return parsed;
  } catch {
    // Not JSON, try splitting by spaces/commas
  }
  return hashtags
    .split(/[\s,]+/)
    .filter((t) => t.length > 0)
    .map((t) => t.replace(/^#/, ""));
}

export default function MediaLibraryPage() {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<FilterTab>("all");
  const [selectedItem, setSelectedItem] = useState<MediaItem | null>(null);
  const [posting, setPosting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const loadMedia = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/media");
      if (res.ok) {
        const data = await res.json();
        setItems(data.items || []);
      }
    } catch {
      // Silent fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMedia();
  }, [loadMedia]);

  async function handlePost(mediaId: string) {
    try {
      setPosting(true);
      const res = await fetch("/api/media", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "post", mediaId }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.item && selectedItem?.id === mediaId) {
          setSelectedItem(data.item);
        }
        await loadMedia();
      }
    } catch {
      // Silent fail
    } finally {
      setPosting(false);
    }
  }

  async function handleDelete(mediaId: string) {
    try {
      setDeleting(true);
      const res = await fetch(`/api/media?mediaId=${mediaId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setSelectedItem(null);
        await loadMedia();
      }
    } catch {
      // Silent fail
    } finally {
      setDeleting(false);
    }
  }

  function handleCopyCaption(caption: string | null) {
    if (!caption) return;
    navigator.clipboard.writeText(caption);
  }

  // Client-side filtering
  const filteredItems = items.filter((item) => {
    switch (activeFilter) {
      case "images":
        return item.type === "IMAGE";
      case "videos":
        return item.type === "VIDEO";
      case "reels":
        return item.type === "REEL";
      case "audio":
        return item.type === "AUDIO";
      case "posted":
        return item.status === "POSTED";
      case "unposted":
        return item.status !== "POSTED";
      default:
        return true;
    }
  });

  // Stats
  const totalFiles = items.length;
  const postedCount = items.filter((i) => i.status === "POSTED").length;
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  const thisWeekCount = items.filter(
    (i) => new Date(i.createdAt) >= oneWeekAgo
  ).length;
  const imageCount = items.filter((i) => i.type === "IMAGE").length;
  const videoCount = items.filter(
    (i) => i.type === "VIDEO" || i.type === "REEL"
  ).length;
  const ratio =
    videoCount > 0
      ? `${imageCount}:${videoCount}`
      : imageCount > 0
        ? `${imageCount}:0`
        : "0:0";

  return (
    <div className="flex flex-col">
      <Header title="Media Library" />

      <div className="flex flex-col gap-6 p-6">
        {/* Header with icon + count */}
        <div className="flex items-center gap-3">
          <Image className="h-7 w-7 text-[#f0b429]" />
          <h2 className="text-2xl font-bold text-white">Media Library</h2>
          <span className="rounded-full bg-[#f0b429]/15 px-3 py-0.5 text-sm font-medium text-[#f0b429]">
            {totalFiles} files
          </span>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <DarkCard className="flex flex-col gap-1">
            <span className="text-xs uppercase tracking-wider text-[#888888]">
              Total Files
            </span>
            <span className="text-2xl font-bold text-white">{totalFiles}</span>
          </DarkCard>
          <DarkCard className="flex flex-col gap-1">
            <span className="text-xs uppercase tracking-wider text-[#888888]">
              Posted to Instagram
            </span>
            <span className="text-2xl font-bold text-green-400">
              {postedCount}
            </span>
          </DarkCard>
          <DarkCard className="flex flex-col gap-1">
            <span className="text-xs uppercase tracking-wider text-[#888888]">
              This Week
            </span>
            <span className="text-2xl font-bold text-[#f0b429]">
              {thisWeekCount}
            </span>
          </DarkCard>
          <DarkCard className="flex flex-col gap-1">
            <span className="text-xs uppercase tracking-wider text-[#888888]">
              Images vs Videos
            </span>
            <span className="text-2xl font-bold text-white">{ratio}</span>
          </DarkCard>
        </div>

        {/* Filter tabs */}
        <div className="flex items-center gap-3">
          <Filter className="h-4 w-4 text-[#888888]" />
          <Tabs
            value={activeFilter}
            onValueChange={(v) =>
              setActiveFilter((v ?? "all") as FilterTab)
            }
          >
            <TabsList className="bg-[#111111]">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="images">Images</TabsTrigger>
              <TabsTrigger value="videos">Videos</TabsTrigger>
              <TabsTrigger value="reels">Reels</TabsTrigger>
              <TabsTrigger value="audio">Audio</TabsTrigger>
              <TabsTrigger value="posted">Posted</TabsTrigger>
              <TabsTrigger value="unposted">Unposted</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Media grid */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-[#f0b429]" />
          </div>
        ) : filteredItems.length === 0 ? (
          <DarkCard className="py-12 text-center">
            <div className="flex flex-col items-center gap-3">
              <Image className="h-10 w-10 text-[#888888]" />
              <p className="text-[#888888]">
                No media found. Generate some content to populate your library!
              </p>
            </div>
          </DarkCard>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredItems.map((item) => (
              <DarkCard
                key={item.id}
                className="group cursor-pointer overflow-hidden p-0 transition-all hover:border-[#f0b429]/30"
                onClick={() => setSelectedItem(item)}
              >
                {/* Media preview */}
                <div className="relative aspect-square w-full overflow-hidden bg-[#0a0a0a]">
                  {item.type === "IMAGE" ? (
                    <img
                      src={item.url}
                      alt={item.topic || "Media"}
                      className="h-full w-full rounded-t-xl object-cover transition-transform group-hover:scale-105"
                    />
                  ) : item.type === "VIDEO" || item.type === "REEL" ? (
                    item.thumbnailUrl ? (
                      <img
                        src={item.thumbnailUrl}
                        alt={item.topic || "Video thumbnail"}
                        className="h-full w-full rounded-t-xl object-cover transition-transform group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <Film className="h-16 w-16 text-[#333333]" />
                      </div>
                    )
                  ) : (
                    <div className="flex h-full w-full flex-col items-center justify-center gap-3">
                      <Music className="h-16 w-16 text-[#333333]" />
                      <div className="flex items-center gap-1">
                        {[...Array(12)].map((_, i) => (
                          <div
                            key={i}
                            className="w-1 rounded-full bg-[#333333]"
                            style={{
                              height: `${Math.random() * 24 + 8}px`,
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Type badge top-left */}
                  <span
                    className={`absolute left-3 top-3 rounded-full px-2 py-0.5 text-xs font-medium ${getTypeBadgeColor(item.type)}`}
                  >
                    {item.type}
                  </span>

                  {/* Status badge top-right */}
                  <span
                    className={`absolute right-3 top-3 rounded-full px-2 py-0.5 text-xs font-medium ${getStatusBadgeColor(item.status)}`}
                  >
                    {item.status}
                  </span>
                </div>

                {/* Card footer */}
                <div className="flex flex-col gap-2 p-4">
                  <p className="truncate text-sm font-medium text-white">
                    {item.topic || "Untitled"}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[#888888]">
                      {formatDate(item.createdAt)}
                    </span>
                    <div className="flex items-center gap-2">
                      {item.status === "POSTED" && item.instagramUrl && (
                        <a
                          href={item.instagramUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#888888] transition-colors hover:text-[#f0b429]"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Instagram className="h-4 w-4" />
                        </a>
                      )}
                      <GoldButton
                        variant="secondary"
                        className="h-7 px-3 text-xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedItem(item);
                        }}
                      >
                        <ExternalLink className="h-3 w-3" />
                        View
                      </GoldButton>
                    </div>
                  </div>
                </div>
              </DarkCard>
            ))}
          </div>
        )}
      </div>

      {/* Detail modal */}
      <Dialog
        open={selectedItem !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedItem(null);
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto border-[#1f1f1f] bg-[#111111] text-white sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="text-white">
              {selectedItem?.topic || "Media Details"}
            </DialogTitle>
          </DialogHeader>

          {selectedItem && (
            <div className="flex flex-col gap-4">
              {/* Full size media */}
              <div className="overflow-hidden rounded-lg bg-[#0a0a0a]">
                {selectedItem.type === "IMAGE" ? (
                  <img
                    src={selectedItem.url}
                    alt={selectedItem.topic || "Media"}
                    className="w-full rounded-lg object-contain"
                  />
                ) : selectedItem.type === "VIDEO" ||
                  selectedItem.type === "REEL" ? (
                  <video
                    src={selectedItem.url}
                    controls
                    className="w-full rounded-lg"
                    poster={selectedItem.thumbnailUrl || undefined}
                  />
                ) : (
                  <div className="flex flex-col items-center gap-4 py-8">
                    <Music className="h-12 w-12 text-[#f0b429]" />
                    <audio
                      src={selectedItem.url}
                      controls
                      className="w-full max-w-xs"
                    />
                  </div>
                )}
              </div>

              {/* Badges */}
              <div className="flex items-center gap-2">
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${getTypeBadgeColor(selectedItem.type)}`}
                >
                  {selectedItem.type}
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${getStatusBadgeColor(selectedItem.status)}`}
                >
                  {selectedItem.status}
                </span>
                <span className="rounded-full bg-[#1f1f1f] px-2 py-0.5 text-xs text-[#888888]">
                  {selectedItem.postType}
                </span>
              </div>

              {/* Caption */}
              {selectedItem.caption && (
                <div className="flex flex-col gap-1">
                  <span className="text-xs uppercase tracking-wider text-[#888888]">
                    Caption
                  </span>
                  <p className="whitespace-pre-wrap text-sm text-white">
                    {selectedItem.caption}
                  </p>
                </div>
              )}

              {/* Hashtags as pills */}
              {selectedItem.hashtags && (
                <div className="flex flex-col gap-2">
                  <span className="text-xs uppercase tracking-wider text-[#888888]">
                    Hashtags
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {parseHashtags(selectedItem.hashtags).map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center rounded-full bg-[#1a1a1a] px-2.5 py-1 text-xs text-[#888888]"
                      >
                        <Hash className="mr-0.5 h-3 w-3" />
                        {tag.replace(/^#/, "")}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Instagram link */}
              {selectedItem.status === "POSTED" &&
                selectedItem.instagramUrl && (
                  <a
                    href={selectedItem.instagramUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm text-[#f0b429] transition-colors hover:text-[#f0b429]/80"
                  >
                    <Instagram className="h-4 w-4" />
                    View on Instagram
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}

              {/* Meta info */}
              <div className="flex flex-wrap gap-4 text-xs text-[#888888]">
                <span>Created {formatDate(selectedItem.createdAt)}</span>
                {selectedItem.fileSize && (
                  <span>
                    {(selectedItem.fileSize / 1024 / 1024).toFixed(1)} MB
                  </span>
                )}
                {selectedItem.width && selectedItem.height && (
                  <span>
                    {selectedItem.width} x {selectedItem.height}
                  </span>
                )}
                {selectedItem.duration && (
                  <span>{selectedItem.duration}s</span>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex flex-wrap gap-3 border-t border-[#1f1f1f] pt-4">
                {selectedItem.status !== "POSTED" && (
                  <GoldButton
                    onClick={() => handlePost(selectedItem.id)}
                    disabled={posting}
                  >
                    {posting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Instagram className="h-4 w-4" />
                    )}
                    Post to Instagram
                  </GoldButton>
                )}
                <GoldButton
                  variant="secondary"
                  onClick={() => window.open(selectedItem.url, "_blank")}
                >
                  <Download className="h-4 w-4" />
                  Download
                </GoldButton>
                <GoldButton
                  variant="secondary"
                  onClick={() => handleCopyCaption(selectedItem.caption)}
                  disabled={!selectedItem.caption}
                >
                  <Copy className="h-4 w-4" />
                  Copy Caption
                </GoldButton>
                <GoldButton
                  variant="danger"
                  onClick={() => handleDelete(selectedItem.id)}
                  disabled={deleting}
                >
                  {deleting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                  Delete
                </GoldButton>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

import * as React from "react";
import { Image, Film, Layers, Circle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PostStatus } from "@/components/ui/StatusBadge";

type PostType = "FEED" | "REEL" | "CAROUSEL" | "STORY";

interface SlotPost {
  id: string;
  topic: string;
  type: PostType;
  status: PostStatus;
}

interface PostSlotProps {
  post: SlotPost;
  className?: string;
}

const statusColors: Record<PostStatus, string> = {
  DRAFT: "#888888",
  SCHEDULED: "#f0b429",
  PUBLISHED: "#22c55e",
  FAILED: "#ef4444",
};

const typeIcons: Record<PostType, React.ElementType> = {
  FEED: Image,
  REEL: Film,
  CAROUSEL: Layers,
  STORY: Circle,
};

function PostSlot({ post, className }: PostSlotProps) {
  const Icon = typeIcons[post.type];
  const dotColor = statusColors[post.status];

  return (
    <div
      className={cn(
        "flex items-center gap-1 rounded-md px-1.5 py-0.5 transition-colors hover:bg-[#222]",
        className
      )}
    >
      <span
        className="h-1.5 w-1.5 shrink-0 rounded-full"
        style={{ backgroundColor: dotColor }}
      />
      <Icon className="h-3 w-3 shrink-0 text-[#888888]" />
      <span className="truncate text-[10px] text-[#ccc]">{post.topic}</span>
    </div>
  );
}

export { PostSlot };
export type { PostSlotProps, SlotPost };

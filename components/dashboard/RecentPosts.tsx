"use client";

import * as React from "react";
import { DarkCard } from "@/components/ui/DarkCard";
import { StatusBadge, type PostStatus } from "@/components/ui/StatusBadge";
import { GoldButton } from "@/components/ui/GoldButton";
import { Pencil, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

type PostType = "FEED" | "REEL" | "CAROUSEL" | "STORY";

interface RecentPost {
  id: string;
  caption: string;
  type: PostType;
  status: PostStatus;
  scheduledAt?: string | null;
}

interface RecentPostsProps {
  posts: RecentPost[];
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  className?: string;
}

const typeColors: Record<PostType, string> = {
  FEED: "bg-blue-500/15 text-blue-400",
  REEL: "bg-purple-500/15 text-purple-400",
  CAROUSEL: "bg-amber-500/15 text-amber-400",
  STORY: "bg-pink-500/15 text-pink-400",
};

function RecentPosts({ posts, onEdit, onDelete, className }: RecentPostsProps) {
  return (
    <DarkCard className={cn("overflow-hidden p-0", className)}>
      <div className="border-b border-[#1f1f1f] px-6 py-4">
        <h2 className="text-lg font-semibold text-white">Recent Posts</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#1f1f1f] text-left text-xs text-[#888888]">
              <th className="px-6 py-3 font-medium">Caption</th>
              <th className="px-6 py-3 font-medium">Type</th>
              <th className="px-6 py-3 font-medium">Status</th>
              <th className="px-6 py-3 font-medium">Scheduled</th>
              <th className="px-6 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {posts.map((post) => (
              <tr
                key={post.id}
                className="border-b border-[#1f1f1f] bg-[#111111] transition-colors hover:bg-[#1a1a1a]"
              >
                <td className="max-w-xs px-6 py-3">
                  <span className="block truncate text-sm text-white">
                    {post.caption.length > 60
                      ? `${post.caption.slice(0, 60)}...`
                      : post.caption}
                  </span>
                </td>
                <td className="px-6 py-3">
                  <span
                    className={cn(
                      "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
                      typeColors[post.type]
                    )}
                  >
                    {post.type}
                  </span>
                </td>
                <td className="px-6 py-3">
                  <StatusBadge status={post.status} />
                </td>
                <td className="px-6 py-3 text-sm text-[#888888]">
                  {post.scheduledAt
                    ? new Date(post.scheduledAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })
                    : "—"}
                </td>
                <td className="px-6 py-3">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onEdit?.(post.id)}
                      className="rounded-md p-1.5 text-[#888888] transition-colors hover:bg-[#1f1f1f] hover:text-white"
                      aria-label="Edit post"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => onDelete?.(post.id)}
                      className="rounded-md p-1.5 text-[#888888] transition-colors hover:bg-[#ef4444]/10 hover:text-[#ef4444]"
                      aria-label="Delete post"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {posts.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="px-6 py-8 text-center text-sm text-[#888888]"
                >
                  No posts yet. Create your first post to get started.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </DarkCard>
  );
}

export { RecentPosts };
export type { RecentPostsProps, RecentPost, PostType };

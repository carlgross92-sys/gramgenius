"use client";

import * as React from "react";
import { DarkCard } from "@/components/ui/DarkCard";
import { cn } from "@/lib/utils";

type PostType = "FEED" | "REEL" | "CAROUSEL" | "STORY";

interface PostWithAnalytics {
  id: string;
  caption: string;
  type: PostType;
  likes: number;
  comments: number;
  saves: number;
  reach: number;
  engagementRate: number;
}

interface TopPostsTableProps {
  posts: PostWithAnalytics[];
  className?: string;
}

const typeColors: Record<PostType, string> = {
  FEED: "bg-blue-500/15 text-blue-400",
  REEL: "bg-purple-500/15 text-purple-400",
  CAROUSEL: "bg-amber-500/15 text-amber-400",
  STORY: "bg-pink-500/15 text-pink-400",
};

function TopPostsTable({ posts, className }: TopPostsTableProps) {
  const sorted = React.useMemo(
    () => [...posts].sort((a, b) => b.engagementRate - a.engagementRate),
    [posts]
  );

  return (
    <DarkCard className={cn("overflow-hidden p-0", className)}>
      <div className="border-b border-[#1f1f1f] px-6 py-4">
        <h2 className="text-lg font-semibold text-white">Top Posts</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#1f1f1f] text-left text-xs text-[#888888]">
              <th className="px-6 py-3 font-medium">Rank</th>
              <th className="px-6 py-3 font-medium">Caption</th>
              <th className="px-6 py-3 font-medium">Type</th>
              <th className="px-6 py-3 text-right font-medium">Likes</th>
              <th className="px-6 py-3 text-right font-medium">Comments</th>
              <th className="px-6 py-3 text-right font-medium">Saves</th>
              <th className="px-6 py-3 text-right font-medium">Reach</th>
              <th className="px-6 py-3 text-right font-medium">Eng. Rate</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((post, index) => (
              <tr
                key={post.id}
                className="border-b border-[#1f1f1f] bg-[#111111] transition-colors hover:bg-[#1a1a1a]"
              >
                <td className="px-6 py-3">
                  <span
                    className={cn(
                      "flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold",
                      index === 0
                        ? "bg-[#f0b429] text-black"
                        : index === 1
                        ? "bg-[#c0c0c0] text-black"
                        : index === 2
                        ? "bg-[#cd7f32] text-black"
                        : "bg-[#1f1f1f] text-[#888888]"
                    )}
                  >
                    {index + 1}
                  </span>
                </td>
                <td className="max-w-[200px] px-6 py-3">
                  <span className="block truncate text-sm text-white">
                    {post.caption.length > 50
                      ? `${post.caption.slice(0, 50)}...`
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
                <td className="px-6 py-3 text-right text-sm text-white">
                  {post.likes.toLocaleString()}
                </td>
                <td className="px-6 py-3 text-right text-sm text-white">
                  {post.comments.toLocaleString()}
                </td>
                <td className="px-6 py-3 text-right text-sm text-white">
                  {post.saves.toLocaleString()}
                </td>
                <td className="px-6 py-3 text-right text-sm text-white">
                  {post.reach.toLocaleString()}
                </td>
                <td className="px-6 py-3 text-right">
                  <span className="text-sm font-medium text-[#f0b429]">
                    {post.engagementRate.toFixed(2)}%
                  </span>
                </td>
              </tr>
            ))}
            {sorted.length === 0 && (
              <tr>
                <td
                  colSpan={8}
                  className="px-6 py-8 text-center text-sm text-[#888888]"
                >
                  No post analytics data available yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </DarkCard>
  );
}

export { TopPostsTable };
export type { TopPostsTableProps, PostWithAnalytics };

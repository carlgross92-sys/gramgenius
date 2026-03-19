"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import type { PostStatus } from "@/components/ui/StatusBadge";

type PostType = "FEED" | "REEL" | "CAROUSEL" | "STORY";

interface ScheduledPost {
  id: string;
  type: PostType;
  status: PostStatus;
  scheduledAt: string;
}

interface UpcomingScheduleProps {
  posts: ScheduledPost[];
  className?: string;
}

const statusDotColors: Record<PostStatus, string> = {
  DRAFT: "bg-[#888888]",
  SCHEDULED: "bg-[#f0b429]",
  PUBLISHED: "bg-[#22c55e]",
  FAILED: "bg-[#ef4444]",
};

function getNext7Days(): Date[] {
  const days: Date[] = [];
  const today = new Date();
  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    days.push(d);
  }
  return days;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function UpcomingSchedule({ posts, className }: UpcomingScheduleProps) {
  const days = getNext7Days();
  const today = new Date();

  return (
    <div className={cn("rounded-xl border border-[#1f1f1f] bg-[#111111] p-6", className)}>
      <h2 className="mb-4 text-lg font-semibold text-white">Upcoming Schedule</h2>
      <div className="grid grid-cols-7 gap-2">
        {days.map((day) => {
          const isToday = isSameDay(day, today);
          const dayPosts = posts.filter((p) =>
            isSameDay(new Date(p.scheduledAt), day)
          );

          return (
            <div
              key={day.toISOString()}
              className={cn(
                "flex flex-col items-center gap-2 rounded-lg border p-3 transition-colors",
                isToday
                  ? "border-[#f0b429]/40 bg-[#f0b429]/5"
                  : "border-[#1f1f1f] bg-[#0f0f0f]"
              )}
            >
              <span
                className={cn(
                  "text-xs font-medium",
                  isToday ? "text-[#f0b429]" : "text-[#888888]"
                )}
              >
                {day.toLocaleDateString("en-US", { weekday: "short" })}
              </span>
              <span
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold",
                  isToday
                    ? "bg-[#f0b429] text-black"
                    : "text-white"
                )}
              >
                {day.getDate()}
              </span>
              <div className="flex flex-wrap justify-center gap-1">
                {dayPosts.map((post) => (
                  <span
                    key={post.id}
                    className={cn(
                      "h-2 w-2 rounded-full",
                      statusDotColors[post.status]
                    )}
                    title={`${post.type} - ${post.status}`}
                  />
                ))}
                {dayPosts.length === 0 && (
                  <span className="h-2 w-2 rounded-full bg-transparent" />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export { UpcomingSchedule };
export type { UpcomingScheduleProps, ScheduledPost };

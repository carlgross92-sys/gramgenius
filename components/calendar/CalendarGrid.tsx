"use client";

import * as React from "react";
import {
  ChevronLeft,
  ChevronRight,
  Image,
  Film,
  Layers,
  Circle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { PostStatus } from "@/components/ui/StatusBadge";
import { PostSlot } from "@/components/calendar/PostSlot";

type PostType = "FEED" | "REEL" | "CAROUSEL" | "STORY";

interface CalendarPost {
  id: string;
  topic: string;
  type: PostType;
  status: PostStatus;
  scheduledAt: string;
}

interface CalendarGridProps {
  posts: CalendarPost[];
  currentMonth: Date;
  onDayClick?: (date: Date) => void;
  onMonthChange?: (date: Date) => void;
  className?: string;
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function CalendarGrid({
  posts,
  currentMonth,
  onDayClick,
  onMonthChange,
  className,
}: CalendarGridProps) {
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const today = new Date();

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const handlePrevMonth = () => {
    const prev = new Date(year, month - 1, 1);
    onMonthChange?.(prev);
  };

  const handleNextMonth = () => {
    const next = new Date(year, month + 1, 1);
    onMonthChange?.(next);
  };

  // Build calendar cells
  const cells: Array<{ day: number | null; date: Date | null }> = [];

  // Empty leading cells
  for (let i = 0; i < firstDay; i++) {
    cells.push({ day: null, date: null });
  }

  // Day cells
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, date: new Date(year, month, d) });
  }

  // Pad to complete last week
  while (cells.length % 7 !== 0) {
    cells.push({ day: null, date: null });
  }

  return (
    <div
      className={cn(
        "rounded-xl border border-[#1f1f1f] bg-[#111111] p-6",
        className
      )}
    >
      {/* Month header */}
      <div className="mb-4 flex items-center justify-between">
        <button
          onClick={handlePrevMonth}
          className="rounded-lg p-2 text-[#888888] transition-colors hover:bg-[#1f1f1f] hover:text-white"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h2 className="text-lg font-semibold text-white">
          {currentMonth.toLocaleDateString("en-US", {
            month: "long",
            year: "numeric",
          })}
        </h2>
        <button
          onClick={handleNextMonth}
          className="rounded-lg p-2 text-[#888888] transition-colors hover:bg-[#1f1f1f] hover:text-white"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {/* Day names header */}
      <div className="mb-2 grid grid-cols-7 gap-1">
        {dayNames.map((name) => (
          <div
            key={name}
            className="py-2 text-center text-xs font-medium text-[#888888]"
          >
            {name}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {cells.map((cell, i) => {
          if (!cell.date || cell.day === null) {
            return <div key={`empty-${i}`} className="min-h-[80px]" />;
          }

          const isToday = isSameDay(cell.date, today);
          const dayPosts = posts.filter(
            (p) => cell.date && isSameDay(new Date(p.scheduledAt), cell.date)
          );

          return (
            <div
              key={`day-${cell.day}`}
              onClick={() => cell.date && onDayClick?.(cell.date)}
              className={cn(
                "min-h-[80px] cursor-pointer rounded-lg border p-2 transition-colors hover:bg-[#1a1a1a]",
                isToday
                  ? "border-[#f0b429]/40 bg-[#f0b429]/5"
                  : "border-[#1f1f1f] bg-[#0a0a0a]"
              )}
            >
              <span
                className={cn(
                  "mb-1 block text-xs font-medium",
                  isToday ? "text-[#f0b429]" : "text-[#888888]"
                )}
              >
                {cell.day}
              </span>
              <div className="flex flex-col gap-0.5">
                {dayPosts.slice(0, 3).map((post) => (
                  <PostSlot key={post.id} post={post} />
                ))}
                {dayPosts.length > 3 && (
                  <span className="text-[10px] text-[#888888]">
                    +{dayPosts.length - 3} more
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export { CalendarGrid };
export type { CalendarGridProps, CalendarPost };

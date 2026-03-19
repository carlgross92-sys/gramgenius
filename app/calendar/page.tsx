"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { GoldButton } from "@/components/ui/GoldButton";
import { DarkCard } from "@/components/ui/DarkCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { CalendarGrid } from "@/components/calendar/CalendarGrid";
import { ScheduleModal } from "@/components/calendar/ScheduleModal";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Loader2,
  ChevronLeft,
  ChevronRight,
  Plus,
  Calendar as CalendarIcon,
  List,
  LayoutGrid,
} from "lucide-react";

interface Post {
  id: string;
  topic: string;
  caption: string;
  status: "DRAFT" | "SCHEDULED" | "PUBLISHED" | "FAILED";
  postType: string;
  scheduledAt: string | null;
  publishedAt: string | null;
  createdAt: string;
}

type ViewMode = "month" | "week" | "list";

export default function CalendarPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const loadPosts = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/posts");
      if (res.ok) {
        const data = await res.json();
        setPosts(data.posts || data.data || data || []);
      }
    } catch {
      // Silent fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  function navigateMonth(direction: number) {
    setCurrentDate((prev) => {
      const d = new Date(prev);
      d.setMonth(d.getMonth() + direction);
      return d;
    });
  }

  function navigateWeek(direction: number) {
    setCurrentDate((prev) => {
      const d = new Date(prev);
      d.setDate(d.getDate() + direction * 7);
      return d;
    });
  }

  function getPostsForDate(date: Date): Post[] {
    return posts.filter((post) => {
      const postDate = post.scheduledAt
        ? new Date(post.scheduledAt)
        : post.publishedAt
          ? new Date(post.publishedAt)
          : new Date(post.createdAt);
      return (
        postDate.getFullYear() === date.getFullYear() &&
        postDate.getMonth() === date.getMonth() &&
        postDate.getDate() === date.getDate()
      );
    });
  }

  function getWeekDates(): Date[] {
    const start = new Date(currentDate);
    const day = start.getDay();
    start.setDate(start.getDate() - day);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      return d;
    });
  }

  function openPostModal(post: Post) {
    setSelectedPost(post);
    setModalOpen(true);
  }

  const statusColor: Record<string, string> = {
    DRAFT: "bg-[#888888]/20 border-[#888888]/40 text-[#888888]",
    SCHEDULED: "bg-[#f0b429]/20 border-[#f0b429]/40 text-[#f0b429]",
    PUBLISHED: "bg-[#22c55e]/20 border-[#22c55e]/40 text-[#22c55e]",
    FAILED: "bg-[#ef4444]/20 border-[#ef4444]/40 text-[#ef4444]",
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#f0b429]" />
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <Header title="Content Calendar" />

      <div className="flex flex-col gap-6 p-6">
        {/* Controls */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <GoldButton
              variant="secondary"
              onClick={() =>
                viewMode === "month"
                  ? navigateMonth(-1)
                  : navigateWeek(-1)
              }
            >
              <ChevronLeft className="h-4 w-4" />
            </GoldButton>
            <h2 className="min-w-[200px] text-center text-xl font-bold text-white">
              {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </h2>
            <GoldButton
              variant="secondary"
              onClick={() =>
                viewMode === "month"
                  ? navigateMonth(1)
                  : navigateWeek(1)
              }
            >
              <ChevronRight className="h-4 w-4" />
            </GoldButton>
          </div>

          <Tabs
            value={viewMode}
            onValueChange={(v) => setViewMode(v as ViewMode)}
          >
            <TabsList className="bg-[#111111]">
              <TabsTrigger value="month">
                <LayoutGrid className="mr-1 h-3 w-3" />
                Month
              </TabsTrigger>
              <TabsTrigger value="week">
                <CalendarIcon className="mr-1 h-3 w-3" />
                Week
              </TabsTrigger>
              <TabsTrigger value="list">
                <List className="mr-1 h-3 w-3" />
                List
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Month View */}
        {viewMode === "month" && (
          <CalendarGrid
            currentMonth={currentDate}
            posts={posts.map(p => ({
              id: p.id,
              topic: p.topic,
              type: p.postType as "FEED" | "REEL" | "CAROUSEL" | "STORY",
              status: p.status,
              scheduledAt: p.scheduledAt || p.createdAt,
            }))}
            onMonthChange={setCurrentDate}
            onDayClick={() => {}}
          />
        )}

        {/* Week View */}
        {viewMode === "week" && (
          <div className="grid grid-cols-7 gap-2">
            {getWeekDates().map((date) => {
              const dayPosts = getPostsForDate(date);
              const isToday =
                date.toDateString() === new Date().toDateString();
              return (
                <DarkCard
                  key={date.toISOString()}
                  className={`min-h-[200px] ${isToday ? "border-[#f0b429]/30" : ""}`}
                >
                  <div className="mb-2 flex items-center justify-between">
                    <span
                      className={`text-sm font-medium ${isToday ? "text-[#f0b429]" : "text-[#888888]"}`}
                    >
                      {date.toLocaleDateString("en-US", {
                        weekday: "short",
                        day: "numeric",
                      })}
                    </span>
                    <Link
                      href="/create"
                      className="rounded-full p-1 text-[#555555] hover:bg-[#1f1f1f] hover:text-[#f0b429]"
                    >
                      <Plus className="h-3 w-3" />
                    </Link>
                  </div>
                  <div className="flex flex-col gap-1">
                    {dayPosts.map((post) => (
                      <button
                        key={post.id}
                        onClick={() => openPostModal(post)}
                        className={`truncate rounded px-2 py-1 text-left text-xs font-medium transition-all hover:opacity-80 ${statusColor[post.status]}`}
                      >
                        {post.topic || post.caption?.slice(0, 30) || "Untitled"}
                      </button>
                    ))}
                  </div>
                </DarkCard>
              );
            })}
          </div>
        )}

        {/* List View */}
        {viewMode === "list" && (
          <DarkCard>
            {posts.length === 0 ? (
              <p className="py-8 text-center text-[#888888]">
                No posts yet. Create your first post!
              </p>
            ) : (
              <div className="flex flex-col divide-y divide-[#1f1f1f]">
                {posts
                  .sort(
                    (a, b) =>
                      new Date(
                        b.scheduledAt || b.createdAt
                      ).getTime() -
                      new Date(
                        a.scheduledAt || a.createdAt
                      ).getTime()
                  )
                  .map((post) => (
                    <button
                      key={post.id}
                      onClick={() => openPostModal(post)}
                      className="flex items-center justify-between px-4 py-3 text-left transition-colors hover:bg-[#1a1a1a]"
                    >
                      <div className="flex flex-col gap-1">
                        <span className="text-sm font-medium text-white">
                          {post.topic ||
                            post.caption?.slice(0, 50) ||
                            "Untitled"}
                        </span>
                        <span className="text-xs text-[#888888]">
                          {post.scheduledAt
                            ? new Date(post.scheduledAt).toLocaleDateString(
                                "en-US",
                                {
                                  weekday: "short",
                                  month: "short",
                                  day: "numeric",
                                  hour: "numeric",
                                  minute: "2-digit",
                                }
                              )
                            : new Date(post.createdAt).toLocaleDateString(
                                "en-US",
                                {
                                  weekday: "short",
                                  month: "short",
                                  day: "numeric",
                                }
                              )}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="rounded-full bg-[#1f1f1f] px-2 py-0.5 text-xs text-[#888888]">
                          {post.postType}
                        </span>
                        <StatusBadge status={post.status} />
                      </div>
                    </button>
                  ))}
              </div>
            )}
          </DarkCard>
        )}

        {/* Color Legend */}
        <div className="flex flex-wrap items-center gap-4">
          <span className="text-xs text-[#888888]">Legend:</span>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[#888888]" />
            <span className="text-xs text-[#888888]">Draft</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[#f0b429]" />
            <span className="text-xs text-[#888888]">Scheduled</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[#22c55e]" />
            <span className="text-xs text-[#888888]">Published</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[#ef4444]" />
            <span className="text-xs text-[#888888]">Failed</span>
          </div>
        </div>
      </div>

      {/* Schedule Modal */}
      {selectedPost && (
        <ScheduleModal
          post={{
            id: selectedPost.id,
            topic: selectedPost.topic,
            caption: selectedPost.caption,
            type: selectedPost.postType as "FEED" | "REEL" | "CAROUSEL" | "STORY",
            status: selectedPost.status,
          }}
          open={modalOpen}
          onClose={() => { setModalOpen(false); loadPosts(); }}
          onSchedule={async () => { setModalOpen(false); await loadPosts(); }}
        />
      )}
    </div>
  );
}

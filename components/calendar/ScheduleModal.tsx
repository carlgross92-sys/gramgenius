"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { GoldButton } from "@/components/ui/GoldButton";
import { StatusBadge, type PostStatus } from "@/components/ui/StatusBadge";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";

type PostType = "FEED" | "REEL" | "CAROUSEL" | "STORY";

interface SchedulePost {
  id: string;
  topic: string;
  caption: string;
  type: PostType;
  status: PostStatus;
  imageUrl?: string | null;
}

interface ScheduleModalProps {
  post: SchedulePost;
  onSchedule?: (postId: string, date: Date) => void;
  onClose?: () => void;
  open?: boolean;
}

const hours = Array.from({ length: 24 }, (_, i) => i);
const minutes = Array.from({ length: 12 }, (_, i) => i * 5);

function ScheduleModal({ post, onSchedule, onClose, open = true }: ScheduleModalProps) {
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(
    new Date()
  );
  const [selectedHour, setSelectedHour] = React.useState(12);
  const [selectedMinute, setSelectedMinute] = React.useState(0);

  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const handleSchedule = () => {
    if (!selectedDate) return;
    const scheduledDate = new Date(selectedDate);
    scheduledDate.setHours(selectedHour, selectedMinute, 0, 0);
    onSchedule?.(post.id, scheduledDate);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) onClose?.();
      }}
    >
      <DialogContent className="max-w-md bg-[#111111] ring-[#1f1f1f]">
        <DialogHeader>
          <DialogTitle className="text-white">Schedule Post</DialogTitle>
        </DialogHeader>

        {/* Post preview */}
        <div className="flex flex-col gap-3 rounded-lg border border-[#1f1f1f] bg-[#0a0a0a] p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-white">
              {post.topic || "Untitled"}
            </span>
            <StatusBadge status={post.status} />
          </div>
          {post.caption && (
            <p className="text-xs text-[#888888]">
              {post.caption.length > 80
                ? `${post.caption.slice(0, 80)}...`
                : post.caption}
            </p>
          )}
        </div>

        {/* Date picker */}
        <div className="flex justify-center">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={setSelectedDate}
            className="rounded-lg border border-[#1f1f1f] bg-[#0a0a0a]"
          />
        </div>

        {/* Time selector */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-[#888888]" />
            <span className="text-sm text-[#888888]">Time</span>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={selectedHour}
              onChange={(e) => setSelectedHour(Number(e.target.value))}
              className="rounded-lg border border-[#1f1f1f] bg-[#0a0a0a] px-3 py-2 text-sm text-white outline-none"
            >
              {hours.map((h) => (
                <option key={h} value={h}>
                  {h.toString().padStart(2, "0")}
                </option>
              ))}
            </select>
            <span className="text-[#888888]">:</span>
            <select
              value={selectedMinute}
              onChange={(e) => setSelectedMinute(Number(e.target.value))}
              className="rounded-lg border border-[#1f1f1f] bg-[#0a0a0a] px-3 py-2 text-sm text-white outline-none"
            >
              {minutes.map((m) => (
                <option key={m} value={m}>
                  {m.toString().padStart(2, "0")}
                </option>
              ))}
            </select>
          </div>
          <span className="text-xs text-[#555]">Timezone: {timezone}</span>
        </div>

        {/* Actions */}
        <DialogFooter className="border-[#1f1f1f] bg-[#0a0a0a]">
          <GoldButton variant="secondary" onClick={onClose}>
            Cancel
          </GoldButton>
          <GoldButton onClick={handleSchedule} disabled={!selectedDate}>
            Schedule
          </GoldButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export { ScheduleModal };
export type { ScheduleModalProps, SchedulePost };

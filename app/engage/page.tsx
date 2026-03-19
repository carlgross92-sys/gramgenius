"use client";

import { useEffect, useState, useCallback } from "react";
import { Header } from "@/components/layout/Header";
import { GoldButton } from "@/components/ui/GoldButton";
import { DarkCard } from "@/components/ui/DarkCard";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Loader2,
  MessageCircle,
  AlertTriangle,
  Send,
  Edit3,
  Clock,
  CheckCircle,
  User,
} from "lucide-react";

interface Comment {
  id: string;
  username: string;
  text: string;
  postThumbnail: string | null;
  time: string;
  type: "Question" | "Compliment" | "Complaint" | "Spam";
  draftReply: string;
  replied: boolean;
}

interface EngagementStats {
  totalComments: number;
  replied: number;
  responseRate: number;
  avgResponseTime: string;
}

export default function EngagePage() {
  const [comments, setComments] = useState<Comment[]>([]);
  const [stats, setStats] = useState<EngagementStats>({
    totalComments: 0,
    replied: 0,
    responseRate: 0,
    avgResponseTime: "N/A",
  });
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editedReplies, setEditedReplies] = useState<Record<string, string>>(
    {}
  );
  const [sendingId, setSendingId] = useState<string | null>(null);

  const loadComments = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/engage/comments");
      if (res.ok) {
        const data = await res.json();
        const commentList = data.comments || data || [];
        setComments(commentList);

        const total = commentList.length;
        const replied = commentList.filter(
          (c: Comment) => c.replied
        ).length;
        setStats({
          totalComments: total,
          replied,
          responseRate: total > 0 ? Math.round((replied / total) * 100) : 0,
          avgResponseTime: data.avgResponseTime || "2.4h",
        });
      }
    } catch {
      // Silent fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadComments();
  }, [loadComments]);

  async function approveAndSend(comment: Comment) {
    try {
      setSendingId(comment.id);
      const reply = editedReplies[comment.id] || comment.draftReply;
      const res = await fetch("/api/engage/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          commentId: comment.id,
          reply,
        }),
      });
      if (res.ok) {
        setComments((prev) =>
          prev.map((c) =>
            c.id === comment.id ? { ...c, replied: true } : c
          )
        );
        setEditingId(null);
        // Update stats
        setStats((prev) => ({
          ...prev,
          replied: prev.replied + 1,
          responseRate: Math.round(
            ((prev.replied + 1) / prev.totalComments) * 100
          ),
        }));
      }
    } catch {
      // Silent fail
    } finally {
      setSendingId(null);
    }
  }

  function getTypeConfig(type: string) {
    const configs: Record<
      string,
      { color: string; bg: string; icon: React.ReactNode }
    > = {
      Question: {
        color: "text-blue-400",
        bg: "bg-blue-400/15",
        icon: <MessageCircle className="h-3 w-3" />,
      },
      Compliment: {
        color: "text-[#22c55e]",
        bg: "bg-[#22c55e]/15",
        icon: <CheckCircle className="h-3 w-3" />,
      },
      Complaint: {
        color: "text-[#f59e0b]",
        bg: "bg-[#f59e0b]/15",
        icon: <AlertTriangle className="h-3 w-3" />,
      },
      Spam: {
        color: "text-[#ef4444]",
        bg: "bg-[#ef4444]/15",
        icon: <AlertTriangle className="h-3 w-3" />,
      },
    };
    return (
      configs[type] || {
        color: "text-[#888888]",
        bg: "bg-[#888888]/15",
        icon: <MessageCircle className="h-3 w-3" />,
      }
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#f0b429]" />
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <Header title="Comment Manager" />

      <div className="flex flex-col gap-6 p-6">
        {/* Stats Bar */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <DarkCard className="text-center">
            <p className="text-2xl font-bold text-white">
              {stats.totalComments}
            </p>
            <p className="text-xs text-[#888888]">Total Comments</p>
          </DarkCard>
          <DarkCard className="text-center">
            <p className="text-2xl font-bold text-[#22c55e]">
              {stats.replied}
            </p>
            <p className="text-xs text-[#888888]">Replied</p>
          </DarkCard>
          <DarkCard
            className={`text-center ${stats.responseRate < 80 ? "border-[#f59e0b]/30" : ""}`}
          >
            <p
              className={`text-2xl font-bold ${stats.responseRate < 80 ? "text-[#f59e0b]" : "text-[#22c55e]"}`}
            >
              {stats.responseRate}%
            </p>
            <p className="text-xs text-[#888888]">Response Rate</p>
          </DarkCard>
          <DarkCard className="text-center">
            <p className="text-2xl font-bold text-white">
              {stats.avgResponseTime}
            </p>
            <p className="text-xs text-[#888888]">Avg Response Time</p>
          </DarkCard>
        </div>

        {/* Alert if rate < 80% */}
        {stats.responseRate < 80 && stats.totalComments > 0 && (
          <DarkCard className="flex items-center gap-3 border-[#f59e0b]/30">
            <AlertTriangle className="h-5 w-5 shrink-0 text-[#f59e0b]" />
            <div>
              <p className="font-medium text-[#f59e0b]">
                Response Rate Below 80%
              </p>
              <p className="text-sm text-[#888888]">
                Instagram&apos;s algorithm favors accounts that engage quickly
                with their audience. Aim for 80%+ response rate.
              </p>
            </div>
          </DarkCard>
        )}

        {/* Comments List */}
        <DarkCard>
          <h3 className="mb-4 text-lg font-semibold text-white">
            Comments ({comments.filter((c) => !c.replied).length} pending)
          </h3>

          {comments.length === 0 ? (
            <p className="py-8 text-center text-[#888888]">
              No comments to manage yet.
            </p>
          ) : (
            <ScrollArea className="max-h-[600px]">
              <div className="flex flex-col gap-4">
                {comments
                  .sort((a, b) => (a.replied === b.replied ? 0 : a.replied ? 1 : -1))
                  .map((comment) => {
                    const typeConfig = getTypeConfig(comment.type);
                    const isEditing = editingId === comment.id;
                    const isSending = sendingId === comment.id;
                    const currentReply =
                      editedReplies[comment.id] || comment.draftReply;

                    return (
                      <div
                        key={comment.id}
                        className={`rounded-lg border p-4 transition-all ${
                          comment.replied
                            ? "border-[#1f1f1f]/50 opacity-60"
                            : "border-[#1f1f1f]"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          {/* Post thumbnail */}
                          {comment.postThumbnail ? (
                            <img
                              src={comment.postThumbnail}
                              alt=""
                              className="h-12 w-12 shrink-0 rounded-lg object-cover"
                            />
                          ) : (
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-[#1f1f1f]">
                              <MessageCircle className="h-5 w-5 text-[#555555]" />
                            </div>
                          )}

                          <div className="flex-1">
                            <div className="mb-1 flex items-center gap-2">
                              <User className="h-3 w-3 text-[#888888]" />
                              <span className="text-sm font-medium text-white">
                                @{comment.username}
                              </span>
                              <span
                                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${typeConfig.bg} ${typeConfig.color}`}
                              >
                                {typeConfig.icon}
                                {comment.type}
                              </span>
                              <span className="flex items-center gap-1 text-xs text-[#555555]">
                                <Clock className="h-3 w-3" />
                                {comment.time}
                              </span>
                              {comment.replied && (
                                <span className="flex items-center gap-1 text-xs text-[#22c55e]">
                                  <CheckCircle className="h-3 w-3" />
                                  Replied
                                </span>
                              )}
                            </div>

                            <p className="mb-3 text-sm text-[#cccccc]">
                              {comment.text}
                            </p>

                            {!comment.replied && (
                              <div className="flex flex-col gap-2">
                                <Textarea
                                  value={currentReply}
                                  onChange={(e) =>
                                    setEditedReplies((prev) => ({
                                      ...prev,
                                      [comment.id]: e.target.value,
                                    }))
                                  }
                                  disabled={!isEditing && editingId !== null}
                                  className="min-h-[60px] border-[#1f1f1f] bg-[#1a1a1a] text-sm text-white"
                                  placeholder="AI-drafted reply..."
                                />
                                <div className="flex gap-2">
                                  <GoldButton
                                    onClick={() => approveAndSend(comment)}
                                    disabled={isSending}
                                  >
                                    {isSending ? (
                                      <Loader2 className="h-3 w-3 animate-spin" />
                                    ) : (
                                      <Send className="h-3 w-3" />
                                    )}
                                    Approve & Send
                                  </GoldButton>
                                  <GoldButton
                                    variant="secondary"
                                    onClick={() =>
                                      setEditingId(
                                        isEditing ? null : comment.id
                                      )
                                    }
                                  >
                                    <Edit3 className="h-3 w-3" />
                                    {isEditing ? "Done Editing" : "Edit"}
                                  </GoldButton>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </ScrollArea>
          )}
        </DarkCard>
      </div>
    </div>
  );
}

import * as React from "react";
import { cn } from "@/lib/utils";

type PostStatus = "DRAFT" | "SCHEDULED" | "PUBLISHED" | "FAILED";

interface StatusBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  status: PostStatus;
}

const statusConfig: Record<PostStatus, { color: string; bg: string }> = {
  DRAFT: { color: "#888888", bg: "rgba(136,136,136,0.15)" },
  SCHEDULED: { color: "#f0b429", bg: "rgba(240,180,41,0.15)" },
  PUBLISHED: { color: "#22c55e", bg: "rgba(34,197,94,0.15)" },
  FAILED: { color: "#ef4444", bg: "rgba(239,68,68,0.15)" },
};

function StatusBadge({ status, className, ...props }: StatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        className
      )}
      style={{
        color: config.color,
        backgroundColor: config.bg,
      }}
      {...props}
    >
      {status}
    </span>
  );
}

export { StatusBadge };
export type { StatusBadgeProps, PostStatus };

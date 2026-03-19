import * as React from "react";
import { DarkCard } from "@/components/ui/DarkCard";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface StatsCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  trend?: number;
  className?: string;
}

function StatsCard({ icon: Icon, label, value, trend, className }: StatsCardProps) {
  return (
    <DarkCard className={cn("flex flex-col gap-3", className)}>
      <div className="flex items-center justify-between">
        <Icon className="h-5 w-5 text-[#f0b429]" />
        {trend !== undefined && (
          <span
            className={cn(
              "text-xs font-medium",
              trend >= 0 ? "text-[#22c55e]" : "text-[#ef4444]"
            )}
          >
            {trend >= 0 ? "+" : ""}
            {trend}%
          </span>
        )}
      </div>
      <div>
        <p className="text-sm text-[#888888]">{label}</p>
        <p className="text-3xl font-bold text-white">{value}</p>
      </div>
    </DarkCard>
  );
}

export { StatsCard };
export type { StatsCardProps };

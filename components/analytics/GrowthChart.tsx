"use client";

import * as React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { DarkCard } from "@/components/ui/DarkCard";
import { cn } from "@/lib/utils";

interface GrowthDataPoint {
  date: string;
  followers: number;
  engagementRate: number;
  reach: number;
}

interface GrowthChartProps {
  data: GrowthDataPoint[];
  className?: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    color: string;
    dataKey: string;
  }>;
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-[#1f1f1f] bg-[#1a1a1a] px-4 py-3 shadow-lg">
      <p className="mb-2 text-xs text-[#888888]">{label}</p>
      {payload.map((entry) => (
        <div key={entry.dataKey} className="flex items-center gap-2">
          <span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-xs text-[#ccc]">
            {entry.name}:{" "}
            <span className="font-medium text-white">
              {entry.dataKey === "engagementRate"
                ? `${entry.value.toFixed(2)}%`
                : entry.value.toLocaleString()}
            </span>
          </span>
        </div>
      ))}
    </div>
  );
}

function GrowthChart({ data, className }: GrowthChartProps) {
  return (
    <DarkCard className={cn("flex flex-col gap-4", className)}>
      <h2 className="text-lg font-semibold text-white">90-Day Growth</h2>
      {data.length === 0 ? (
        <p className="py-8 text-center text-sm text-[#888888]">
          No analytics data available yet.
        </p>
      ) : (
        <ResponsiveContainer width="100%" height={350}>
          <LineChart data={data}>
            <CartesianGrid stroke="#1f1f1f" strokeDasharray="3 3" />
            <XAxis
              dataKey="date"
              tick={{ fill: "#888888", fontSize: 11 }}
              axisLine={{ stroke: "#1f1f1f" }}
              tickLine={false}
            />
            <YAxis
              yAxisId="left"
              tick={{ fill: "#888888", fontSize: 11 }}
              axisLine={{ stroke: "#1f1f1f" }}
              tickLine={false}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fill: "#888888", fontSize: 11 }}
              axisLine={{ stroke: "#1f1f1f" }}
              tickLine={false}
              tickFormatter={(v: number) => `${v}%`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              verticalAlign="top"
              iconType="circle"
              iconSize={8}
              formatter={(value: string) => (
                <span className="text-xs text-[#888888]">{value}</span>
              )}
            />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="followers"
              name="Followers"
              stroke="#f0b429"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: "#f0b429" }}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="engagementRate"
              name="Engagement Rate"
              stroke="#22c55e"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: "#22c55e" }}
            />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="reach"
              name="Reach"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: "#3b82f6" }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </DarkCard>
  );
}

export { GrowthChart };
export type { GrowthChartProps, GrowthDataPoint };

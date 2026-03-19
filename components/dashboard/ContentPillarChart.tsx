"use client";

import * as React from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { DarkCard } from "@/components/ui/DarkCard";
import { cn } from "@/lib/utils";

type PostType = "FEED" | "REEL" | "CAROUSEL" | "STORY";

interface ChartPost {
  id: string;
  type: PostType;
}

interface ContentPillarChartProps {
  posts: ChartPost[];
  className?: string;
}

const TYPE_COLORS: Record<PostType, string> = {
  FEED: "#f0b429",
  REEL: "#d4940a",
  CAROUSEL: "#f5c842",
  STORY: "#c78a08",
};

const TYPE_LABELS: PostType[] = ["FEED", "REEL", "CAROUSEL", "STORY"];

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number }>;
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-[#1f1f1f] bg-[#1a1a1a] px-3 py-2 text-sm shadow-lg">
      <p className="text-white">
        <span className="font-medium">{payload[0].name}:</span>{" "}
        {payload[0].value} posts
      </p>
    </div>
  );
}

function ContentPillarChart({ posts, className }: ContentPillarChartProps) {
  const data = React.useMemo(() => {
    const counts: Record<PostType, number> = { FEED: 0, REEL: 0, CAROUSEL: 0, STORY: 0 };
    posts.forEach((p) => {
      if (counts[p.type] !== undefined) {
        counts[p.type]++;
      }
    });
    return TYPE_LABELS.map((type) => ({
      name: type,
      value: counts[type],
    })).filter((d) => d.value > 0);
  }, [posts]);

  return (
    <DarkCard className={cn("flex flex-col gap-4", className)}>
      <h2 className="text-lg font-semibold text-white">Content Mix</h2>
      {data.length === 0 ? (
        <p className="py-8 text-center text-sm text-[#888888]">
          No posts to visualize yet.
        </p>
      ) : (
        <ResponsiveContainer width="100%" height={260}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={90}
              paddingAngle={4}
              dataKey="value"
              nameKey="name"
              stroke="none"
            >
              {data.map((entry) => (
                <Cell
                  key={entry.name}
                  fill={TYPE_COLORS[entry.name as PostType]}
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend
              verticalAlign="bottom"
              iconType="circle"
              iconSize={8}
              formatter={(value: string) => (
                <span className="text-xs text-[#888888]">{value}</span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      )}
    </DarkCard>
  );
}

export { ContentPillarChart };
export type { ContentPillarChartProps, ChartPost };

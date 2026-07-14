"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Line,
  ComposedChart,
  Legend,
} from "recharts";
import type { DailyTrend } from "@/providers";
import { cn } from "@/lib/utils";

interface UsageChartProps {
  dailyTrend?: DailyTrend[];
  trendSource?: "real" | "estimated" | "empty";
  loading?: boolean;
  error?: string;
}

function TrendSourceBadge({ source }: { source?: "real" | "estimated" | "empty" }) {
  if (!source || source === "empty") return null;
  return (
    <Badge
      variant={source === "real" ? "default" : "secondary"}
      className="ml-2 px-1.5 py-0 text-[10px]"
    >
      {source === "real" ? "真实数据" : "月度估算"}
    </Badge>
  );
}

/** 格式化大数字：>100万显示 M，>1000 显示 K */
function formatTokens(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K`;
  return String(v);
}

export function UsageChart({
  dailyTrend,
  trendSource,
  loading,
  error,
}: UsageChartProps) {
  const hasCost = dailyTrend?.some((d) => (d.cost ?? 0) > 0);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            近 7 天 Token 用量趋势
          </CardTitle>
          <TrendSourceBadge source={trendSource} />
        </div>
      </CardHeader>
      <CardContent>
        {error ? (
          <div className="flex h-[220px] items-center justify-center">
            <p className="text-xs text-red-500">{error}</p>
          </div>
        ) : loading ? (
          <div className="space-y-2">
            <Skeleton className="h-[220px] w-full" />
          </div>
        ) : !dailyTrend || dailyTrend.length === 0 ? (
          <div className="flex h-[220px] items-center justify-center">
            <p className="text-sm text-muted-foreground">暂无数据</p>
          </div>
        ) : (
          <div className="h-[240px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={dailyTrend}
                margin={{ top: 10, right: 10, bottom: 5, left: -10 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="hsl(var(--border))"
                />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(val: string) => val.slice(5)}
                  axisLine={false}
                  tickLine={false}
                />
                {/* Token 用量 — 左轴 */}
                <YAxis
                  yAxisId="tokens"
                  tick={{ fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  width={50}
                  tickFormatter={formatTokens}
                />
                {/* 费用 — 右轴（仅当有数据时显示） */}
                {hasCost && (
                  <YAxis
                    yAxisId="cost"
                    orientation="right"
                    tick={{ fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    width={50}
                    tickFormatter={(v: number) => `¥${v.toFixed(1)}`}
                  />
                )}
                <Tooltip
                  contentStyle={{
                    fontSize: 12,
                    borderRadius: 6,
                    border: "1px solid hsl(var(--border))",
                  }}
                  formatter={(value, name) => {
                    if (name === "tokens") {
                      return [
                        (value as number).toLocaleString(),
                        "Token",
                      ] as [string, string];
                    }
                    if (name === "cost") {
                      const cost = value as number;
                      return [
                        cost > 0 ? `${cost.toFixed(4)} CNY` : "—",
                        "费用",
                      ] as [string, string];
                    }
                    return [value, name] as [string, string];
                  }}
                />
                {hasCost && (
                  <Legend
                    wrapperStyle={{ fontSize: 11 }}
                    iconSize={8}
                  />
                )}
                {/* Token 柱状图 */}
                <Bar
                  yAxisId="tokens"
                  dataKey="tokens"
                  name="Token"
                  fill="hsl(var(--chart-1))"
                  radius={[4, 4, 0, 0]}
                  // 估算数据用半透明
                  fillOpacity={trendSource === "estimated" ? 0.5 : 1}
                />
                {/* 费用折线图 — 叠加在柱状图上 */}
                {hasCost && (
                  <Line
                    yAxisId="cost"
                    dataKey="cost"
                    name="费用"
                    stroke="hsl(var(--chart-2))"
                    strokeWidth={2}
                    dot={{ r: 3, fill: "hsl(var(--chart-2))" }}
                    strokeDasharray={trendSource === "estimated" ? "5 5" : undefined}
                  />
                )}
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

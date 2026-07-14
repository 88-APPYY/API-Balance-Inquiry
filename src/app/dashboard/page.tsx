"use client";

import { useEffect, useState, useCallback } from "react";
import { BalanceCard } from "@/components/dashboard/BalanceCard";
import { UsageChart } from "@/components/dashboard/UsageChart";
import { RecentCalls } from "@/components/dashboard/RecentCalls";
import { ApiKeyForm } from "@/components/dashboard/ApiKeyForm";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Plus, RefreshCw, Eye } from "lucide-react";
import type { BalanceResponse, UsageResponse, DailyTrend } from "@/providers";

interface ApiKeyItem {
  id: string;
  provider: string;
  label: string;
  keyPrefix: string;
  queryCount: number;
  createdAt: string;
}

interface QueryRecord {
  id: string;
  queryType: string;
  provider: string;
  createdAt: string;
  apiKey: { label: string; keyPrefix: string } | null;
}

interface TrendData {
  trend: DailyTrend[];
  source: "real" | "estimated" | "empty";
}

export default function DashboardPage() {
  const [keys, setKeys] = useState<ApiKeyItem[]>([]);
  const [selectedKeyId, setSelectedKeyId] = useState<string | null>(null);
  const [balance, setBalance] = useState<BalanceResponse | null>(null);
  const [usage, setUsage] = useState<UsageResponse | null>(null);
  const [trendData, setTrendData] = useState<TrendData | null>(null);
  const [history, setHistory] = useState<QueryRecord[]>([]);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [usageLoading, setUsageLoading] = useState(false);
  const [trendLoading, setTrendLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const loadKeys = useCallback(async () => {
    try {
      const res = await fetch("/api/keys", { signal: AbortSignal.timeout(10000) });
      const data = await res.json();
      setKeys(data);
      if (data.length > 0 && !selectedKeyId) {
        setSelectedKeyId(data[0].id);
      }
    } catch {
      // silent
    }
  }, [selectedKeyId]);

  const queryBalance = useCallback(async () => {
    if (!selectedKeyId) return;
    setBalanceLoading(true);
    try {
      const res = await fetch("/api/balance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyId: selectedKeyId }),
        signal: AbortSignal.timeout(12000),
      });
      const data = await res.json();
      setBalance(data);
    } catch {
      setBalance({ success: false, error: "查询失败" });
    } finally {
      setBalanceLoading(false);
    }
  }, [selectedKeyId]);

  const queryUsage = useCallback(async () => {
    if (!selectedKeyId) return;
    setUsageLoading(true);
    try {
      const res = await fetch("/api/usage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyId: selectedKeyId }),
        signal: AbortSignal.timeout(12000),
      });
      const data = await res.json();
      setUsage(data);
      // 从 usage 响应中提取 trendSource
      if (data?.data?.tokenUsage) {
        const { dailyTrend, trendSource } = data.data.tokenUsage;
        if (dailyTrend?.length > 0) {
          setTrendData({ trend: dailyTrend, source: trendSource ?? "estimated" });
        }
      }
    } catch {
      setUsage({ success: false, error: "查询失败" });
    } finally {
      setUsageLoading(false);
    }
  }, [selectedKeyId]);

  const loadTrend = useCallback(async () => {
    if (!selectedKeyId) return;
    setTrendLoading(true);
    try {
      const res = await fetch(
        `/api/usage/trend?keyId=${selectedKeyId}&days=7`,
        { signal: AbortSignal.timeout(8000) },
      );
      const data = await res.json();
      if (data?.success && data.data) {
        setTrendData(data.data);
      }
    } catch {
      // silent — 趋势加载失败不影响主数据
    } finally {
      setTrendLoading(false);
    }
  }, [selectedKeyId]);

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const params = selectedKeyId ? `?keyId=${selectedKeyId}` : "";
      const res = await fetch(`/api/usage/history${params}`, {
        signal: AbortSignal.timeout(10000),
      });
      const data = await res.json();
      setHistory(data);
    } catch {
      // silent
    } finally {
      setHistoryLoading(false);
    }
  }, [selectedKeyId]);

  const refreshAll = useCallback(() => {
    queryBalance();
    queryUsage();
    loadHistory();
  }, [queryBalance, queryUsage, loadHistory]);

  useEffect(() => {
    loadKeys();
  }, [loadKeys]);

  useEffect(() => {
    if (selectedKeyId) {
      loadTrend(); // 先尝试本地快照趋势
      refreshAll();
    }
  }, [selectedKeyId, refreshAll, loadTrend]);

  // 判断趋势数据来源
  const trendSource =
    trendData?.source ??
    (usage?.data?.tokenUsage.trendSource as "real" | "estimated" | undefined);
  const chartTrend =
    trendData?.trend?.length
      ? trendData.trend
      : usage?.data?.tokenUsage.dailyTrend;

  // 计算日均用量
  const dailyAverage = computeDailyAverage(
    chartTrend,
    usage?.data?.tokenUsage.totalTokens,
    trendSource,
  );

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6 lg:p-8">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">
            API Balance Tracker
          </h1>
          <p className="text-xs text-muted-foreground">
            统一查询与管理 AI 模型 API 余额及用量
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={refreshAll}>
            <RefreshCw className="mr-1 h-3.5 w-3.5" />
            刷新
          </Button>
          <Button size="sm" onClick={() => setShowForm(!showForm)}>
            <Plus className="mr-1 h-3.5 w-3.5" />
            添加 Key
          </Button>
        </div>
      </div>

      {/* 添加 Key 表单 */}
      {showForm && (
        <div className="max-w-md">
          <ApiKeyForm
            onSuccess={() => {
              loadKeys();
              setShowForm(false);
            }}
          />
        </div>
      )}

      {/* 主内容区 */}
      <Tabs
        value={selectedKeyId ?? ""}
        onValueChange={setSelectedKeyId}
        className="space-y-4"
      >
        <TabsList className="w-full justify-start overflow-x-auto">
          {keys.map((key) => (
            <TabsTrigger key={key.id} value={key.id} className="gap-1.5">
              {key.label}
              <Badge variant="outline" className="ml-1 text-[10px] px-1 py-0">
                {key.queryCount}
              </Badge>
            </TabsTrigger>
          ))}
          {keys.length === 0 && (
            <span className="px-3 py-1.5 text-xs text-muted-foreground">
              暂未添加 API Key
            </span>
          )}
        </TabsList>

        {keys.map((key) => (
          <TabsContent
            key={key.id}
            value={key.id}
            className="space-y-4 mt-0"
          >
            {/* Key 信息栏 */}
            <div className="flex items-center gap-2 rounded-lg border bg-card px-4 py-2.5 text-xs text-muted-foreground">
              <Eye className="h-3.5 w-3.5" />
              <span>Key: {key.keyPrefix}</span>
              <span className="text-[10px]">({key.provider})</span>
            </div>

            {/* 数据卡片网格 */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <BalanceCard
                availableBalance={balance?.data?.availableBalance}
                totalSpent={balance?.data?.totalSpent}
                currency={balance?.data?.currency}
                loading={balanceLoading}
                error={
                  balance && !balance.success ? balance.error : undefined
                }
              />

              <div className="sm:col-span-1 lg:col-span-2">
                <UsageChart
                  dailyTrend={chartTrend}
                  trendSource={trendSource}
                  loading={usageLoading}
                  error={
                    usage && !usage.success ? usage.error : undefined
                  }
                />
              </div>
            </div>

            {/* 统计卡片 — 本月累计 / 本月费用 / 日均用量 */}
            <div className="grid gap-4 sm:grid-cols-3">
              <StatCard
                label="本月累计 Token"
                value={usage?.data?.tokenUsage.totalTokens.toLocaleString()}
                loading={usageLoading}
              />
              <StatCard
                label="本月总费用"
                value={
                  usage?.data?.tokenUsage.monthlyCost !== undefined
                    ? `${usage.data.tokenUsage.monthlyCost.toFixed(2)} CNY`
                    : undefined
                }
                loading={usageLoading}
              />
              <StatCard
                label={
                  dailyAverage.source === "real"
                    ? "日均 Token 用量"
                    : "日均 Token 用量 (估算)"
                }
                value={dailyAverage.value.toLocaleString()}
                loading={usageLoading}
              />
            </div>

            {/* 最近查询记录 */}
            <RecentCalls records={history} loading={historyLoading} />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

function StatCard({
  label,
  value,
  loading,
}: {
  label: string;
  value?: string;
  loading?: boolean;
}) {
  return (
    <div className="rounded-lg border bg-card px-4 py-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      {loading ? (
        <div className="mt-1 h-6 w-20 animate-pulse rounded bg-muted" />
      ) : (
        <p className="mt-1 text-lg font-semibold tabular-nums">
          {value ?? "—"}
        </p>
      )}
    </div>
  );
}

/** 计算日均用量 */
function computeDailyAverage(
  trend: DailyTrend[] | undefined,
  monthlyTotal: number | undefined,
  source?: string,
): { value: number; source: "real" | "estimated" } {
  if (source === "real" && trend && trend.length > 0) {
    const total = trend.reduce((sum, t) => sum + t.tokens, 0);
    return { value: Math.round(total / trend.length), source: "real" };
  }
  // 估算
  const daysElapsed = Math.max(1, new Date().getDate());
  return {
    value: Math.round((monthlyTotal ?? 0) / daysElapsed),
    source: "estimated",
  };
}

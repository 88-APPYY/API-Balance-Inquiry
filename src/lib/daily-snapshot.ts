import { prisma } from "@/lib/db";
import type { DailyTrend } from "@/providers";

/**
 * 保存或更新当天的用量快照（upsert）。
 * 同一 API Key 在同一天内多次查询，最后一次的值会覆盖。
 */
export async function upsertSnapshot(
  apiKeyId: string,
  date: string,
  totalTokens: number,
  cost: number,
) {
  return prisma.dailyUsageSnapshot.upsert({
    where: { apiKeyId_date: { apiKeyId, date } },
    create: { apiKeyId, date, totalTokens, cost },
    update: { totalTokens, cost },
  });
}

/**
 * 从快照差值计算近 N 天真实每日趋势。
 *
 * 逻辑：
 * - 获取近 (days + 1) 个快照（需要 N+1 个点算 N 天差值）
 * - 不足 2 个快照 → 返回 source: "estimated"，trend 为空
 * - ≥2 个快照 → 相邻差值 = 当日真实用量，处理月回滚和日期间隙
 */
export async function computeDailyTrend(
  apiKeyId: string,
  days: number,
): Promise<{ trend: DailyTrend[]; source: "real" | "estimated" | "empty" }> {
  const since = new Date();
  since.setDate(since.getDate() - days - 1); // 多取 1 天做基数

  const snapshots = await prisma.dailyUsageSnapshot.findMany({
    where: { apiKeyId, date: { gte: since.toISOString().split("T")[0] } },
    orderBy: { date: "asc" },
  });

  if (snapshots.length < 2) {
    return { trend: [], source: "estimated" };
  }

  const trend: DailyTrend[] = [];

  for (let i = 1; i < snapshots.length; i++) {
    const prev = snapshots[i - 1];
    const curr = snapshots[i];

    // 检测月末回滚：当月累计值变小说明进入新月份
    if (curr.totalTokens < prev.totalTokens) {
      // 新月份的第一个快照，跳过本段
      continue;
    }

    const dayDiff = daysBetween(prev.date, curr.date);
    // 日期间隙 > 1 天时平滑分配
    const tokenDelta = curr.totalTokens - prev.totalTokens;
    const costDelta = curr.cost - prev.cost;
    const perDay = dayDiff > 0 ? dayDiff : 1;

    for (let d = 0; d < dayDiff; d++) {
      const d2 = new Date(prev.date);
      d2.setDate(d2.getDate() + d + 1);
      trend.push({
        date: d2.toISOString().split("T")[0],
        tokens: Math.round(tokenDelta / perDay),
        cost: parseFloat((costDelta / perDay).toFixed(4)),
      });
    }
  }

  // 只返回最近 days 条
  const recent = trend.slice(-days);

  return recent.length > 0
    ? { trend: recent, source: "real" }
    : { trend: [], source: "estimated" };
}

/**
 * 估算每日趋势：将月度总量平均分配到当月已过天数。
 * 作为快照不足时的回退方案。
 */
export function generateEstimatedTrend(
  monthlyTokens: number,
  monthlyCost: number,
  now?: Date,
): DailyTrend[] {
  const today = now ?? new Date();
  const daysElapsed = Math.max(1, today.getDate());
  const avgDailyTokens = Math.floor(monthlyTokens / daysElapsed);
  const avgDailyCost = monthlyCost / daysElapsed;

  const trend: DailyTrend[] = [];
  for (let d = 1; d <= daysElapsed; d++) {
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(d).padStart(2, "0");
    const isToday = d === daysElapsed;
    trend.push({
      date: `${today.getFullYear()}-${mm}-${dd}`,
      tokens: isToday
        ? monthlyTokens - avgDailyTokens * (daysElapsed - 1)
        : avgDailyTokens,
      cost: parseFloat(avgDailyCost.toFixed(4)),
    });
  }

  // 只返回最近 7 天
  return trend.slice(-7);
}

/** 计算两个 YYYY-MM-DD 日期之间的天数差 */
function daysBetween(a: string, b: string): number {
  const da = new Date(a);
  const db = new Date(b);
  return Math.round((db.getTime() - da.getTime()) / 86400000);
}

/**
 * 计算近 N 天的日均可信 Token 用量。
 * - 有 ≥2 个快照：用真实增量计算
 * - 快照不足：用月度总量 / 已过天数估算
 */
export async function computeDailyAverage(
  apiKeyId: string,
  monthlyTokens: number,
  days: number,
): Promise<{ value: number; source: "real" | "estimated" }> {
  const { trend, source } = await computeDailyTrend(apiKeyId, days);

  if (source === "real" && trend.length > 0) {
    const total = trend.reduce((sum, t) => sum + t.tokens, 0);
    return { value: Math.round(total / trend.length), source: "real" };
  }

  // 回退
  const now = new Date();
  const daysElapsed = Math.max(1, now.getDate());
  return {
    value: Math.round(monthlyTokens / daysElapsed),
    source: "estimated",
  };
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { decryptApiKey } from "@/lib/crypto";
import { DeepSeekProvider, ProviderType } from "@/providers";
import {
  upsertSnapshot,
  computeDailyTrend,
  generateEstimatedTrend,
} from "@/lib/daily-snapshot";

// POST /api/usage → 查询指定 Key 的用量，并存快照计算趋势
export async function POST(request: Request) {
  try {
    const { keyId, startDate, endDate } = (await request.json()) as {
      keyId: string;
      startDate?: string;
      endDate?: string;
    };

    if (!keyId) {
      return NextResponse.json(
        { error: "keyId is required" },
        { status: 400 },
      );
    }

    const record = await prisma.apiKey.findUnique({ where: { id: keyId } });
    if (!record || !record.isActive) {
      return NextResponse.json(
        { error: "API key not found or inactive" },
        { status: 404 },
      );
    }

    const apiKey = await decryptApiKey(record.encryptedKey);
    const platformCookie = record.encryptedCookie
      ? await decryptApiKey(record.encryptedCookie)
      : undefined;

    const provider = new DeepSeekProvider();
    await provider.initialize({ apiKey, platformCookie });

    const result = await provider.getUsage({
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });

    // 如果 Provider 查询成功，保存快照并计算真实趋势
    if (result.success && result.data) {
      const { totalTokens } = result.data.tokenUsage;
      const monthlyCost = result.data.tokenUsage.monthlyCost ?? 0;

      // 保存今日快照（失败不阻塞返回数据）
      try {
        const today = new Date().toISOString().split("T")[0];
        await upsertSnapshot(keyId, today, totalTokens, monthlyCost);
      } catch {
        // 快照保存失败，静默处理，不影响主流程
        console.warn(`Failed to save snapshot for key ${keyId}`);
      }

      // 尝试从快照计算真实每日趋势
      try {
        const { trend, source } = await computeDailyTrend(keyId, 7);
        if (source === "real" && trend.length > 0) {
          result.data.tokenUsage.dailyTrend = trend;
          result.data.tokenUsage.trendSource = "real";
        } else {
          // 快照不足，用月度估算作为回退
          result.data.tokenUsage.dailyTrend = generateEstimatedTrend(
            totalTokens,
            monthlyCost,
          );
          result.data.tokenUsage.trendSource = "estimated";
        }
      } catch {
        // 趋势计算失败，用估算回退
        result.data.tokenUsage.dailyTrend = generateEstimatedTrend(
          totalTokens,
          monthlyCost,
        );
        result.data.tokenUsage.trendSource = "estimated";
      }
    }

    // 记录查询历史
    await prisma.queryRecord.create({
      data: {
        apiKeyId: keyId,
        provider: ProviderType.DeepSeek,
        queryType: "usage",
        response: JSON.stringify(result),
      },
    });

    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

// GET /api/usage/history?keyId=xxx → 获取本地的查询历史记录
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const keyId = searchParams.get("keyId");

    const where = keyId ? { apiKeyId: keyId } : {};

    const records = await prisma.queryRecord.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        apiKey: { select: { label: true, keyPrefix: true } },
      },
    });

    return NextResponse.json(records);
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to fetch query history" },
      { status: 500 },
    );
  }
}

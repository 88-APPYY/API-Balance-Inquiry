import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { computeDailyTrend } from "@/lib/daily-snapshot";

/**
 * GET /api/usage/trend?keyId=xxx&days=7
 * 轻量端点：仅从本地快照返回趋势数据，不查询外部 API。
 * 用于仪表盘首次加载和后台刷新，避免消耗 API 配额。
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const keyId = searchParams.get("keyId");
    const days = Number.parseInt(searchParams.get("days") ?? "7", 10);

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

    const { trend, source } = await computeDailyTrend(keyId, days);

    return NextResponse.json({
      success: true,
      data: { trend, source },
    });
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

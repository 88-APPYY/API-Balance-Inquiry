import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { encryptApiKey, decryptApiKey, maskApiKey } from "@/lib/crypto";
// GET /api/keys → 返回所有已保存的 Key（脱敏后）
export async function GET() {
  try {
    const keys = await prisma.apiKey.findMany({
      where: { isActive: true },
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { queryRecords: true } } },
    });

    return NextResponse.json(
      keys.map((k) => ({
        id: k.id,
        provider: k.provider,
        label: k.label,
        keyPrefix: k.keyPrefix,
        queryCount: k._count.queryRecords,
        createdAt: k.createdAt,
      })),
    );
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to fetch keys" },
      { status: 500 },
    );
  }
}

// POST /api/keys → 新增 API Key
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { provider, label, apiKey, platformCookie } = body as {
      provider: string;
      label: string;
      apiKey: string;
      platformCookie?: string;
    };

    if (!provider || !label || !apiKey) {
      return NextResponse.json(
        { error: "provider, label, and apiKey are required" },
        { status: 400 },
      );
    }

    // 基础格式校验：非空、足够长度
    if (apiKey.length < 8) {
      return NextResponse.json(
        { error: "API Key 格式不正确" },
        { status: 400 },
      );
    }

    // 加密存储
    const encryptedKey = await encryptApiKey(apiKey);
    const keyPrefix = maskApiKey(apiKey);

    // 加密平台 Cookie（可选）
    const encryptedCookie = platformCookie?.trim()
      ? await encryptApiKey(platformCookie.trim())
      : undefined;

    const saved = await prisma.apiKey.create({
      data: {
        provider,
        label,
        keyPrefix,
        encryptedKey,
        encryptedCookie: encryptedCookie ?? null,
        salt: "", // 未来扩展：每个 key 独立盐值
      },
    });

    return NextResponse.json(
      {
        id: saved.id,
        provider: saved.provider,
        label: saved.label,
        keyPrefix: saved.keyPrefix,
        createdAt: saved.createdAt,
      },
      { status: 201 },
    );
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to save key" },
      { status: 500 },
    );
  }
}

// DELETE /api/keys?id=xxx → 删除 API Key（软删除）
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "id is required" },
        { status: 400 },
      );
    }

    await prisma.apiKey.update({
      where: { id },
      data: { isActive: false },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to delete key" },
      { status: 500 },
    );
  }
}

// 解密 API Key + Cookie（内部调用）
export async function decryptKey(id: string): Promise<{ apiKey: string; cookie?: string } | null> {
  const record = await prisma.apiKey.findUnique({ where: { id } });
  if (!record) return null;
  const apiKey = await decryptApiKey(record.encryptedKey);
  const cookie = record.encryptedCookie
    ? await decryptApiKey(record.encryptedCookie)
    : undefined;
  return { apiKey, cookie };
}

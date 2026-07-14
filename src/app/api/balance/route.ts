import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { decryptApiKey } from "@/lib/crypto";
import { DeepSeekProvider, ProviderType } from "@/providers";

// POST /api/balance → 查询指定 Key 的余额
export async function POST(request: Request) {
  try {
    const { keyId } = (await request.json()) as { keyId: string };

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

    const result = await provider.getBalance();

    // 记录查询历史
    await prisma.queryRecord.create({
      data: {
        apiKeyId: keyId,
        provider: ProviderType.DeepSeek,
        queryType: "balance",
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

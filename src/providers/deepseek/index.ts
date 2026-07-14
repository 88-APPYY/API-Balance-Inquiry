import type { BalanceResponse, ProviderConfig, UsageResponse } from "../types";
import { ProviderType } from "../types";
import type { IProvider } from "../IProvider";

export class DeepSeekProvider implements IProvider {
  readonly type = ProviderType.DeepSeek;

  private apiKey = "";
  private baseUrl = "https://api.deepseek.com";
  private platformCookie?: string;
  private initialized = false;

  async initialize(config: ProviderConfig): Promise<void> {
    this.apiKey = config.apiKey as string;
    if (config.baseUrl) {
      this.baseUrl = config.baseUrl as string;
    }
    if (config.platformCookie) {
      this.platformCookie = config.platformCookie;
    }
    this.initialized = true;
  }

  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error("Provider not initialized. Call initialize() first.");
    }
  }

  /**
   * 余额查询：优先走平台 API 获取钱包余额和总消耗，
   * 失败时降级到 /user/balance�?   */
  async getBalance(): Promise<BalanceResponse> {
    this.ensureInitialized();

    try {
      const raw = await requestJson<DeepSeekPlatformResponse>(
        "https://platform.deepseek.com/api/v0/users/get_user_summary",
        this.apiKey,
        15000,
        this.platformCookie,
      );

      // 逐层校验响应格式（兼容官方格式）
      if (!raw || raw.code === undefined) {
        throw new Error("Empty platform API response");
      }
      if (raw.code !== 0) {
        throw new Error(`Platform API error: ${raw.msg || "unknown"} (code ${raw.code})`);
      }
      if (!raw.data) {
        throw new Error("Missing data field in platform API response");
      }
      if (raw.data.biz_code !== 0) {
        throw new Error(
          `Platform biz error: ${raw.data.biz_msg || "unknown"} (biz_code ${raw.data.biz_code})`,
        );
      }

      const bizData = raw.data.biz_data;
      if (!bizData) {
        throw new Error("Unexpected platform API response format �?missing biz_data");
      }

      const normalBalance = bizData.normal_wallets?.[0]?.balance;
      const totalCost = bizData.total_costs?.[0]?.amount;

      return {
        success: true,
        data: {
          availableBalance: normalBalance ? Number(normalBalance) : 0,
          currency: bizData.normal_wallets?.[0]?.currency ?? "CNY",
          totalSpent: totalCost ? Number(totalCost) : 0,
          rawMeta: raw as unknown as Record<string, unknown>,
        },
      };
    } catch {
      // 降级�?/user/balance
      try {
        const fallback = await requestJson<DeepSeekBalanceResponse>(
          `${this.baseUrl}/user/balance`,
          this.apiKey,
          10000,
        );
        const info = fallback.balance_infos[0];
        return {
          success: true,
          data: {
            availableBalance: Number.parseFloat(info.total_balance),
            currency: "CNY",
            totalSpent: 0,
            rawMeta: fallback as unknown as Record<string, unknown>,
          },
        };
      } catch (e) {
        return { success: false, error: e instanceof Error ? e.message : "Unknown error" };
      }
    }
  }

  /**
   * 用量查询：优先走平台 API，失败时降级�?api.deepseek.com�?   * 返回月度 Token 消耗、费用等汇总数据�?   * 每日趋势由路由层通过快照机制计算填充�?   */
  async getUsage(options?: {
    startDate?: Date;
    endDate?: Date;
  }): Promise<UsageResponse> {
    this.ensureInitialized();

    // 优先：平�?API（数据更全）
    try {
      return await this.getUsageFromPlatform();
    } catch (platformErr) {
      const msg = platformErr instanceof Error ? platformErr.message : String(platformErr);
      // 只对网络/拦截类错误降级，不做静默吞并
      console.warn(`[DeepSeek] Platform API failed, falling back to public API: ${msg}`);
    }

    // 降级：api.deepseek.com（兼容性好，但数据少）
    return this.getUsageFromApi();
  }

  /**
   * �?platform.deepseek.com 获取用量（含月度 Token 和费用）�?   */
  private async getUsageFromPlatform(): Promise<UsageResponse> {
    const raw = await requestJson<DeepSeekPlatformResponse>(
      "https://platform.deepseek.com/api/v0/users/get_user_summary",
      this.apiKey,
      15000,
      this.platformCookie,
    );

    // 逐层校验响应格式
    if (!raw || raw.code === undefined) {
      throw new Error("Empty platform API response");
    }
    if (raw.code !== 0) {
      throw new Error(`Platform API error: ${raw.msg || "unknown"} (code ${raw.code})`);
    }
    if (!raw.data) {
      throw new Error("Missing data field in platform API response");
    }
    if (raw.data.biz_code !== 0) {
      throw new Error(
        `Platform biz error: ${raw.data.biz_msg || "unknown"} (biz_code ${raw.data.biz_code})`,
      );
    }

    const bizData = raw.data.biz_data;
    if (!bizData) {
      throw new Error("Unexpected platform API response format �?missing biz_data");
    }

    const monthlyTokens = Number(bizData.monthly_token_usage ?? bizData.monthly_usage ?? "0");
    const monthlyCost = bizData.monthly_costs?.[0]?.amount
      ? Number(bizData.monthly_costs[0].amount)
      : 0;
    const totalUsage = bizData.total_usage ? Number(bizData.total_usage) : undefined;

    return {
      success: true,
      data: {
        records: [],
        tokenUsage: {
          totalTokens: monthlyTokens,
          promptTokens: 0,
          completionTokens: 0,
          dailyTrend: [],           // 由路由层通过快照填充
          monthlyCost,
          totalUsage,
          trendSource: "estimated", // 默认值，路由层用快照覆盖
        },
      },
    };
  }

  /**
   * 降级：从 api.deepseek.com/user/balance 获取有限用量数据�?   * 该端点不返回月度费用，仅返回总余额�?   */
  private async getUsageFromApi(): Promise<UsageResponse> {
    try {
      const fallback = await requestJson<DeepSeekBalanceResponse>(
        `${this.baseUrl}/user/balance`,
        this.apiKey,
        10000,
      );
      const info = fallback.balance_infos?.[0];
      if (!info) {
        throw new Error("Unexpected balance API response format");
      }
      return {
        success: true,
        data: {
          records: [],
          tokenUsage: {
            totalTokens: 0,
            promptTokens: 0,
            completionTokens: 0,
            dailyTrend: [],
            monthlyCost: 0,
            trendSource: "estimated",
          },
        },
      };
    } catch (e) {
      return {
        success: false,
        error: e instanceof Error ? e.message : "Unknown error",
      };
    }
  }

  async validateApiKey(): Promise<boolean> {
    this.ensureInitialized();
    try {
      const res = await fetch(`${this.baseUrl}/user/balance`, {
        headers: { Authorization: `Bearer ${this.apiKey}`, Accept: "application/json" },
      });
      if (!res.ok) return false;
      const body = await res.json() as Record<string, unknown>;
      return Array.isArray(body.balance_infos);
    } catch {
      return false;
    }
  }
}

// ---- 类型定义 ----

interface DeepSeekBalanceResponse {
  balance_infos: { total_balance: string; granted_balance: string; topped_up_balance: string }[];
  is_available: boolean;
}

interface DeepSeekPlatformResponse {
  code: number;
  msg: string;
  data?: {
    biz_code: number;
    biz_msg: string;
    biz_data?: {
      current_token?: number;
      monthly_usage?: string;
      total_usage?: number;
      normal_wallets?: { currency: string; balance: string; token_estimation: string }[];
      bonus_wallets?: { currency: string; balance: string; token_estimation: string }[];
      total_available_token_estimation?: string;
      monthly_costs?: { currency: string; amount: string }[];
      monthly_token_usage?: string;
      total_costs?: { currency: string; amount: string }[];
    };
  };
}
// ---- 辅助函数 ----

async function requestJson<T>(
  url: string,
  apiKey: string,
  timeoutMs = 10000,
  cookie?: string,
): Promise<T> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    Accept: "application/json, */*",
    "Accept-Encoding": "gzip, deflate, br",
    "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
    "Cache-Control": "no-cache",
    Referer: "https://platform.deepseek.com/usage",
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36",
  };
  if (cookie) {
    headers["Cookie"] = cookie;
  }

  const res = await fetch(url, {
    headers,
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`DeepSeek API error (${res.status}): ${text.slice(0, 200)}`);
  }

  // 检查响应是否是 JSON（防止被拦截返回 HTML）
  const contentType = res.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json") && !contentType.includes("text/json")) {
    const text = await res.text();
    throw new Error(`Unexpected content-type "${contentType}": ${text.slice(0, 200)}`);
  }

  return res.json() as Promise<T>;
}

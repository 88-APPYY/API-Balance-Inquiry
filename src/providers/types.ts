export enum ProviderType {
  DeepSeek = "deepseek",
  OpenAI = "openai",
  ZhiPu = "zhipu",
  BaiChuan = "baichuan",
}

export interface BalanceInfo {
  availableBalance: number;
  currency: string;
  totalSpent: number;
  rawMeta?: Record<string, unknown>;
}

export interface UsageRecord {
  id: string;
  model: string;
  tokens: number;
  timestamp: string;
  type: string;
  cost?: number;
}

export interface DailyTrend {
  date: string;
  tokens: number;
  cost?: number;
}

export interface TokenUsage {
  totalTokens: number;
  promptTokens: number;
  completionTokens: number;
  dailyTrend: DailyTrend[];
  /** 来自 API 的月度总费用 */
  monthlyCost?: number;
  /** All-time 总用量 (如果 API 提供) */
  totalUsage?: number;
  /** 趋势数据来源：真实增量 / 月度估算 */
  trendSource?: "real" | "estimated";
}

export interface BalanceResponse {
  success: boolean;
  data?: BalanceInfo;
  error?: string;
}

export interface UsageResponse {
  success: boolean;
  data?: {
    records: UsageRecord[];
    tokenUsage: TokenUsage;
  };
  error?: string;
}

export interface ProviderConfig {
  apiKey: string;
  baseUrl?: string;
  /** 平台 Cookie（用于访问 platform.deepseek.com 通过 WAF） */
  platformCookie?: string;
  [key: string]: unknown;
}

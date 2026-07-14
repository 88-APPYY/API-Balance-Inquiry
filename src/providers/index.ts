import { ProviderRegistry } from "./registry";
import { ProviderType } from "./types";
import { DeepSeekProvider } from "./deepseek";

// Register DeepSeek provider on module load
ProviderRegistry.register(ProviderType.DeepSeek, DeepSeekProvider);

export { ProviderType } from "./types";
export type {
  BalanceInfo,
  BalanceResponse,
  DailyTrend,
  ProviderConfig,
  TokenUsage,
  UsageRecord,
  UsageResponse,
} from "./types";
export { ProviderRegistry } from "./registry";
export type { IProvider } from "./IProvider";
export { DeepSeekProvider } from "./deepseek";

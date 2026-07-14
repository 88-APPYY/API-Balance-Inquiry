import type { BalanceResponse, ProviderConfig, ProviderType, UsageResponse } from "./types";

export interface IProvider {
  readonly type: ProviderType;

  initialize(config: ProviderConfig): Promise<void>;

  getBalance(): Promise<BalanceResponse>;

  getUsage(options?: {
    startDate?: Date;
    endDate?: Date;
  }): Promise<UsageResponse>;

  validateApiKey(): Promise<boolean>;
}

import type { IProvider } from "./IProvider";
import type { ProviderConfig } from "./types";
import { ProviderType } from "./types";

export class ProviderRegistry {
  private static providers = new Map<ProviderType, new () => IProvider>();

  static register(type: ProviderType, ctor: new () => IProvider): void {
    this.providers.set(type, ctor);
  }

  static async createProvider(
    type: ProviderType,
    config: ProviderConfig,
  ): Promise<IProvider> {
    const ctor = this.providers.get(type);
    if (!ctor) {
      throw new Error(`Unsupported provider type: ${type}`);
    }
    const instance = new ctor();
    await instance.initialize(config);
    return instance;
  }
}

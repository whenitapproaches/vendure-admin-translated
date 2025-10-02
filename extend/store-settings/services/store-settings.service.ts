import { Injectable } from '@nestjs/common';
import { SettingsService } from '@vendure/core';

@Injectable()
export class StoreSettingsService {
  constructor(private settingsService: SettingsService) {}

  async get(key: string): Promise<string | undefined> {
    return this.settingsService.get(key);
  }

  async set(key: string, value: string): Promise<void> {
    await this.settingsService.set(key, value);
  }

  async delete(key: string): Promise<void> {
    await this.settingsService.delete(key);
  }
}

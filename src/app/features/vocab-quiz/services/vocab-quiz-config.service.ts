import { Injectable } from '@angular/core';
import { VocabQuizConfig, DEFAULT_VOCAB_CONFIG } from '../models';

@Injectable({
  providedIn: 'root',
})
export class VocabQuizConfigService {
  private readonly STORAGE_KEY = 'vocab-quiz-config';

  constructor() {}

  /**
   * Get saved configuration or default
   */
  getConfig(): VocabQuizConfig {
    try {
      const saved = localStorage.getItem(this.STORAGE_KEY);
      if (saved) {
        const config = JSON.parse(saved);
        // Validate the loaded config
        if (this.isValidConfig(config)) {
          return config;
        }
      }
    } catch (error) {
      console.error('Error loading vocab quiz config:', error);
    }
    return { ...DEFAULT_VOCAB_CONFIG };
  }

  /**
   * Update and save configuration
   */
  updateConfig(config: VocabQuizConfig): void {
    if (!this.isValidConfig(config)) {
      console.error('Invalid vocab quiz config, not saving');
      return;
    }
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(config));
  }

  /**
   * Reset to default configuration
   */
  resetToDefaults(): void {
    localStorage.setItem(
      this.STORAGE_KEY,
      JSON.stringify(DEFAULT_VOCAB_CONFIG)
    );
  }

  /**
   * Validate configuration
   */
  private isValidConfig(config: any): boolean {
    return (
      config &&
      typeof config.verbCount === 'number' &&
      config.verbCount >= 5 &&
      config.verbCount <= 100 &&
      Array.isArray(config.difficultyLevels) &&
      config.difficultyLevels.length > 0 &&
      config.difficultyLevels.every((l: any) => [1, 2, 3].includes(l)) &&
      typeof config.includeAllTypes === 'boolean'
    );
  }
}

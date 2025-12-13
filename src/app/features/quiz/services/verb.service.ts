import { Injectable } from '@angular/core';
import { CacheService } from '../../../core/services/cache.service';
import { Verb, VerbFilters } from '../../../core/models';

@Injectable({
  providedIn: 'root',
})
export class VerbService {
  constructor(private cacheService: CacheService) {
    console.log('📖 VerbService initialized');
  }

  /**
   * Get verbs matching the filter criteria
   * If no filters provided, returns all verbs
   */
  getVerbs(filters?: VerbFilters): Verb[] {
    if (!filters) {
      return this.cacheService.getAllVerbs();
    }

    return this.cacheService.filterVerbs(filters);
  }

  /**
   * Get a specific verb by its infinitive form
   */
  getVerbByInfinitive(infinitive: string): Verb | undefined {
    return this.cacheService.getVerbByInfinitive(infinitive);
  }

  /**
   * Search verbs by text query (searches infinitive and english translation)
   */
  searchVerbs(query: string): Verb[] {
    return this.cacheService.searchVerbs(query);
  }

  /**
   * Get a random selection of verbs matching the criteria
   * Uses Fisher-Yates shuffle for true randomization
   */
  getRandomVerbs(count: number, filters?: VerbFilters): Verb[] {
    return this.cacheService.getRandomVerbs(count, filters);
  }

  /**
   * Get verbs grouped by type
   */
  getVerbsByType(): Record<string, Verb[]> {
    return this.cacheService.getVerbsByType();
  }

  /**
   * Get verbs grouped by difficulty level
   */
  getVerbsByDifficulty(): Record<number, Verb[]> {
    return this.cacheService.getVerbsByDifficulty();
  }

  /**
   * Get a specific conjugation for a verb
   * Returns the conjugated form or undefined if not found
   */
  getConjugation(
    verb: Verb,
    tense: string,
    person: string
  ): string | undefined {
    // Navigate the nested conjugations structure
    const tenseConjugations = verb.conjugations[tense];

    if (!tenseConjugations) {
      console.warn(
        `⚠️ Tense "${tense}" not found for verb "${verb.infinitive}"`
      );
      return undefined;
    }

    const conjugatedForm = tenseConjugations[person];

    if (!conjugatedForm) {
      console.warn(
        `⚠️ Person "${person}" not found for verb "${verb.infinitive}" in tense "${tense}"`
      );
      return undefined;
    }

    return conjugatedForm;
  }

  /**
   * Get all available tenses from cached verbs
   */
  getAvailableTenses(): string[] {
    const allVerbs = this.cacheService.getAllVerbs();

    if (allVerbs.length === 0) {
      return [];
    }

    // Get unique tenses from all verbs
    const tenseSet = new Set<string>();

    allVerbs.forEach((verb) => {
      Object.keys(verb.conjugations).forEach((tense) => {
        tenseSet.add(tense);
      });
    });

    return Array.from(tenseSet).sort();
  }

  /**
   * Get all available verb types from cached verbs
   */
  getAvailableVerbTypes(): string[] {
    const allVerbs = this.cacheService.getAllVerbs();
    const typeSet = new Set<string>();

    allVerbs.forEach((verb) => {
      typeSet.add(verb.verb_type);
    });

    return Array.from(typeSet).sort();
  }

  /**
   * Get all available difficulty levels from cached verbs
   */
  getAvailableDifficultyLevels(): number[] {
    const allVerbs = this.cacheService.getAllVerbs();
    const levelSet = new Set<number>();

    allVerbs.forEach((verb) => {
      levelSet.add(verb.difficulty_level);
    });

    return Array.from(levelSet).sort((a, b) => a - b);
  }

  /**
   * Get count of verbs matching criteria
   */
  getVerbCount(filters?: VerbFilters): number {
    return this.getVerbs(filters).length;
  }

  /**
   * Check if cache has enough verbs for the requested count
   */
  hasEnoughVerbs(requiredCount: number, filters?: VerbFilters): boolean {
    const availableCount = this.getVerbCount(filters);

    if (availableCount < requiredCount) {
      console.warn(
        `⚠️ Not enough verbs: requested ${requiredCount}, available ${availableCount}`
      );
      return false;
    }

    return true;
  }

  /**
   * Validate that a verb has all required conjugations for a quiz
   */
  hasRequiredConjugations(
    verb: Verb,
    tenses: string[],
    persons: string[]
  ): boolean {
    for (const tense of tenses) {
      const tenseConjugations = verb.conjugations[tense];

      if (!tenseConjugations) {
        return false;
      }

      for (const person of persons) {
        if (!tenseConjugations[person]) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Get verbs that have all required conjugations
   * Useful for ensuring quiz questions can be generated
   */
  getVerbsWithConjugations(
    tenses: string[],
    persons: string[],
    filters?: VerbFilters
  ): Verb[] {
    const allVerbs = this.getVerbs(filters);

    return allVerbs.filter((verb) =>
      this.hasRequiredConjugations(verb, tenses, persons)
    );
  }
}

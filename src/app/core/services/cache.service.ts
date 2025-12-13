import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { Verb, VerbFilters } from '../models';
import { SupabaseService } from './supabase.service';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class CacheService {
  private readonly supabaseService = inject(SupabaseService);

  // In-memory verb storage using Map for O(1) lookup by infinitive
  private verbsMap: Map<string, Verb> = new Map();

  // Array for easy iteration and filtering
  private verbsArray: Verb[] = [];

  // Initialization flag
  private isInitialized = false;

  constructor() {
    if (environment.enableDebugLogging) {
      console.log('💾 Cache Service created');
    }
  }

  /**
   * Initialize cache by loading all verbs from Supabase
   * Should be called ONCE on app startup
   *
   * @returns Promise<void>
   */
  async initializeCache(): Promise<void> {
    if (this.isInitialized) {
      if (environment.enableDebugLogging) {
        console.log('ℹ️ Cache already initialized, skipping...');
      }
      return;
    }

    try {
      if (environment.enableDebugLogging) {
        console.log('🔄 Initializing verb cache...');
      }

      // Convert Observable to Promise
      const verbs = await firstValueFrom(this.supabaseService.loadAllVerbs());

      if (!verbs || verbs.length === 0) {
        throw new Error('No verbs loaded from Supabase');
      }

      // Store verbs in both Map (for fast lookup) and Array (for iteration)
      this.verbsArray = verbs;
      this.verbsMap.clear();

      verbs.forEach((verb) => {
        this.verbsMap.set(verb.infinitive, verb);
      });

      this.isInitialized = true;

      if (environment.enableDebugLogging) {
        console.log(
          `✅ Cache initialized successfully with ${verbs.length} verbs`
        );
      }
    } catch (error) {
      console.error('❌ Failed to initialize cache:', error);

      // Try loading from fallback JSON in assets (optional)
      if (environment.enableDebugLogging) {
        console.log('🔄 Attempting to load from fallback data...');
      }

      try {
        await this.loadFallbackData();
        this.isInitialized = true;

        if (environment.enableDebugLogging) {
          console.log('✅ Loaded verbs from fallback data');
        }
      } catch (fallbackError) {
        console.error('❌ Failed to load fallback data:', fallbackError);
        throw new Error(
          'Cannot initialize app: No verb data available. Please check your internet connection and try again.'
        );
      }
    }
  }

  /**
   * Load fallback verb data from JSON file in assets
   * Used when Supabase is unavailable
   *
   * @returns Promise<void>
   */
  private async loadFallbackData(): Promise<void> {
    try {
      const response = await fetch('/assets/verbs-fallback.json');

      if (!response.ok) {
        throw new Error('Failed to load fallback data');
      }

      const verbs: Verb[] = await response.json();

      if (!verbs || verbs.length === 0) {
        throw new Error('Fallback data is empty');
      }

      this.verbsArray = verbs;
      this.verbsMap.clear();

      verbs.forEach((verb) => {
        this.verbsMap.set(verb.infinitive, verb);
      });

      if (environment.enableDebugLogging) {
        console.log(`✅ Loaded ${verbs.length} verbs from fallback`);
      }
    } catch (error) {
      throw new Error(`Failed to load fallback data: ${error}`);
    }
  }

  /**
   * Check if cache is ready for use
   * Used by route guards
   *
   * @returns boolean
   */
  isCacheReady(): boolean {
    return this.isInitialized;
  }

  /**
   * Get all verbs from cache
   * Synchronous - returns immediately
   *
   * @returns Verb[]
   */
  getAllVerbs(): Verb[] {
    if (!this.isInitialized) {
      console.warn('⚠️ Cache not initialized yet');
      return [];
    }

    return [...this.verbsArray]; // Return copy to prevent mutation
  }

  /**
   * Get a single verb by its infinitive form
   * Synchronous - O(1) lookup time
   *
   * @param infinitive - German infinitive (e.g., "gehen", "sein")
   * @returns Verb | undefined
   */
  getVerbByInfinitive(infinitive: string): Verb | undefined {
    if (!this.isInitialized) {
      console.warn('⚠️ Cache not initialized yet');
      return undefined;
    }

    return this.verbsMap.get(infinitive);
  }

  /**
   * Filter verbs by various criteria
   * Synchronous - very fast with in-memory data
   *
   * @param criteria - Filter criteria
   * @returns Verb[]
   */
  filterVerbs(criteria: VerbFilters): Verb[] {
    if (!this.isInitialized) {
      console.warn('⚠️ Cache not initialized yet');
      return [];
    }

    let filtered = [...this.verbsArray];

    // Filter by verb types
    if (criteria.verbTypes && criteria.verbTypes.length > 0) {
      filtered = filtered.filter((verb) =>
        criteria.verbTypes!.includes(verb.verb_type)
      );
    }

    // Filter by difficulty levels
    if (criteria.difficultyLevels && criteria.difficultyLevels.length > 0) {
      filtered = filtered.filter((verb) =>
        criteria.difficultyLevels!.includes(verb.difficulty_level)
      );
    }

    // Filter by specific infinitives
    if (criteria.infinitives && criteria.infinitives.length > 0) {
      filtered = filtered.filter((verb) =>
        criteria.infinitives!.includes(verb.infinitive)
      );
    }

    return filtered;
  }

  /**
   * Search verbs by text query
   * Searches in infinitive and english_translation fields
   * Case-insensitive
   *
   * @param query - Search text
   * @returns Verb[]
   */
  searchVerbs(query: string): Verb[] {
    if (!this.isInitialized) {
      console.warn('⚠️ Cache not initialized yet');
      return [];
    }

    if (!query || query.trim() === '') {
      return this.getAllVerbs();
    }

    const lowerQuery = query.toLowerCase().trim();

    return this.verbsArray.filter(
      (verb) =>
        verb.infinitive.toLowerCase().includes(lowerQuery) ||
        verb.english_translation.toLowerCase().includes(lowerQuery)
    );
  }

  /**
   * Get random verbs from cache
   * Optionally filter by criteria first
   *
   * @param count - Number of random verbs to return
   * @param criteria - Optional filter criteria
   * @returns Verb[]
   */
  getRandomVerbs(count: number, criteria?: VerbFilters): Verb[] {
    if (!this.isInitialized) {
      console.warn('⚠️ Cache not initialized yet');
      return [];
    }

    // Get verbs to select from
    let verbs = criteria ? this.filterVerbs(criteria) : [...this.verbsArray];

    // If not enough verbs, return all available
    if (verbs.length <= count) {
      return this.shuffleArray([...verbs]);
    }

    // Shuffle and take first 'count' verbs
    const shuffled = this.shuffleArray(verbs);
    return shuffled.slice(0, count);
  }

  /**
   * Shuffle array using Fisher-Yates algorithm
   * Creates a copy - doesn't mutate original
   *
   * @param array - Array to shuffle
   * @returns T[] - Shuffled copy
   */
  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array]; // Create copy

    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]; // Swap
    }

    return shuffled;
  }

  /**
   * Get count of verbs in cache
   * Useful for debugging and statistics
   *
   * @returns number
   */
  getVerbCount(): number {
    return this.verbsArray.length;
  }

  /**
   * Get verbs grouped by type
   * Useful for statistics display
   *
   * @returns Record<string, Verb[]>
   */
  getVerbsByType(): Record<string, Verb[]> {
    if (!this.isInitialized) {
      return {};
    }

    const grouped: Record<string, Verb[]> = {
      weak: [],
      strong: [],
      irregular: [],
      modal: [],
    };

    this.verbsArray.forEach((verb) => {
      if (grouped[verb.verb_type]) {
        grouped[verb.verb_type].push(verb);
      }
    });

    return grouped;
  }

  /**
   * Get verbs grouped by difficulty level
   * Useful for progressive learning
   *
   * @returns Record<number, Verb[]>
   */
  getVerbsByDifficulty(): Record<number, Verb[]> {
    if (!this.isInitialized) {
      return {};
    }

    const grouped: Record<number, Verb[]> = {};

    this.verbsArray.forEach((verb) => {
      if (!grouped[verb.difficulty_level]) {
        grouped[verb.difficulty_level] = [];
      }
      grouped[verb.difficulty_level].push(verb);
    });

    return grouped;
  }

  /**
   * Clear cache (for testing or reset)
   * Not recommended for production use
   */
  clearCache(): void {
    this.verbsMap.clear();
    this.verbsArray = [];
    this.isInitialized = false;

    if (environment.enableDebugLogging) {
      console.log('🗑️ Cache cleared');
    }
  }
}

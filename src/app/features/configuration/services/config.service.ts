import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { TestConfig, DEFAULT_TEST_CONFIG } from '../../../core/models';
import { StorageService } from '../../../core/services/storage.service';

@Injectable({
  providedIn: 'root',
})
export class ConfigService {
  private configSubject: BehaviorSubject<TestConfig>;
  public config$: Observable<TestConfig>;

  constructor(private storageService: StorageService) {
    console.log('⚙️ ConfigService initializing...');

    // Load saved config or use default
    const savedConfig = this.storageService.getConfig();
    const initialConfig = savedConfig || this.getDefaultConfig();

    // Initialize BehaviorSubject with config
    this.configSubject = new BehaviorSubject<TestConfig>(initialConfig);
    this.config$ = this.configSubject.asObservable();

    console.log('✅ ConfigService initialized with config:', initialConfig);
  }

  private getDefaultConfig(): TestConfig {
    return { ...DEFAULT_TEST_CONFIG };
  }

  getConfig(): TestConfig {
    return this.configSubject.value;
  }

  updateConfig(updates: Partial<TestConfig>): void {
    console.log('🔄 Updating config with:', updates);

    // Merge current config with updates
    const newConfig: TestConfig = {
      ...this.configSubject.value,
      ...updates,
    };

    // Validate the new configuration
    if (!this.validateConfig(newConfig)) {
      console.error('❌ Invalid configuration, not saving');
      return;
    }

    // Save to localStorage
    try {
      this.storageService.saveConfig(newConfig);

      // Emit new config to subscribers
      this.configSubject.next(newConfig);

      console.log('✅ Config updated successfully:', newConfig);
    } catch (error) {
      console.error('❌ Error updating config:', error);
    }
  }

  resetToDefaults(): void {
    console.log('🔄 Resetting config to defaults...');

    const defaultConfig = this.getDefaultConfig();

    // Save to localStorage
    this.storageService.saveConfig(defaultConfig);

    // Emit to subscribers
    this.configSubject.next(defaultConfig);

    console.log('✅ Config reset to defaults');
  }

  private validateConfig(config: TestConfig): boolean {
    // Check if all required fields exist
    if (!config.tenses || config.tenses.length === 0) {
      console.error('❌ Validation failed: No tenses selected');
      return false;
    }

    if (!config.verbTypes || config.verbTypes.length === 0) {
      console.error('❌ Validation failed: No verb types selected');
      return false;
    }

    if (!config.persons || config.persons.length === 0) {
      console.error('❌ Validation failed: No persons selected');
      return false;
    }

    if (!config.questionCount || config.questionCount < 1) {
      console.error('❌ Validation failed: Invalid question count');
      return false;
    }

    if (config.questionCount > 100) {
      console.warn('⚠️ Question count is very high:', config.questionCount);
      // Allow but warn
    }

    // Validate tenses (check against known tenses)
    const validTenses = [
      'präsens',
      'präteritum',
      'perfekt',
      'plusquamperfekt',
      'futur',
    ];
    const invalidTenses = config.tenses.filter((t) => !validTenses.includes(t));
    if (invalidTenses.length > 0) {
      console.error('❌ Validation failed: Invalid tenses:', invalidTenses);
      return false;
    }

    // Validate verb types
    const validVerbTypes = ['weak', 'strong', 'irregular', 'modal'];
    const invalidTypes = config.verbTypes.filter(
      (vt) => !validVerbTypes.includes(vt)
    );
    if (invalidTypes.length > 0) {
      console.error('❌ Validation failed: Invalid verb types:', invalidTypes);
      return false;
    }

    // Validate persons
    const validPersons = ['ich', 'du', 'er', 'wir', 'ihr', 'sie'];
    const invalidPersons = config.persons.filter(
      (p) => !validPersons.includes(p)
    );
    if (invalidPersons.length > 0) {
      console.error('❌ Validation failed: Invalid persons:', invalidPersons);
      return false;
    }

    // Validate difficulty levels if provided
    if (config.difficultyLevels) {
      const invalidLevels = config.difficultyLevels.filter(
        (level) => level < 1 || level > 5
      );
      if (invalidLevels.length > 0) {
        console.error(
          '❌ Validation failed: Invalid difficulty levels:',
          invalidLevels
        );
        return false;
      }
    }

    console.log('✅ Config validation passed');
    return true;
  }

  // Update specific tenses
  setTenses(tenses: string[]): void {
    this.updateConfig({ tenses });
  }

  // Toggle a single tense
  toggleTense(tense: string): void {
    const currentTenses = this.getConfig().tenses;
    const newTenses = currentTenses.includes(tense)
      ? currentTenses.filter((t) => t !== tense)
      : [...currentTenses, tense];

    if (newTenses.length > 0) {
      this.setTenses(newTenses);
    } else {
      console.warn('⚠️ Cannot remove all tenses');
    }
  }

  // Update verb types
  setVerbTypes(verbTypes: string[]): void {
    this.updateConfig({ verbTypes });
  }

  // Toggle a single verb type
  toggleVerbType(verbType: string): void {
    const currentTypes = this.getConfig().verbTypes;
    const newTypes = currentTypes.includes(verbType)
      ? currentTypes.filter((vt) => vt !== verbType)
      : [...currentTypes, verbType];

    if (newTypes.length > 0) {
      this.setVerbTypes(newTypes);
    } else {
      console.warn('⚠️ Cannot remove all verb types');
    }
  }

  // Update persons
  setPersons(persons: string[]): void {
    this.updateConfig({ persons });
  }

  // Toggle a single person
  togglePerson(person: string): void {
    const currentPersons = this.getConfig().persons;
    const newPersons = currentPersons.includes(person)
      ? currentPersons.filter((p) => p !== person)
      : [...currentPersons, person];

    if (newPersons.length > 0) {
      this.setPersons(newPersons);
    } else {
      console.warn('⚠️ Cannot remove all persons');
    }
  }

  // Update question count
  setQuestionCount(count: number): void {
    if (count >= 1 && count <= 100) {
      this.updateConfig({ questionCount: count });
    } else {
      console.error('❌ Invalid question count:', count);
    }
  }

  // Update difficulty levels
  setDifficultyLevels(levels: number[]): void {
    this.updateConfig({ difficultyLevels: levels });
  }

  // Toggle a difficulty level
  toggleDifficultyLevel(level: number): void {
    const currentLevels = this.getConfig().difficultyLevels || [];
    const newLevels = currentLevels.includes(level)
      ? currentLevels.filter((l) => l !== level)
      : [...currentLevels, level];

    this.setDifficultyLevels(newLevels);
  }

  // Update specific verbs
  setSpecificVerbs(verbs: string[]): void {
    this.updateConfig({ specificVerbs: verbs });
  }
}

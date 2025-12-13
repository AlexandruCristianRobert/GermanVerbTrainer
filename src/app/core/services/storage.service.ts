import { Injectable } from '@angular/core';
import { TestResult, TestConfig } from '../models';

@Injectable({
  providedIn: 'root',
})
export class StorageService {
  private readonly TEST_RESULTS_KEY = 'german-verb-trainer-results';
  private readonly CONFIG_KEY = 'german-verb-trainer-config';
  private readonly SYNC_STATUS_KEY = 'german-verb-trainer-sync-status';
  private readonly LAST_SYNC_KEY = 'german-verb-trainer-last-sync';

  constructor() {
    console.log('📦 StorageService initialized');
  }
  // Test Results methods
  saveTestResult(result: TestResult): void {
    try {
      const results = this.getTestResults();
      results.push(result);
      localStorage.setItem(this.TEST_RESULTS_KEY, JSON.stringify(results));
      console.log('✅ Test result saved:', result.id);
    } catch (error) {
      if (error instanceof Error && error.name === 'QuotaExceededError') {
        console.error('❌ localStorage quota exceeded. Cannot save result.');
        throw new Error('Storage quota exceeded. Please delete old results.');
      }
      console.error('❌ Error saving test result:', error);
      throw error;
    }
  }

  getTestResults(): TestResult[] {
    try {
      const data = localStorage.getItem(this.TEST_RESULTS_KEY);
      if (!data) {
        return [];
      }

      const results = JSON.parse(data) as TestResult[];

      // Sort by test_date descending (newest first)
      return results.sort((a, b) => {
        const dateA = new Date(a.test_date).getTime();
        const dateB = new Date(b.test_date).getTime();
        return dateB - dateA;
      });
    } catch (error) {
      console.error('❌ Error parsing test results from localStorage:', error);
      return [];
    }
  }

  updateTestResult(id: string, updates: Partial<TestResult>): void {
    try {
      const results = this.getTestResults();
      const index = results.findIndex((r) => r.id === id);

      if (index === -1) {
        console.warn('⚠️ Test result not found for update:', id);
        return;
      }

      results[index] = { ...results[index], ...updates };
      localStorage.setItem(this.TEST_RESULTS_KEY, JSON.stringify(results));
      console.log('✅ Test result updated:', id);
    } catch (error) {
      console.error('❌ Error updating test result:', error);
      throw error;
    }
  }

  deleteTestResult(id: string): void {
    try {
      const results = this.getTestResults();
      const filtered = results.filter((r) => r.id !== id);

      if (filtered.length === results.length) {
        console.warn('⚠️ Test result not found for deletion:', id);
        return;
      }

      localStorage.setItem(this.TEST_RESULTS_KEY, JSON.stringify(filtered));
      console.log('✅ Test result deleted:', id);
    } catch (error) {
      console.error('❌ Error deleting test result:', error);
      throw error;
    }
  }

  // Configuration methods
  saveConfig(config: TestConfig): void {
    try {
      localStorage.setItem(this.CONFIG_KEY, JSON.stringify(config));
      console.log('✅ Configuration saved:', config);
    } catch (error) {
      console.error('❌ Error saving configuration:', error);
      throw error;
    }
  }

  getConfig(): TestConfig | null {
    try {
      const data = localStorage.getItem(this.CONFIG_KEY);
      if (!data) {
        return null;
      }

      return JSON.parse(data) as TestConfig;
    } catch (error) {
      console.error('❌ Error parsing configuration from localStorage:', error);
      return null;
    }
  }

  // Utility methods
  clearAllData(): void {
    try {
      localStorage.removeItem(this.TEST_RESULTS_KEY);
      localStorage.removeItem(this.CONFIG_KEY);
      localStorage.removeItem(this.SYNC_STATUS_KEY);
      localStorage.removeItem(this.LAST_SYNC_KEY);
      console.log('✅ All storage data cleared');
    } catch (error) {
      console.error('❌ Error clearing storage:', error);
      throw error;
    }
  }

  exportToJSON(): string {
    try {
      const exportData = {
        results: this.getTestResults(),
        config: this.getConfig(),
        exportDate: new Date().toISOString(),
        version: '1.0',
      };

      return JSON.stringify(exportData, null, 2);
    } catch (error) {
      console.error('❌ Error exporting data:', error);
      throw error;
    }
  }

  importFromJSON(jsonString: string): void {
    try {
      const importData = JSON.parse(jsonString);

      // Validate structure
      if (!importData.results || !Array.isArray(importData.results)) {
        throw new Error(
          'Invalid import data: missing or invalid results array'
        );
      }

      // Import results
      if (importData.results.length > 0) {
        localStorage.setItem(
          this.TEST_RESULTS_KEY,
          JSON.stringify(importData.results)
        );
      }

      // Import config if present
      if (importData.config) {
        localStorage.setItem(
          this.CONFIG_KEY,
          JSON.stringify(importData.config)
        );
      }

      console.log('✅ Data imported successfully:', {
        resultsCount: importData.results.length,
        hasConfig: !!importData.config,
      });
    } catch (error) {
      console.error('❌ Error importing data:', error);
      throw new Error('Failed to import data. Please check the file format.');
    }
  }

  getLastSyncTime(): Date | null {
    try {
      const timestamp = localStorage.getItem(this.LAST_SYNC_KEY);
      return timestamp ? new Date(timestamp) : null;
    } catch (error) {
      console.error('❌ Error getting last sync time:', error);
      return null;
    }
  }

  saveLastSyncTime(date: Date): void {
    try {
      localStorage.setItem(this.LAST_SYNC_KEY, date.toISOString());
    } catch (error) {
      console.error('❌ Error saving last sync time:', error);
    }
  }

  getUnsyncedResultsCount(): number {
    const results = this.getTestResults();
    return results.filter((r) => !r.synced).length;
  }
}

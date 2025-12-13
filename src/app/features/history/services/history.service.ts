import { Injectable } from '@angular/core';
import { StorageService } from '../../../core/services/storage.service';
import { TestResult } from '../../../core/models';
import { HistoryFilters, Statistics } from '../models';

@Injectable({
  providedIn: 'root',
})
export class HistoryService {
  constructor(private storageService: StorageService) {}

  // ==================== BASIC RETRIEVAL ====================

  /**
   * Get full test history
   */
  getHistory(): TestResult[] {
    return this.storageService.getTestResults();
  }

  /**
   * Get test result by ID
   */
  getResultById(id: string): TestResult | undefined {
    const results = this.storageService.getTestResults();
    return results.find((r) => r.id === id);
  }

  /**
   * Get unsynced results only
   */
  getUnsyncedResults(): TestResult[] {
    return this.storageService.getTestResults().filter((r) => !r.synced);
  }

  /**
   * Get synced results only
   */
  getSyncedResults(): TestResult[] {
    return this.storageService.getTestResults().filter((r) => r.synced);
  }

  /**
   * Get most recent N results
   */
  getRecentResults(count: number): TestResult[] {
    const results = this.storageService.getTestResults();
    return results
      .sort(
        (a, b) =>
          new Date(b.test_date).getTime() - new Date(a.test_date).getTime()
      )
      .slice(0, count);
  }

  // ==================== FILTERING ====================

  /**
   * Filter history based on criteria
   */
  filterHistory(filters: HistoryFilters): TestResult[] {
    let results = this.storageService.getTestResults();

    // Filter by date range
    if (filters.dateFrom) {
      const fromTime = new Date(filters.dateFrom).getTime();
      results = results.filter(
        (r) => new Date(r.test_date).getTime() >= fromTime
      );
    }
    if (filters.dateTo) {
      const toTime = new Date(filters.dateTo).getTime();
      results = results.filter(
        (r) => new Date(r.test_date).getTime() <= toTime
      );
    }

    // Filter by score
    if (filters.minScore !== undefined) {
      results = results.filter((r) => r.percentage >= filters.minScore!);
    }
    if (filters.maxScore !== undefined) {
      results = results.filter((r) => r.percentage <= filters.maxScore!);
    }

    // Filter by tenses
    if (filters.tenses && filters.tenses.length > 0) {
      results = results.filter((r) =>
        filters.tenses!.some((tense) =>
          r.test_configuration.tenses.includes(tense)
        )
      );
    }

    // Filter by verb types
    if (filters.verbTypes && filters.verbTypes.length > 0) {
      results = results.filter((r) =>
        filters.verbTypes!.some((type) =>
          r.test_configuration.verbTypes.includes(type)
        )
      );
    }

    // Filter by difficulty levels
    if (filters.difficultyLevels && filters.difficultyLevels.length > 0) {
      results = results.filter(
        (r) =>
          r.test_configuration.difficultyLevels &&
          filters.difficultyLevels!.some((level) =>
            r.test_configuration.difficultyLevels!.includes(level)
          )
      );
    }

    // Filter by sync status
    if (filters.syncedOnly) {
      results = results.filter((r) => r.synced);
    }
    if (filters.unsyncedOnly) {
      results = results.filter((r) => !r.synced);
    }

    return results;
  }

  // ==================== STATISTICS ====================

  /**
   * Calculate comprehensive statistics from history
   */
  getStatistics(filters?: HistoryFilters): Statistics {
    const results = filters ? this.filterHistory(filters) : this.getHistory();

    if (results.length === 0) {
      return this.getEmptyStatistics();
    }

    // Basic statistics
    const totalTests = results.length;
    const totalQuestions = results.reduce(
      (sum, r) => sum + r.total_questions,
      0
    );
    const totalCorrect = results.reduce((sum, r) => sum + r.score, 0);
    const averageScore = totalCorrect / totalTests;
    const averagePercentage =
      results.reduce((sum, r) => sum + r.percentage, 0) / totalTests;

    const percentages = results.map((r) => r.percentage);
    const bestPercentage = Math.max(...percentages);
    const worstPercentage = Math.min(...percentages);

    const scores = results.map((r) => r.score);
    const bestScore = Math.max(...scores);
    const worstScore = Math.min(...scores);

    const durations = results
      .map((r) => r.duration_seconds || 0)
      .filter((d) => d > 0);
    const totalDuration = durations.reduce((sum, d) => sum + d, 0);
    const averageDuration =
      durations.length > 0 ? totalDuration / durations.length : 0;

    // Breakdown by tense
    const byTense = this.calculateBreakdownByTense(results);

    // Breakdown by verb type
    const byVerbType = this.calculateBreakdownByVerbType(results);

    // Breakdown by person
    const byPerson = this.calculateBreakdownByPerson(results);

    // Breakdown by difficulty
    const byDifficulty = this.calculateBreakdownByDifficulty(results);

    // Performance trend
    const trend = this.calculateTrend(results);

    return {
      totalTests,
      totalQuestions,
      totalCorrect,
      averageScore: Math.round(averageScore * 100) / 100,
      averagePercentage: Math.round(averagePercentage * 100) / 100,
      bestScore,
      worstScore,
      bestPercentage: Math.round(bestPercentage * 100) / 100,
      worstPercentage: Math.round(worstPercentage * 100) / 100,
      totalDuration,
      averageDuration: Math.round(averageDuration),
      byTense,
      byVerbType,
      byPerson,
      byDifficulty,
      trend,
    };
  }

  // ==================== DATA MANAGEMENT ====================

  /**
   * Delete a test result
   */
  deleteResult(id: string): void {
    this.storageService.deleteTestResult(id);
  }

  /**
   * Delete multiple results
   */
  deleteResults(ids: string[]): void {
    ids.forEach((id) => this.storageService.deleteTestResult(id));
  }

  /**
   * Clear all history
   */
  clearAllHistory(): void {
    const results = this.storageService.getTestResults();
    results.forEach((r) => this.storageService.deleteTestResult(r.id));
  }

  /**
   * Export history as JSON string
   */
  exportHistory(): string {
    return this.storageService.exportToJSON();
  }

  /**
   * Import history from JSON string
   */
  importHistory(jsonString: string): void {
    this.storageService.importFromJSON(jsonString);
  }

  // ==================== HELPER METHODS ====================

  private getEmptyStatistics(): Statistics {
    return {
      totalTests: 0,
      totalQuestions: 0,
      totalCorrect: 0,
      averageScore: 0,
      averagePercentage: 0,
      bestScore: 0,
      worstScore: 0,
      bestPercentage: 0,
      worstPercentage: 0,
      totalDuration: 0,
      averageDuration: 0,
      byTense: {},
      byVerbType: {},
      byPerson: {},
      byDifficulty: {},
      trend: {
        improving: false,
        recentAverage: 0,
        olderAverage: 0,
        changePercentage: 0,
      },
    };
  }

  private calculateBreakdownByTense(
    results: TestResult[]
  ): Statistics['byTense'] {
    const breakdown: Statistics['byTense'] = {};

    results.forEach((result) => {
      // Only process conjugation quiz results
      if (result.test_type !== 'conjugation') {
        return;
      }

      result.answers.forEach((answer) => {
        // Type guard: check if this is a conjugation answer
        if (!('tense' in answer)) {
          return;
        }

        const tense = answer.tense;
        if (!breakdown[tense]) {
          breakdown[tense] = {
            totalQuestions: 0,
            correctAnswers: 0,
            percentage: 0,
          };
        }
        breakdown[tense].totalQuestions++;
        if (answer.isCorrect) {
          breakdown[tense].correctAnswers++;
        }
      });
    });

    // Calculate percentages
    Object.keys(breakdown).forEach((tense) => {
      const data = breakdown[tense];
      data.percentage =
        data.totalQuestions > 0
          ? Math.round((data.correctAnswers / data.totalQuestions) * 10000) /
            100
          : 0;
    });

    return breakdown;
  }

  private calculateBreakdownByVerbType(
    results: TestResult[]
  ): Statistics['byVerbType'] {
    const breakdown: Statistics['byVerbType'] = {};

    results.forEach((result) => {
      // Only process conjugation quiz results
      if (result.test_type !== 'conjugation') {
        return;
      }

      result.answers.forEach((answer) => {
        // Type guard: check if this is a conjugation answer
        if (!('verb_type' in answer)) {
          return;
        }

        const verbType = answer.verb_type;

        // Skip if verb_type is undefined
        if (!verbType) {
          return;
        }

        if (!breakdown[verbType]) {
          breakdown[verbType] = {
            totalQuestions: 0,
            correctAnswers: 0,
            percentage: 0,
          };
        }
        breakdown[verbType].totalQuestions++;
        if (answer.isCorrect) {
          breakdown[verbType].correctAnswers++;
        }
      });
    });

    // Calculate percentages
    Object.keys(breakdown).forEach((verbType) => {
      const data = breakdown[verbType];
      data.percentage =
        data.totalQuestions > 0
          ? Math.round((data.correctAnswers / data.totalQuestions) * 10000) /
            100
          : 0;
    });

    return breakdown;
  }
  getConjugationResults(): TestResult[] {
    return this.getHistory().filter((r) => r.test_type === 'conjugation');
  }

  getVocabularyResults(): TestResult[] {
    return this.getHistory().filter((r) => r.test_type === 'vocabulary');
  }

  getStatisticsByType(type: 'conjugation' | 'vocabulary'): Statistics {
    const results =
      type === 'conjugation'
        ? this.getConjugationResults()
        : this.getVocabularyResults();

    return this.getStatistics({ syncedOnly: false, unsyncedOnly: false });
  }

  private calculateBreakdownByPerson(
    results: TestResult[]
  ): Statistics['byPerson'] {
    const breakdown: Statistics['byPerson'] = {};

    results.forEach((result) => {
      // Only process conjugation quiz results
      if (result.test_type !== 'conjugation') {
        return;
      }

      result.answers.forEach((answer) => {
        // Type guard: check if this is a conjugation answer
        if (!('person' in answer)) {
          return;
        }

        const person = answer.person;
        if (!breakdown[person]) {
          breakdown[person] = {
            totalQuestions: 0,
            correctAnswers: 0,
            percentage: 0,
          };
        }
        breakdown[person].totalQuestions++;
        if (answer.isCorrect) {
          breakdown[person].correctAnswers++;
        }
      });
    });

    // Calculate percentages
    Object.keys(breakdown).forEach((person) => {
      const data = breakdown[person];
      data.percentage =
        data.totalQuestions > 0
          ? Math.round((data.correctAnswers / data.totalQuestions) * 10000) /
            100
          : 0;
    });

    return breakdown;
  }

  private calculateBreakdownByDifficulty(
    results: TestResult[]
  ): Statistics['byDifficulty'] {
    const breakdown: Statistics['byDifficulty'] = {};

    results.forEach((result) => {
      // Only process conjugation quiz results (vocab quiz doesn't store difficulty per answer)
      if (result.test_type !== 'conjugation') {
        return;
      }

      result.answers.forEach((answer) => {
        // Type guard: check if this is a conjugation answer with difficulty_level
        if (!('difficulty_level' in answer)) {
          return;
        }

        const difficulty = answer.difficulty_level;

        // Skip if difficulty_level is undefined
        if (difficulty === undefined) {
          return;
        }

        if (!breakdown[difficulty]) {
          breakdown[difficulty] = {
            totalQuestions: 0,
            correctAnswers: 0,
            percentage: 0,
          };
        }
        breakdown[difficulty].totalQuestions++;
        if (answer.isCorrect) {
          breakdown[difficulty].correctAnswers++;
        }
      });
    });

    // Calculate percentages
    Object.keys(breakdown).forEach((level) => {
      const data = breakdown[Number(level)];
      data.percentage =
        data.totalQuestions > 0
          ? Math.round((data.correctAnswers / data.totalQuestions) * 10000) /
            100
          : 0;
    });

    return breakdown;
  }

  private calculateTrend(results: TestResult[]): Statistics['trend'] {
    if (results.length < 2) {
      return {
        improving: false,
        recentAverage: results.length > 0 ? results[0].percentage : 0,
        olderAverage: 0,
        changePercentage: 0,
      };
    }

    // Sort by date
    const sorted = results.sort(
      (a, b) =>
        new Date(a.test_date).getTime() - new Date(b.test_date).getTime()
    );

    // Split into recent and older (50/50 split)
    const splitIndex = Math.floor(sorted.length / 2);
    const olderResults = sorted.slice(0, splitIndex);
    const recentResults = sorted.slice(splitIndex);

    const olderAverage =
      olderResults.reduce((sum, r) => sum + r.percentage, 0) /
      olderResults.length;
    const recentAverage =
      recentResults.reduce((sum, r) => sum + r.percentage, 0) /
      recentResults.length;

    const changePercentage =
      olderAverage > 0
        ? ((recentAverage - olderAverage) / olderAverage) * 100
        : 0;

    return {
      improving: recentAverage > olderAverage,
      recentAverage: Math.round(recentAverage * 100) / 100,
      olderAverage: Math.round(olderAverage * 100) / 100,
      changePercentage: Math.round(changePercentage * 100) / 100,
    };
  }
}

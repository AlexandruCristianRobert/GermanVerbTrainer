import { Injectable } from '@angular/core';
import { Subject, Observable } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';
import { StorageService } from '../../../core/services/storage.service';
import { TestResult } from '../../../core/models';
import { QuizResult } from '../../quiz/models';

@Injectable({
  providedIn: 'root',
})
export class ResultsService {
  private resultSavedSubject = new Subject<TestResult>();
  public resultSaved$: Observable<TestResult> =
    this.resultSavedSubject.asObservable();

  constructor(private storageService: StorageService) {
    console.log('📊 ResultsService initialized');
  }

  /**
   * Save quiz result to localStorage
   * Converts QuizResult to TestResult format and persists it
   */
  saveResult(quizResult: QuizResult, userId: string | null = null): TestResult {
    console.log('💾 Saving quiz result...');

    // Generate unique IDs
    const id = uuidv4();
    const clientGeneratedId = uuidv4();

    // Convert QuizResult to TestResult format
    const testResult: TestResult = {
      id,
      user_id: userId,
      test_date: quizResult.timestamp.toISOString(),
      test_type: 'conjugation',
      score: quizResult.score,
      total_questions: quizResult.totalQuestions,
      percentage: quizResult.percentage,
      test_configuration: {
        tenses: this.extractUniqueTenses(quizResult),
        verbTypes: this.extractUniqueVerbTypes(quizResult),
        persons: this.extractUniquePersons(quizResult),
        questionCount: quizResult.totalQuestions,
        difficultyLevels: this.extractUniqueDifficultyLevels(quizResult),
      },
      answers: quizResult.questions.map((q) => ({
        verb: q.verb.infinitive,
        tense: q.tense,
        person: q.person,
        correctAnswer: q.correctAnswer,
        userAnswer: q.userAnswer || '',
        isCorrect: q.isCorrect || false,
        verb_type: q.verb.verb_type, // Add this
        difficulty_level: q.verb.difficulty_level, // Add this
      })),
      duration_seconds: quizResult.duration,
      synced: false,
      synced_at: null,
      client_generated_id: clientGeneratedId,
    };

    // Save to localStorage
    this.storageService.saveTestResult(testResult);

    // Emit event
    this.resultSavedSubject.next(testResult);

    console.log(
      `✅ Result saved: ${testResult.score}/${testResult.total_questions} (${testResult.percentage}%)`
    );

    return testResult;
  }

  /**
   * Get a specific result by ID
   */
  getResultById(id: string): TestResult | undefined {
    const allResults = this.storageService.getTestResults();
    return allResults.find((r) => r.id === id);
  }

  /**
   * Get all results for a specific user
   */
  getUserResults(userId: string | null = null): TestResult[] {
    const allResults = this.storageService.getTestResults();
    return allResults.filter((r) => r.user_id === userId);
  }

  /**
   * Get recent results (limit to N most recent)
   */
  getRecentResults(count: number = 10): TestResult[] {
    const allResults = this.storageService.getTestResults();
    return allResults.slice(0, count);
  }

  /**
   * Mark result as synced to server
   */
  markAsSynced(id: string): void {
    this.storageService.updateTestResult(id, {
      synced: true,
      synced_at: new Date().toISOString(),
    });
    console.log(`✅ Result ${id} marked as synced`);
  }

  /**
   * Delete a result
   */
  deleteResult(id: string): void {
    this.storageService.deleteTestResult(id);
    console.log(`🗑️ Result ${id} deleted`);
  }

  /**
   * Get results filtered by date range
   */
  getResultsByDateRange(startDate: Date, endDate: Date): TestResult[] {
    const allResults = this.storageService.getTestResults();

    return allResults.filter((r) => {
      const resultDate = new Date(r.test_date);
      return resultDate >= startDate && resultDate <= endDate;
    });
  }

  /**
   * Get results filtered by minimum score
   */
  getResultsByMinScore(minPercentage: number): TestResult[] {
    const allResults = this.storageService.getTestResults();
    return allResults.filter((r) => r.percentage >= minPercentage);
  }

  /**
   * Get average score across all results
   */
  getAverageScore(): number {
    const allResults = this.storageService.getTestResults();

    if (allResults.length === 0) {
      return 0;
    }

    const totalPercentage = allResults.reduce(
      (sum, r) => sum + r.percentage,
      0
    );
    return Math.round((totalPercentage / allResults.length) * 100) / 100;
  }

  /**
   * Get total number of questions answered
   */
  getTotalQuestionsAnswered(): number {
    const allResults = this.storageService.getTestResults();
    return allResults.reduce((sum, r) => sum + r.total_questions, 0);
  }

  /**
   * Get total number of correct answers
   */
  getTotalCorrectAnswers(): number {
    const allResults = this.storageService.getTestResults();
    return allResults.reduce((sum, r) => sum + r.score, 0);
  }

  /**
   * Get best result (highest percentage)
   */
  getBestResult(): TestResult | undefined {
    const allResults = this.storageService.getTestResults();

    if (allResults.length === 0) {
      return undefined;
    }

    return allResults.reduce((best, current) =>
      current.percentage > best.percentage ? current : best
    );
  }

  /**
   * Get performance trend (last N results)
   */
  getPerformanceTrend(count: number = 10): number[] {
    const recentResults = this.getRecentResults(count);
    return recentResults.map((r) => r.percentage).reverse(); // Oldest to newest
  }

  /**
   * Check if user is improving (comparing recent results to older ones)
   */
  isImproving(recentCount: number = 5): boolean {
    const allResults = this.storageService.getTestResults();

    if (allResults.length < recentCount * 2) {
      return false; // Not enough data
    }

    const recentResults = allResults.slice(0, recentCount);
    const olderResults = allResults.slice(recentCount, recentCount * 2);

    const recentAvg =
      recentResults.reduce((sum, r) => sum + r.percentage, 0) / recentCount;
    const olderAvg =
      olderResults.reduce((sum, r) => sum + r.percentage, 0) / recentCount;

    return recentAvg > olderAvg;
  }

  // ==================== PRIVATE HELPER METHODS ====================

  /**
   * Extract unique tenses from quiz result
   */
  private extractUniqueTenses(result: QuizResult): string[] {
    const tenses = new Set<string>();
    result.questions.forEach((q) => tenses.add(q.tense));
    return Array.from(tenses);
  }

  /**
   * Extract unique verb types from quiz result
   */
  private extractUniqueVerbTypes(result: QuizResult): string[] {
    const types = new Set<string>();
    result.questions.forEach((q) => types.add(q.verb.verb_type));
    return Array.from(types);
  }

  /**
   * Extract unique persons from quiz result
   */
  private extractUniquePersons(result: QuizResult): string[] {
    const persons = new Set<string>();
    result.questions.forEach((q) => persons.add(q.person));
    return Array.from(persons);
  }

  /**
   * Extract unique difficulty levels from quiz result
   */
  private extractUniqueDifficultyLevels(result: QuizResult): number[] {
    const levels = new Set<number>();
    result.questions.forEach((q) => levels.add(q.verb.difficulty_level));
    return Array.from(levels).sort((a, b) => a - b);
  }
}

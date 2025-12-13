import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { TestResult } from '../../../../core/models';
import { VocabAnswer } from '../../../../core/models/test-result.model';

@Component({
  selector: 'app-vocab-quiz-results',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './vocab-quiz-results.component.html',
  styleUrls: ['./vocab-quiz-results.component.scss'],
})
export class VocabQuizResultsComponent implements OnInit {
  result: TestResult | null = null;
  loading = false;
  error: string | null = null;

  constructor(private router: Router) {}

  ngOnInit(): void {
    // Get result from router state (passed from vocab-quiz-test component)
    const navigation = this.router.getCurrentNavigation();
    const state = navigation?.extras?.state || history.state;

    if (state && state['result']) {
      this.result = state['result'] as TestResult;
    } else {
      this.error = 'No result data found';
    }
  }

  // ==================== STATISTICS ====================

  get scorePercentage(): number {
    return this.result?.percentage || 0;
  }

  get scoreGrade(): string {
    const percentage = this.scorePercentage;
    if (percentage >= 90) return 'A';
    if (percentage >= 80) return 'B';
    if (percentage >= 70) return 'C';
    if (percentage >= 60) return 'D';
    return 'F';
  }

  get scoreColor(): string {
    const percentage = this.scorePercentage;
    if (percentage >= 90) return 'text-green-600';
    if (percentage >= 70) return 'text-blue-600';
    if (percentage >= 50) return 'text-yellow-600';
    return 'text-red-600';
  }

  get scoreBgColor(): string {
    const percentage = this.scorePercentage;
    if (percentage >= 90) return 'bg-green-100';
    if (percentage >= 70) return 'bg-blue-100';
    if (percentage >= 50) return 'bg-yellow-100';
    return 'bg-red-100';
  }

  get encouragementMessage(): string {
    const percentage = this.scorePercentage;
    if (percentage === 100)
      return '🎉 Perfect! You know your German vocabulary!';
    if (percentage >= 90)
      return '🌟 Excellent! Your vocabulary is very strong!';
    if (percentage >= 80)
      return '👏 Great work! Keep expanding your vocabulary!';
    if (percentage >= 70) return '👍 Good job! Continue practicing!';
    if (percentage >= 60) return '💪 Nice effort! More practice will help!';
    return '📚 Keep learning! Your vocabulary will grow!';
  }

  get vocabAnswers(): VocabAnswer[] {
    if (!this.result || !Array.isArray(this.result.answers)) {
      return [];
    }
    return this.result.answers as VocabAnswer[];
  }

  get correctAnswersCount(): number {
    return this.result?.score || 0;
  }

  get totalQuestions(): number {
    return this.result?.total_questions || 0;
  }

  get durationMinutes(): number {
    if (!this.result?.duration_seconds) return 0;
    return Math.floor(this.result.duration_seconds / 60);
  }

  get durationSeconds(): number {
    if (!this.result?.duration_seconds) return 0;
    return this.result.duration_seconds % 60;
  }

  // ==================== ACTIONS ====================

  retakeQuiz(): void {
    this.router.navigate(['/vocab-quiz/config']);
  }

  viewHistory(): void {
    this.router.navigate(['/history']);
  }

  goHome(): void {
    this.router.navigate(['/home']);
  }
}

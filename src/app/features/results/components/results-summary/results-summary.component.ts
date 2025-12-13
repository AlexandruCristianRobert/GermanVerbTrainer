import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { ResultsService } from '../../services/results.service';
import { ConfigService } from '../../../configuration/services/config.service';
import { TestResult, Answer, VocabAnswer } from '../../../../core/models'; // ADD VocabAnswer

@Component({
  selector: 'app-results-summary',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './results-summary.component.html',
  styleUrls: ['./results-summary.component.scss'],
})
export class ResultsSummaryComponent implements OnInit {
  result: TestResult | null = null;
  loading = true;
  error: string | null = null;
  Object = Object;
  Math = Math;

  // UI state
  showDetailedAnswers = false;
  selectedAnswerIndex: number | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private resultsService: ResultsService,
    private configService: ConfigService
  ) {}

  ngOnInit(): void {
    // Get result ID from route params
    const resultId = this.route.snapshot.paramMap.get('id');

    if (!resultId) {
      this.error = 'No result ID provided';
      this.loading = false;
      return;
    }

    // Load result
    this.result = this.resultsService.getResultById(resultId) || null;

    if (!this.result) {
      this.error = 'Result not found';
      this.loading = false;
      return;
    }

    this.loading = false;
  }

  // ==================== TYPE GUARDS ====================

  get isConjugationQuiz(): boolean {
    return this.result?.test_type === 'conjugation';
  }

  get isVocabularyQuiz(): boolean {
    return this.result?.test_type === 'vocabulary';
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
    if (percentage === 100) return '🎉 Perfect! You are a German verb master!';
    if (percentage >= 90)
      return '🌟 Excellent work! You really know your verbs!';
    if (percentage >= 80) return "👏 Great job! You're doing very well!";
    if (percentage >= 70) return '👍 Good effort! Keep practicing!';
    if (percentage >= 60) return '💪 Not bad! A bit more practice will help!';
    return "📚 Keep studying! You'll improve with practice!";
  }

  get correctAnswersCount(): number {
    return this.result?.score || 0;
  }

  get incorrectAnswersCount(): number {
    return (this.result?.total_questions || 0) - this.correctAnswersCount;
  }

  get formattedDuration(): string {
    const seconds = this.result?.duration_seconds || 0;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  get averageTimePerQuestion(): number {
    if (!this.result || !this.result.duration_seconds) return 0;
    return Math.round(
      this.result.duration_seconds / this.result.total_questions
    );
  }

  // ==================== ANSWER BREAKDOWN ====================

  get correctAnswers() {
    return this.result?.answers.filter((a) => a.isCorrect) || [];
  }

  get incorrectAnswers() {
    return this.result?.answers.filter((a) => !a.isCorrect) || [];
  }

  get answersByTense() {
    // Only for conjugation quiz
    if (!this.isConjugationQuiz) return {};

    const result: { [tense: string]: { correct: number; total: number } } = {};

    this.result?.answers.forEach((answer) => {
      // Type guard: check if this is a conjugation answer
      if (!('tense' in answer)) return;

      const tense = answer.tense;
      if (!result[tense]) {
        result[tense] = { correct: 0, total: 0 };
      }
      result[tense].total++;
      if (answer.isCorrect) {
        result[tense].correct++;
      }
    });

    return result;
  }

  get answersByPerson() {
    // Only for conjugation quiz
    if (!this.isConjugationQuiz) return {};

    const result: { [person: string]: { correct: number; total: number } } = {};

    this.result?.answers.forEach((answer) => {
      // Type guard: check if this is a conjugation answer
      if (!('person' in answer)) return;

      const person = answer.person;
      if (!result[person]) {
        result[person] = { correct: 0, total: 0 };
      }
      result[person].total++;
      if (answer.isCorrect) {
        result[person].correct++;
      }
    });

    return result;
  }

  getPercentage(correct: number, total: number): number {
    return total > 0 ? Math.round((correct / total) * 100) : 0;
  }

  // ==================== ACTIONS ====================

  toggleDetailedAnswers(): void {
    this.showDetailedAnswers = !this.showDetailedAnswers;
  }

  selectAnswer(index: number): void {
    this.selectedAnswerIndex =
      this.selectedAnswerIndex === index ? null : index;
  }

  retakeQuiz(): void {
    // Navigate based on quiz type
    if (this.isVocabularyQuiz) {
      this.router.navigate(['/vocab-quiz/test']);
    } else {
      this.router.navigate(['/quiz']);
    }
  }

  newQuiz(): void {
    // Navigate to config based on quiz type
    if (this.isVocabularyQuiz) {
      this.router.navigate(['/vocab-quiz/config']);
    } else {
      this.router.navigate(['/config']);
    }
  }

  viewHistory(): void {
    this.router.navigate(['/history']);
  }

  shareResults(): void {
    const quizType = this.isVocabularyQuiz ? 'Vocabulary' : 'Conjugation';
    const shareText = `I scored ${this.scorePercentage}% on the German ${quizType} Quiz! 🇩🇪 (${this.correctAnswersCount}/${this.result?.total_questions} correct)`;

    if (navigator.share) {
      navigator
        .share({
          title: 'German Verb Trainer Results',
          text: shareText,
        })
        .catch((err) => console.log('Error sharing:', err));
    } else {
      // Fallback: Copy to clipboard
      navigator.clipboard.writeText(shareText).then(() => {
        alert('Results copied to clipboard!');
      });
    }
  }

  printResults(): void {
    window.print();
  }

  // ==================== UTILITY ====================

  getFormattedDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  }

  getTenseLabel(tense: string): string {
    const labels: { [key: string]: string } = {
      präsens: 'Present',
      präteritum: 'Simple Past',
      perfekt: 'Present Perfect',
      plusquamperfekt: 'Past Perfect',
      futur: 'Future',
    };
    return labels[tense] || tense;
  }

  getVerbTypeLabel(type: string): string {
    const labels: { [key: string]: string } = {
      weak: 'Weak',
      strong: 'Strong',
      irregular: 'Irregular',
      modal: 'Modal',
    };
    return labels[type] || type;
  }
}

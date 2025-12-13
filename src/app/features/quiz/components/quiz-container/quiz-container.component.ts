import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { ConfigService } from '../../../configuration/services/config.service';
import { QuizService } from '../../services/quiz.service';
import { ResultsService } from '../../../results/services/results.service';
import { Question } from '../../models/question.model';
import { TestConfig } from '../../../../core/models';

@Component({
  selector: 'app-quiz-container',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './quiz-container.component.html',
  styleUrls: ['./quiz-container.component.scss'],
})
export class QuizContainerComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // Quiz state
  questions: Question[] = [];
  currentQuestionIndex = 0;
  userAnswers = new Map<string, string>();
  currentAnswer = '';

  // Timer
  startTime: Date | null = null;
  elapsedSeconds = 0;
  private timerInterval: any;

  // UI state
  showHint = false;
  hintLevel = 1;
  isSubmitting = false;
  config: TestConfig | null = null;

  // Validation
  answerError = '';
  showValidation = false;

  constructor(
    private configService: ConfigService,
    private quizService: QuizService,
    private resultsService: ResultsService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Get current configuration
    this.configService.config$
      .pipe(takeUntil(this.destroy$))
      .subscribe((config) => {
        this.config = config;
      });

    // Generate questions
    this.initializeQuiz();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();

    // Clear timer
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
  }

  // ==================== INITIALIZATION ====================

  initializeQuiz(): void {
    const config = this.configService.getConfig();

    // Validate configuration
    const validation = this.quizService.validateConfiguration(config);
    if (!validation.valid) {
      console.error('Invalid configuration:', validation.errors);
      alert(
        'Invalid quiz configuration. Please go back and adjust your settings.'
      );
      this.router.navigate(['/config']);
      return;
    }

    // Generate questions
    try {
      this.questions = this.quizService.generateQuestions(config);

      if (this.questions.length === 0) {
        alert(
          'No questions could be generated. Please adjust your configuration.'
        );
        this.router.navigate(['/config']);
        return;
      }

      // Start timer
      this.startTime = new Date();
      this.startTimer();

      console.log(
        `✅ Quiz initialized: ${this.questions.length} questions generated`
      );
    } catch (error) {
      console.error('Error generating questions:', error);
      alert('Failed to generate quiz. Please try again.');
      this.router.navigate(['/config']);
    }
  }

  startTimer(): void {
    this.timerInterval = setInterval(() => {
      if (this.startTime) {
        this.elapsedSeconds = Math.floor(
          (Date.now() - this.startTime.getTime()) / 1000
        );
      }
    }, 1000);
  }

  // ==================== NAVIGATION ====================

  get currentQuestion(): Question | null {
    return this.questions[this.currentQuestionIndex] || null;
  }

  get isFirstQuestion(): boolean {
    return this.currentQuestionIndex === 0;
  }

  get isLastQuestion(): boolean {
    return this.currentQuestionIndex === this.questions.length - 1;
  }

  get progress(): number {
    return ((this.currentQuestionIndex + 1) / this.questions.length) * 100;
  }

  get questionsAnswered(): number {
    return this.userAnswers.size;
  }

  get questionsRemaining(): number {
    return this.questions.length - this.userAnswers.size;
  }

  nextQuestion(): void {
    if (!this.isLastQuestion) {
      this.saveCurrentAnswer();
      this.currentQuestionIndex++;
      this.loadAnswer();
      this.resetHint();
      this.showValidation = false;
    }
  }

  previousQuestion(): void {
    if (!this.isFirstQuestion) {
      this.saveCurrentAnswer();
      this.currentQuestionIndex--;
      this.loadAnswer();
      this.resetHint();
      this.showValidation = false;
    }
  }

  goToQuestion(index: number): void {
    if (index >= 0 && index < this.questions.length) {
      this.saveCurrentAnswer();
      this.currentQuestionIndex = index;
      this.loadAnswer();
      this.resetHint();
      this.showValidation = false;
    }
  }

  // ==================== ANSWER MANAGEMENT ====================

  saveCurrentAnswer(): void {
    if (this.currentQuestion && this.currentAnswer.trim()) {
      this.userAnswers.set(this.currentQuestion.id, this.currentAnswer.trim());
    }
  }

  loadAnswer(): void {
    if (this.currentQuestion) {
      this.currentAnswer = this.userAnswers.get(this.currentQuestion.id) || '';
    }
  }

  isQuestionAnswered(index: number): boolean {
    return this.userAnswers.has(this.questions[index].id);
  }

  clearCurrentAnswer(): void {
    this.currentAnswer = '';
    if (this.currentQuestion) {
      this.userAnswers.delete(this.currentQuestion.id);
    }
  }

  // ==================== HINTS ====================

  toggleHint(): void {
    this.showHint = !this.showHint;
    if (!this.showHint) {
      this.hintLevel = 1;
    }
  }

  resetHint(): void {
    this.showHint = false;
    this.hintLevel = 1;
  }

  increaseHintLevel(): void {
    if (this.hintLevel < 3) {
      this.hintLevel++;
    }
  }

  decreaseHintLevel(): void {
    if (this.hintLevel > 1) {
      this.hintLevel--;
    }
  }

  getHint(): string {
    if (!this.currentQuestion) return '';
    return this.quizService.getHint(this.currentQuestion, this.hintLevel);
  }

  // ==================== VALIDATION ====================

  checkAnswer(): void {
    if (!this.currentQuestion) return;

    this.showValidation = true;
    const isCorrect = this.quizService.validateAnswer(
      this.currentQuestion,
      this.currentAnswer
    );

    if (isCorrect) {
      this.answerError = '';
    } else {
      // Check if partially correct
      const isPartial = this.quizService.isPartiallyCorrect(
        this.currentQuestion,
        this.currentAnswer
      );

      if (isPartial) {
        this.answerError =
          'Close, but not quite correct. Check spelling and umlauts.';
      } else {
        this.answerError = 'Incorrect. Try again or use a hint.';
      }
    }
  }

  isCurrentAnswerCorrect(): boolean {
    if (!this.currentQuestion || !this.currentAnswer) return false;
    return this.quizService.validateAnswer(
      this.currentQuestion,
      this.currentAnswer
    );
  }

  // ==================== QUIZ COMPLETION ====================

  canSubmitQuiz(): boolean {
    return this.userAnswers.size === this.questions.length;
  }

  confirmSubmitQuiz(): void {
    // Save the current answer first
    this.saveCurrentAnswer();

    // Check if all questions are answered after saving
    const unanswered = this.questions.length - this.userAnswers.size;

    if (unanswered > 0) {
      const confirm = window.confirm(
        `You have ${unanswered} unanswered question(s). Submit anyway?`
      );
      if (!confirm) return;
    }

    this.submitQuiz();
  }

  submitQuiz(): void {
    if (this.isSubmitting) return;

    this.isSubmitting = true;
    this.saveCurrentAnswer();

    // Stop timer
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }

    // Score the quiz
    const result = this.quizService.scoreQuiz(
      this.questions,
      this.userAnswers,
      this.startTime || new Date()
    );

    // Save result to localStorage
    const savedResult = this.resultsService.saveResult(result, null);

    console.log('✅ Quiz submitted:', result);

    // Navigate to results page with result ID
    this.router.navigate(['/results', savedResult.id]);
  }

  // ==================== UTILITY ====================

  getFormattedTime(): string {
    const minutes = Math.floor(this.elapsedSeconds / 60);
    const seconds = this.elapsedSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  exitQuiz(): void {
    const confirm = window.confirm(
      'Are you sure you want to exit? Your progress will be lost.'
    );
    if (confirm) {
      this.router.navigate(['/config']);
    }
  }

  // Keyboard shortcuts
  handleKeyPress(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      if (this.currentAnswer.trim()) {
        // Save current answer before checking if we can submit
        this.saveCurrentAnswer();

        if (this.isLastQuestion) {
          this.confirmSubmitQuiz();
        } else {
          this.nextQuestion();
        }
      }
    }
  }
}

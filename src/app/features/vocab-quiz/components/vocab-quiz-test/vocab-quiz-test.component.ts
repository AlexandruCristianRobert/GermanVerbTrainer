import {
  Component,
  OnInit,
  OnDestroy,
  ViewChild,
  ElementRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import { VocabQuizConfigService } from '../../services/vocab-quiz-config.service';
import { CustomVerbListService } from '../../services/custom-verb-list.service';
import { VerbService } from '../../../quiz/services/verb.service';
import { StorageService } from '../../../../core/services/storage.service';
import { AuthService } from '../../../../core/services/auth.service';
import { VocabQuizState, VocabQuestion } from '../../models';
import { Verb, VerbFilters } from '../../../../core/models';
import { VocabAnswer } from '../../../../core/models/test-result.model';

@Component({
  selector: 'app-vocab-quiz-test',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './vocab-quiz-test.component.html',
  styleUrls: ['./vocab-quiz-test.component.scss'],
})
export class VocabQuizTestComponent implements OnInit, OnDestroy {
  quizState!: VocabQuizState;
  currentQuestion!: VocabQuestion;
  answerForm!: FormGroup;
  @ViewChild('feedbackDiv') feedbackDiv?: ElementRef;
  @ViewChild('answerInput') answerInput?: ElementRef;
  showFeedback = false;
  showHint = false;
  private timerInterval: any;

  constructor(
    private fb: FormBuilder,
    private vocabConfigService: VocabQuizConfigService,
    private customListService: CustomVerbListService,
    private verbService: VerbService,
    private storageService: StorageService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.initializeQuiz();
    this.initializeForm();
  }

  ngOnDestroy(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
  }

  private initializeQuiz(): void {
    const config = this.vocabConfigService.getConfig();
    const verbs = this.selectRandomVerbs(config);

    if (verbs.length === 0) {
      alert('No verbs available with current configuration.');
      this.router.navigate(['/vocab-quiz/config']);
      return;
    }

    this.quizState = {
      questions: verbs.map((verb) => ({
        verb,
        userAnswer: '',
        submitted: false,
      })),
      currentIndex: 0,
      score: 0,
      startTime: new Date(),
    };

    this.currentQuestion = this.quizState.questions[0];
  }

  private initializeForm(): void {
    this.answerForm = this.fb.group({
      answer: ['', [Validators.required, Validators.minLength(2)]],
    });
  }

  private selectRandomVerbs(config: any): Verb[] {
    if (config.useCustomList && config.customListId) {
      return this.customListService.getRandomVerbsFromList(
        config.customListId,
        config.verbCount
      );
    }

    const filters: VerbFilters = {
      difficultyLevels: config.difficultyLevels,
      verbTypes: config.includeAllTypes ? undefined : [],
    };

    return this.verbService.getRandomVerbs(config.verbCount, filters);
  }

  /**
   * Submit current answer
   */
  submitAnswer(): void {
    if (this.answerForm.invalid) {
      this.answerForm.markAllAsTouched();
      return;
    }

    const userAnswer = this.answerForm.get('answer')?.value.trim();
    const correctAnswer = this.currentQuestion.verb.english_translation;

    const isCorrect = this.checkAnswer(userAnswer, correctAnswer);

    this.currentQuestion.userAnswer = userAnswer;
    this.currentQuestion.isCorrect = isCorrect;
    this.currentQuestion.submitted = true;

    if (isCorrect) {
      this.quizState.score++;
    }

    this.showFeedback = true;

    // Focus the feedback div so Enter key works
    setTimeout(() => {
      this.feedbackDiv?.nativeElement.focus();
    }, 0);
  }

  /**
   * Check if answer is correct (with flexible matching)
   */
  private checkAnswer(userAnswer: string, correctAnswer: string): boolean {
    const cleanUser = userAnswer.toLowerCase().trim();
    const cleanCorrect = correctAnswer.toLowerCase().trim();

    // Exact match
    if (cleanUser === cleanCorrect) return true;

    // Remove "to" prefix for both answers
    const userWithoutTo = cleanUser.replace(/^to\s+/g, '');
    const correctWithoutTo = cleanCorrect.replace(/^to\s+/g, '');

    // Check both with and without "to"
    if (userWithoutTo === correctWithoutTo) return true;

    // Also check if user added "to" when correct answer doesn't have it
    if ('to ' + userWithoutTo === correctWithoutTo) return true;
    if (userWithoutTo === 'to ' + correctWithoutTo) return true;

    // Check if one contains the other (for compound translations)
    return (
      correctWithoutTo.includes(userWithoutTo) ||
      userWithoutTo.includes(correctWithoutTo)
    );
  }

  /**
   * Move to next question or finish quiz
   */
  nextQuestion(): void {
    this.showFeedback = false;
    this.showHint = false;
    this.answerForm.reset();

    if (this.quizState.currentIndex < this.quizState.questions.length - 1) {
      this.quizState.currentIndex++;
      this.currentQuestion =
        this.quizState.questions[this.quizState.currentIndex];

      // Refocus the input field
      setTimeout(() => {
        this.answerInput?.nativeElement.focus();
      }, 0);
    } else {
      this.finishQuiz();
    }
  }

  /**
   * Finish quiz and save results
   */
  finishQuiz(): void {
    this.quizState.endTime = new Date();

    const user = this.authService.getCurrentUser();
    const answers: VocabAnswer[] = this.quizState.questions.map((q) => ({
      infinitive: q.verb.infinitive,
      correctAnswer: q.verb.english_translation,
      userAnswer: q.userAnswer,
      isCorrect: q.isCorrect || false,
    }));

    const result = {
      id: crypto.randomUUID(),
      user_id: user?.id || null,
      test_date: this.quizState.startTime.toISOString(),
      test_type: 'vocabulary' as const,
      score: this.quizState.score,
      total_questions: this.quizState.questions.length,
      percentage:
        (this.quizState.score / this.quizState.questions.length) * 100,
      test_configuration: this.vocabConfigService.getConfig(),
      answers,
      duration_seconds: Math.floor(
        (this.quizState.endTime.getTime() -
          this.quizState.startTime.getTime()) /
          1000
      ),
      synced: false,
      synced_at: null,
      client_generated_id: crypto.randomUUID(),
    };

    this.storageService.saveTestResult(result);
    this.router.navigate(['/vocab-quiz/results'], { state: { result } });
  }

  /**
   * Quit quiz and return to config
   */
  quitQuiz(): void {
    if (confirm('Are you sure you want to quit? Your progress will be lost.')) {
      this.router.navigate(['/vocab-quiz/config']);
    }
  }

  /**
   * Toggle hint visibility
   */
  toggleHint(): void {
    this.showHint = !this.showHint;
  }

  /**
   * Handle keyboard events for hint
   */
  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Tab' && !this.showFeedback) {
      event.preventDefault();
      this.toggleHint();
    }
  }

  /**
   * Get progress percentage
   */
  get progressPercentage(): number {
    return (
      ((this.quizState.currentIndex + 1) / this.quizState.questions.length) *
      100
    );
  }
}

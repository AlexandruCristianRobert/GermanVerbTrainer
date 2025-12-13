import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CacheService } from './core/services/cache.service';
import { environment } from '../environments/environment';
import { TestConfig, TestResult } from './core/models';
import { AuthService, StorageService, SyncService } from './core';
import { ConfigService } from './features/configuration/services/config.service';
import { VerbService } from './features/quiz/services/verb.service';
import { QuizService } from './features/quiz/services';
import { ResultsService } from './features/results/services';
import { HistoryFilters, HistoryService } from './features/history';
import { NavigationHeaderComponent } from './shared/components/navigation-header/navigation-header.component';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, CommonModule, NavigationHeaderComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent implements OnInit {
  title = 'german-verb-trainer';
  isLoading = true;
  loadingError: string | null = null;
  verbCount = 0;
  instance = 0;
  testEmail = '';
  testPassword = '';
  authMessage = '';
  syncMessage = '';
  showNavigation = false;

  constructor(
    private cacheService: CacheService,
    private storageService: StorageService,
    private syncService: SyncService,
    public authService: AuthService,
    private configService: ConfigService,
    private verbService: VerbService,
    private quizService: QuizService,
    private resultsService: ResultsService,
    private historyService: HistoryService,
    private cdr: ChangeDetectorRef,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Initialize auth
    this.authService.initializeAuth();

    // Track route changes to show/hide navigation
    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe((event: any) => {
        // Hide navigation on home/login page
        this.showNavigation = !event.url.includes('/home');
      });

    // Initialize cache
    this.isLoading = true;
    this.cacheService
      .initializeCache()
      .then(() => {
        console.log('✅ App initialization complete');
        this.isLoading = false;
      })
      .catch((error) => {
        console.error('❌ Failed to initialize app:', error);
        this.loadingError =
          'Failed to load verb database. Please check your internet connection and try again.';
        this.isLoading = false;
      });
  }

  // ==================== TEST METHODS (Remove after testing) ====================

  private testStorageService(): void {
    console.log('🧪 Testing Storage Service...');

    // Test saving config
    const testConfig: TestConfig = {
      tenses: ['präsens'],
      verbTypes: ['weak'],
      persons: ['ich', 'du'],
      difficultyLevels: [1, 2],
      questionCount: 10,
    };
    this.storageService.saveConfig(testConfig);
    console.log('Saved config:', this.storageService.getConfig());

    // Test saving result
    const testResult: TestResult = {
      id: '123-test',
      user_id: null,
      test_date: new Date().toISOString(),
      test_type: 'conjugation',
      score: 8,
      total_questions: 10,
      percentage: 80,
      test_configuration: testConfig,
      answers: [],
      duration_seconds: 120,
      synced: false,
      synced_at: null,
      client_generated_id: '123-test',
    };
    this.storageService.saveTestResult(testResult);
    console.log('All results:', this.storageService.getTestResults());
    console.log(
      'Unsynced count:',
      this.storageService.getUnsyncedResultsCount()
    );
  }

  private testVerbService(): void {
    console.log('🧪 Testing Verb Service...');

    // Test getting all verbs
    const allVerbs = this.verbService.getVerbs();
    console.log(`Total verbs: ${allVerbs.length}`);

    // Test filtering by verb type
    const weakVerbs = this.verbService.getVerbs({ verbTypes: ['weak'] });
    console.log(`Weak verbs: ${weakVerbs.length}`);

    const strongVerbs = this.verbService.getVerbs({ verbTypes: ['strong'] });
    console.log(`Strong verbs: ${strongVerbs.length}`);

    // Test filtering by difficulty
    const easyVerbs = this.verbService.getVerbs({ difficultyLevels: [1, 2] });
    console.log(`Easy verbs (level 1-2): ${easyVerbs.length}`);

    // Test getting verb by infinitive
    const seinVerb = this.verbService.getVerbByInfinitive('sein');
    console.log('Verb "sein":', seinVerb);

    // Test getting conjugation
    if (seinVerb) {
      const conjugation = this.verbService.getConjugation(
        seinVerb,
        'präsens',
        'ich'
      );
      console.log('sein - präsens - ich:', conjugation);
    }

    // Test search
    const searchResults = this.verbService.searchVerbs('be');
    console.log(
      `Search for "be": ${searchResults.length} results`,
      searchResults.map((v) => v.infinitive)
    );

    // Test random verbs
    const randomVerbs = this.verbService.getRandomVerbs(3);
    console.log(
      '3 random verbs:',
      randomVerbs.map((v) => v.infinitive)
    );

    // Test random verbs with filters
    const randomWeakVerbs = this.verbService.getRandomVerbs(2, {
      verbTypes: ['weak'],
    });
    console.log(
      '2 random weak verbs:',
      randomWeakVerbs.map((v) => v.infinitive)
    );

    // Test available tenses
    const tenses = this.verbService.getAvailableTenses();
    console.log('Available tenses:', tenses);

    // Test available verb types
    const types = this.verbService.getAvailableVerbTypes();
    console.log('Available verb types:', types);

    // Test available difficulty levels
    const levels = this.verbService.getAvailableDifficultyLevels();
    console.log('Available difficulty levels:', levels);

    // Test verbs by type
    const verbsByType = this.verbService.getVerbsByType();
    console.log(
      'Verbs grouped by type:',
      Object.keys(verbsByType).map(
        (type) => `${type}: ${verbsByType[type].length}`
      )
    );

    // Test verbs by difficulty
    const verbsByDifficulty = this.verbService.getVerbsByDifficulty();
    console.log(
      'Verbs grouped by difficulty:',
      Object.keys(verbsByDifficulty).map(
        (level) => `Level ${level}: ${verbsByDifficulty[level as any].length}`
      )
    );

    // Test hasEnoughVerbs
    const hasEnough = this.verbService.hasEnoughVerbs(10);
    console.log('Has enough verbs for 10 questions:', hasEnough);

    // Test verbs with required conjugations
    const verbsWithConjugations = this.verbService.getVerbsWithConjugations(
      ['präsens', 'präteritum'],
      ['ich', 'du', 'er']
    );
    console.log(
      `Verbs with präsens and präteritum for ich/du/er: ${verbsWithConjugations.length}`
    );
  }

  private testQuizService(): void {
    console.log('🧪 Testing Quiz Service...');

    // Test configuration
    const testConfig: TestConfig = {
      tenses: ['präsens', 'präteritum'],
      verbTypes: ['weak', 'strong'],
      persons: ['ich', 'du', 'er'],
      questionCount: 5,
      difficultyLevels: [1, 2, 3],
    };

    // Validate configuration
    const validation = this.quizService.validateConfiguration(testConfig);
    console.log('Configuration validation:', validation);

    if (!validation.valid) {
      console.error('❌ Invalid configuration:', validation.errors);
      return;
    }

    // Generate questions
    const questions = this.quizService.generateQuestions(testConfig);
    console.log(`Generated ${questions.length} questions:`);
    questions.forEach((q, index) => {
      console.log(`  ${index + 1}. ${q.questionText}`);
      console.log(`     Answer: ${q.correctAnswer}`);
    });

    // Simulate user answers
    const userAnswers = new Map<string, string>();
    questions.forEach((q, index) => {
      // Make first 3 correct, last 2 incorrect
      if (index < 3) {
        userAnswers.set(q.id, q.correctAnswer);
      } else {
        userAnswers.set(q.id, 'wrong answer');
      }
    });

    // Score the quiz
    const startTime = new Date(Date.now() - 120000); // Simulate 2 minutes ago
    const result = this.quizService.scoreQuiz(
      questions,
      userAnswers,
      startTime
    );

    console.log('Quiz Result:');
    console.log(`  Score: ${result.score}/${result.totalQuestions}`);
    console.log(`  Percentage: ${result.percentage}%`);
    console.log(`  Duration: ${result.duration} seconds`);

    // Show detailed results
    console.log('  Detailed Results:');
    result.questions.forEach((q, index) => {
      const status = q.isCorrect ? '✅' : '❌';
      console.log(
        `    ${index + 1}. ${status} ${q.verb.infinitive} (${q.tense} - ${
          q.person
        })`
      );
      console.log(
        `       User: "${q.userAnswer}" | Correct: "${q.correctAnswer}"`
      );
    });

    // Get statistics
    const stats = this.quizService.getQuizStatistics(result);
    console.log('Statistics by Tense:', stats.correctByTense);
    console.log('Statistics by Person:', stats.correctByPerson);
    console.log('Statistics by Verb Type:', stats.correctByVerbType);

    // Test hint feature
    const firstQuestion = questions[0];
    const hint1 = this.quizService.getHint(firstQuestion, 1);
    const hint2 = this.quizService.getHint(firstQuestion, 2);
    console.log(`Hint level 1 for "${firstQuestion.correctAnswer}": ${hint1}`);
    console.log(`Hint level 2 for "${firstQuestion.correctAnswer}": ${hint2}`);

    // Test partial correctness
    const partialCorrect = this.quizService.isPartiallyCorrect(
      firstQuestion,
      firstQuestion.correctAnswer.substring(0, 3)
    );
    console.log(
      `Is "${firstQuestion.correctAnswer.substring(
        0,
        3
      )}" partially correct for "${
        firstQuestion.correctAnswer
      }"? ${partialCorrect}`
    );
  }

  private testConfigService(): void {
    console.log('🧪 Testing Config Service...');

    // Get current config
    const currentConfig = this.configService.getConfig();
    console.log('Current config:', currentConfig);

    // Subscribe to config changes
    this.configService.config$.subscribe((config) => {
      console.log('📢 Config changed:', config);
    });

    // Test updating config (valid update)
    this.configService.updateConfig({
      questionCount: 15,
      tenses: ['präsens', 'präteritum'],
    });

    // Test toggle methods
    this.configService.toggleTense('perfekt');
    console.log(
      'After toggling perfekt:',
      this.configService.getConfig().tenses
    );

    this.configService.toggleVerbType('modal');
    console.log(
      'After toggling modal:',
      this.configService.getConfig().verbTypes
    );

    // Test validation (should fail - this is expected)
    console.log('Testing validation with invalid questionCount (should fail):');
    this.configService.updateConfig({ questionCount: 0 }); // This SHOULD fail

    // Verify config wasn't changed by invalid update
    console.log(
      'Config after invalid update (should be unchanged):',
      this.configService.getConfig()
    );

    // Test reset after 2 seconds
    setTimeout(() => {
      console.log('Resetting to defaults...');
      this.configService.resetToDefaults();
      console.log('Config after reset:', this.configService.getConfig());
    }, 2000);
  }

  private testResultsService(): void {
    console.log('🧪 Testing Results Service...');

    // Generate a mock quiz result
    const testConfig: TestConfig = {
      tenses: ['präsens'],
      verbTypes: ['weak'],
      persons: ['ich', 'du'],
      questionCount: 3,
      difficultyLevels: [1, 2],
    };

    const questions = this.quizService.generateQuestions(testConfig);

    if (questions.length === 0) {
      console.warn('⚠️ No questions generated, skipping results test');
      return;
    }

    // Simulate user answers (2 correct, 1 wrong)
    const userAnswers = new Map<string, string>();
    questions.forEach((q, index) => {
      if (index < 2) {
        userAnswers.set(q.id, q.correctAnswer);
      } else {
        userAnswers.set(q.id, 'wrong');
      }
    });

    // Score the quiz
    const quizResult = this.quizService.scoreQuiz(
      questions,
      userAnswers,
      new Date()
    );

    // Save the result
    const savedResult = this.resultsService.saveResult(quizResult, null);
    console.log('Saved result:', savedResult);

    // Test getting result by ID
    const retrievedResult = this.resultsService.getResultById(savedResult.id);
    console.log('Retrieved result:', retrievedResult);

    // Test getting recent results
    const recentResults = this.resultsService.getRecentResults(5);
    console.log(`Recent results (${recentResults.length}):`, recentResults);

    // Test statistics
    const avgScore = this.resultsService.getAverageScore();
    console.log('Average score:', avgScore);

    const totalQuestions = this.resultsService.getTotalQuestionsAnswered();
    console.log('Total questions answered:', totalQuestions);

    const totalCorrect = this.resultsService.getTotalCorrectAnswers();
    console.log('Total correct answers:', totalCorrect);

    const bestResult = this.resultsService.getBestResult();
    console.log('Best result:', bestResult);

    // Test performance trend
    const trend = this.resultsService.getPerformanceTrend(5);
    console.log('Performance trend (last 5):', trend);

    // Test improvement detection
    const improving = this.resultsService.isImproving(3);
    console.log('Is improving?', improving);

    // Test resultSaved$ observable
    this.resultsService.resultSaved$.subscribe((result) => {
      console.log('📢 New result saved event:', result.id);
    });

    // Test filtering by date range
    const today = new Date();
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const resultsThisWeek = this.resultsService.getResultsByDateRange(
      weekAgo,
      today
    );
    console.log(`Results from last week: ${resultsThisWeek.length}`);

    // Test filtering by minimum score
    const highScores = this.resultsService.getResultsByMinScore(70);
    console.log(`Results with 70%+ score: ${highScores.length}`);
  }

  private testHistoryService(): void {
    console.log('🧪 Testing History Service...');

    // First ensure we have some test data
    const historyService = new HistoryService(this.storageService);

    // Get full history
    const allHistory = historyService.getHistory();
    console.log(`Total test results: ${allHistory.length}`);

    // Get recent results
    const recent = historyService.getRecentResults(3);
    console.log(
      `Recent results (${recent.length}):`,
      recent.map((r) => ({
        date: r.test_date,
        score: `${r.score}/${r.total_questions}`,
        percentage: `${r.percentage}%`,
      }))
    );

    // Get unsynced vs synced
    const unsynced = historyService.getUnsyncedResults();
    const synced = historyService.getSyncedResults();
    console.log(`Unsynced: ${unsynced.length}, Synced: ${synced.length}`);

    // Test filtering
    const filters: HistoryFilters = {
      minScore: 70,
      tenses: ['präsens'],
    };
    const filtered = historyService.filterHistory(filters);
    console.log(`Filtered results (70%+ score, präsens): ${filtered.length}`);

    // Test date range filtering
    const today = new Date();
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thisWeek = historyService.filterHistory({
      dateFrom: weekAgo,
      dateTo: today,
    });
    console.log(`Results from last week: ${thisWeek.length}`);

    // Get comprehensive statistics
    const stats = historyService.getStatistics();
    console.log('📊 Overall Statistics:');
    console.log(`  Total tests: ${stats.totalTests}`);
    console.log(`  Total questions: ${stats.totalQuestions}`);
    console.log(`  Total correct: ${stats.totalCorrect}`);
    console.log(`  Average score: ${stats.averageScore}`);
    console.log(`  Average percentage: ${stats.averagePercentage}%`);
    console.log(
      `  Best: ${stats.bestPercentage}%, Worst: ${stats.worstPercentage}%`
    );
    console.log(`  Average duration: ${stats.averageDuration} seconds`);

    // Statistics by tense
    console.log('📈 Performance by Tense:');
    Object.keys(stats.byTense).forEach((tense) => {
      const data = stats.byTense[tense];
      console.log(
        `  ${tense}: ${data.correctAnswers}/${data.totalQuestions} (${data.percentage}%)`
      );
    });

    // Statistics by verb type
    console.log('📈 Performance by Verb Type:');
    Object.keys(stats.byVerbType).forEach((type) => {
      const data = stats.byVerbType[type];
      console.log(
        `  ${type}: ${data.correctAnswers}/${data.totalQuestions} (${data.percentage}%)`
      );
    });

    // Statistics by person
    console.log('📈 Performance by Person:');
    Object.keys(stats.byPerson).forEach((person) => {
      const data = stats.byPerson[person];
      console.log(
        `  ${person}: ${data.correctAnswers}/${data.totalQuestions} (${data.percentage}%)`
      );
    });

    // Statistics by difficulty
    console.log('📈 Performance by Difficulty:');
    Object.keys(stats.byDifficulty).forEach((level) => {
      const data = stats.byDifficulty[Number(level)];
      console.log(
        `  Level ${level}: ${data.correctAnswers}/${data.totalQuestions} (${data.percentage}%)`
      );
    });

    // Performance trend
    console.log('📊 Performance Trend:');
    console.log(
      `  Status: ${stats.trend.improving ? '📈 Improving' : '📉 Declining'}`
    );
    console.log(`  Recent average: ${stats.trend.recentAverage}%`);
    console.log(`  Older average: ${stats.trend.olderAverage}%`);
    console.log(
      `  Change: ${stats.trend.changePercentage > 0 ? '+' : ''}${
        stats.trend.changePercentage
      }%`
    );

    // Test filtered statistics
    const filteredStats = historyService.getStatistics({ minScore: 80 });
    console.log(
      `📊 Statistics for tests with 80%+ score: ${filteredStats.totalTests} tests`
    );

    // Test export
    const exported = historyService.exportHistory();
    console.log(`Exported data size: ${exported.length} characters`);
  }

  // ==================== USER ACTION METHODS ====================

  testSync(): void {
    this.syncMessage = 'Uploading...';
    this.syncService.uploadHistory().subscribe({
      next: (result) => {
        this.syncMessage = result.message;
        console.log('✅ Sync result:', result);
      },
      error: (error) => {
        this.syncMessage = `Error: ${error.message}`;
        console.error('❌ Sync error:', error);
      },
    });
  }

  testSignUp(): void {
    if (!this.testEmail || !this.testPassword) {
      this.authMessage = 'Error: Email and password required';
      return;
    }

    this.authMessage = 'Signing up...';
    this.authService.signUp(this.testEmail, this.testPassword).subscribe({
      next: (result) => {
        if (result.error) {
          this.authMessage = `Error: ${result.error.message}`;
        } else {
          this.authMessage = 'Success! Check your email for verification.';
          this.testPassword = '';
        }
      },
      error: (error) => {
        this.authMessage = `Error: ${error.message}`;
      },
    });
  }

  testSignIn(): void {
    if (!this.testEmail || !this.testPassword) {
      this.authMessage = 'Error: Email and password required';
      return;
    }

    this.authMessage = 'Signing in...';
    this.authService.signIn(this.testEmail, this.testPassword).subscribe({
      next: (result) => {
        if (result.error) {
          this.authMessage = `Error: ${result.error.message}`;
        } else {
          this.authMessage = 'Signed in successfully!';
          this.testPassword = '';
        }
      },
      error: (error) => {
        this.authMessage = `Error: ${error.message}`;
      },
    });
  }

  testSignOut(): void {
    this.authMessage = 'Signing out...';
    this.authService.signOut().subscribe({
      next: (result) => {
        if (result.error) {
          this.authMessage = `Error: ${result.error.message}`;
        } else {
          this.authMessage = 'Signed out successfully!';
          this.testEmail = '';
          this.testPassword = '';
        }
      },
      error: (error) => {
        this.authMessage = `Error: ${error.message}`;
      },
    });
  }

  reloadPage(): void {
    window.location.reload();
  }
}

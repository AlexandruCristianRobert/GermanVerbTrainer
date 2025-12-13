import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { ConfigService } from '../../services/config.service';
import { VerbService } from '../../../quiz/services/verb.service';
import { TestConfig, VerbType } from '../../../../core/models';

@Component({
  selector: 'app-config-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './config-form.component.html',
  styleUrls: ['./config-form.component.scss'],
})
export class ConfigFormComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  config: TestConfig = {
    tenses: [],
    verbTypes: [],
    persons: [],
    questionCount: 10,
    difficultyLevels: [],
  };

  // Available options
  availableTenses: string[] = [];
  availableVerbTypes: string[] = [];
  availablePersons = ['ich', 'du', 'er/sie/es', 'wir', 'ihr', 'sie/Sie'];
  availableDifficulties = [1, 2, 3, 4, 5];
  questionCountOptions = [5, 10, 15, 20, 25, 30];

  // Validation state
  validationErrors: string[] = [];
  showValidationErrors = false;

  // Statistics
  availableVerbCount = 0;
  estimatedQuizTime = 0;

  constructor(
    private configService: ConfigService,
    private verbService: VerbService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Load current configuration
    this.configService.config$
      .pipe(takeUntil(this.destroy$))
      .subscribe((config) => {
        this.config = { ...config };
        this.updateStatistics();
      });

    // Get available options from verb cache
    this.availableTenses = this.verbService.getAvailableTenses();
    this.availableVerbTypes = this.verbService.getAvailableVerbTypes();

    // Initial statistics
    this.updateStatistics();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ==================== TOGGLE METHODS ====================

  toggleTense(tense: string): void {
    const index = this.config.tenses.indexOf(tense);
    if (index > -1) {
      this.config.tenses.splice(index, 1);
    } else {
      this.config.tenses.push(tense);
    }
    this.updateStatistics();
  }

  isTenseSelected(tense: string): boolean {
    return this.config.tenses.includes(tense);
  }

  toggleVerbType(type: string): void {
    const index = this.config.verbTypes.indexOf(type);
    if (index > -1) {
      this.config.verbTypes.splice(index, 1);
    } else {
      this.config.verbTypes.push(type);
    }
    this.updateStatistics();
  }

  isVerbTypeSelected(type: string): boolean {
    return this.config.verbTypes.includes(type);
  }

  togglePerson(person: string): void {
    const index = this.config.persons.indexOf(person);
    if (index > -1) {
      this.config.persons.splice(index, 1);
    } else {
      this.config.persons.push(person);
    }
    this.updateStatistics();
  }

  isPersonSelected(person: string): boolean {
    return this.config.persons.includes(person);
  }

  toggleDifficulty(level: number): void {
    if (!this.config.difficultyLevels) {
      this.config.difficultyLevels = [];
    }
    const index = this.config.difficultyLevels.indexOf(level);
    if (index > -1) {
      this.config.difficultyLevels.splice(index, 1);
    } else {
      this.config.difficultyLevels.push(level);
    }
    this.updateStatistics();
  }

  isDifficultySelected(level: number): boolean {
    return this.config.difficultyLevels?.includes(level) || false;
  }

  // ==================== SELECT ALL / NONE ====================

  selectAllTenses(): void {
    this.config.tenses = [...this.availableTenses];
    this.updateStatistics();
  }

  selectNoTenses(): void {
    this.config.tenses = [];
    this.updateStatistics();
  }

  selectAllVerbTypes(): void {
    this.config.verbTypes = [...this.availableVerbTypes];
    this.updateStatistics();
  }

  selectNoVerbTypes(): void {
    this.config.verbTypes = [];
    this.updateStatistics();
  }

  selectAllPersons(): void {
    this.config.persons = [...this.availablePersons];
    this.updateStatistics();
  }

  selectNoPersons(): void {
    this.config.persons = [];
    this.updateStatistics();
  }

  selectAllDifficulties(): void {
    this.config.difficultyLevels = [...this.availableDifficulties];
    this.updateStatistics();
  }

  selectNoDifficulties(): void {
    this.config.difficultyLevels = [];
    this.updateStatistics();
  }

  // ==================== STATISTICS ====================

  // ==================== STATISTICS ====================

  updateStatistics(): void {
    // Count available verbs matching current filters
    const filters = {
      verbTypes:
        this.config.verbTypes.length > 0
          ? (this.config.verbTypes as VerbType[])
          : undefined,
      difficultyLevels:
        this.config.difficultyLevels && this.config.difficultyLevels.length > 0
          ? this.config.difficultyLevels
          : undefined,
    };

    const matchingVerbs = this.verbService.getVerbs(filters);

    // Filter by verbs that have required conjugations
    if (this.config.tenses.length > 0 && this.config.persons.length > 0) {
      this.availableVerbCount = this.verbService.getVerbsWithConjugations(
        this.config.tenses,
        this.config.persons
      ).length;
    } else {
      this.availableVerbCount = matchingVerbs.length;
    }

    // Estimate quiz time (30 seconds per question average)
    this.estimatedQuizTime = Math.ceil((this.config.questionCount * 30) / 60);
  }
  // ==================== VALIDATION ====================

  validateConfig(): boolean {
    this.validationErrors = [];
    this.showValidationErrors = true;

    if (this.config.tenses.length === 0) {
      this.validationErrors.push('Please select at least one tense');
    }

    if (this.config.verbTypes.length === 0) {
      this.validationErrors.push('Please select at least one verb type');
    }

    if (this.config.persons.length === 0) {
      this.validationErrors.push('Please select at least one person');
    }

    if (
      this.config.difficultyLevels &&
      this.config.difficultyLevels.length === 0
    ) {
      this.validationErrors.push('Please select at least one difficulty level');
    }

    if (this.config.questionCount < 1 || this.config.questionCount > 50) {
      this.validationErrors.push('Question count must be between 1 and 50');
    }

    if (this.availableVerbCount < this.config.questionCount) {
      this.validationErrors.push(
        `Not enough verbs available (${this.availableVerbCount}) for ${this.config.questionCount} questions. Please adjust your filters.`
      );
    }

    return this.validationErrors.length === 0;
  }

  // ==================== ACTIONS ====================

  startQuiz(): void {
    if (!this.validateConfig()) {
      return;
    }

    // Save configuration
    this.configService.updateConfig(this.config);

    // Navigate to quiz
    this.router.navigate(['/quiz']);
  }

  resetToDefaults(): void {
    this.configService.resetToDefaults();
    this.showValidationErrors = false;
  }

  saveConfig(): void {
    if (this.validateConfig()) {
      this.configService.updateConfig(this.config);
      alert('Configuration saved successfully!');
    }
  }

  // ==================== HELPER METHODS ====================

  getDifficultyLabel(level: number): string {
    const labels: { [key: number]: string } = {
      1: 'Beginner',
      2: 'Elementary',
      3: 'Intermediate',
      4: 'Advanced',
      5: 'Expert',
    };
    return labels[level] || `Level ${level}`;
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
      weak: 'Weak (Regular)',
      strong: 'Strong (Irregular)',
      irregular: 'Irregular',
      modal: 'Modal',
    };
    return labels[type] || type;
  }
}

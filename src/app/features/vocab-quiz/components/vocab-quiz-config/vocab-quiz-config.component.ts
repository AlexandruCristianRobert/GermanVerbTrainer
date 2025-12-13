import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import { VocabQuizConfigService } from '../../services/vocab-quiz-config.service';
import { VerbService } from '../../../quiz/services/verb.service';
import {
  VocabQuizConfig,
  DIFFICULTY_LEVEL_OPTIONS,
  DifficultyLevelOption,
} from '../../models';
import { Verb, VerbFilters } from '../../../../core/models';

@Component({
  selector: 'app-vocab-quiz-config',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './vocab-quiz-config.component.html',
  styleUrls: ['./vocab-quiz-config.component.scss'],
})
export class VocabQuizConfigComponent implements OnInit {
  configForm!: FormGroup;
  difficultyLevelOptions = DIFFICULTY_LEVEL_OPTIONS;
  availableVerbsCount = 0;
  previewVerbs: Verb[] = [];
  showPreview = false;

  constructor(
    private fb: FormBuilder,
    private vocabConfigService: VocabQuizConfigService,
    private verbService: VerbService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.initializeForm();
    this.updateAvailableVerbsCount();
    this.setupFormListeners();
  }

  private initializeForm(): void {
    const savedConfig = this.vocabConfigService.getConfig();

    this.configForm = this.fb.group({
      verbCount: [
        savedConfig.verbCount,
        [Validators.required, Validators.min(5), Validators.max(100)],
      ],
      difficultyLevels: [
        savedConfig.difficultyLevels,
        [Validators.required, Validators.minLength(1)],
      ],
      includeAllTypes: [savedConfig.includeAllTypes],
    });
  }

  private setupFormListeners(): void {
    this.configForm.valueChanges.subscribe(() => {
      this.updateAvailableVerbsCount();
      if (this.showPreview) {
        this.updatePreviewVerbs();
      }
    });
  }

  /**
   * Toggle difficulty level selection
   */
  toggleLevel(level: number): void {
    const control = this.configForm.get('difficultyLevels');
    const current: number[] = control?.value || [];

    if (current.includes(level)) {
      // Don't allow removing all levels
      if (current.length > 1) {
        control?.setValue(current.filter((l) => l !== level));
      }
    } else {
      control?.setValue([...current, level].sort());
    }
  }

  /**
   * Check if level is selected
   */
  isLevelSelected(level: number): boolean {
    const levels: number[] =
      this.configForm.get('difficultyLevels')?.value || [];
    return levels.includes(level);
  }

  /**
   * Update count of available verbs based on filters
   */
  updateAvailableVerbsCount(): void {
    const config = this.configForm.value as VocabQuizConfig;
    const filters: VerbFilters = {
      difficultyLevels: config.difficultyLevels,
      verbTypes: config.includeAllTypes ? undefined : [],
    };

    this.availableVerbsCount = this.verbService.getVerbCount(filters);
  }

  /**
   * Toggle preview section
   */
  togglePreview(): void {
    this.showPreview = !this.showPreview;
    if (this.showPreview) {
      this.updatePreviewVerbs();
    }
  }

  /**
   * Update preview verbs
   */
  updatePreviewVerbs(): void {
    const config = this.configForm.value as VocabQuizConfig;
    const filters: VerbFilters = {
      difficultyLevels: config.difficultyLevels,
      verbTypes: config.includeAllTypes ? undefined : [],
    };

    this.previewVerbs = this.verbService.getRandomVerbs(5, filters);
  }

  /**
   * Reset form to defaults
   */
  resetToDefaults(): void {
    this.vocabConfigService.resetToDefaults();
    const defaultConfig = this.vocabConfigService.getConfig();
    this.configForm.patchValue(defaultConfig);
  }

  /**
   * Start the vocabulary quiz
   */
  startQuiz(): void {
    if (this.configForm.invalid) {
      this.configForm.markAllAsTouched();
      return;
    }

    const config = this.configForm.value as VocabQuizConfig;

    // Validate we have enough verbs
    if (this.availableVerbsCount < config.verbCount) {
      alert(
        `Not enough verbs available. You selected ${config.verbCount} verbs but only ${this.availableVerbsCount} are available with your current filters.`
      );
      return;
    }

    // Save config and navigate to test
    this.vocabConfigService.updateConfig(config);
    this.router.navigate(['/vocab-quiz/test']);
  }

  /**
   * Get difficulty level label
   */
  getDifficultyLabel(level: number): string {
    const option = this.difficultyLevelOptions.find((o) => o.level === level);
    return option
      ? `${option.label} (${option.description})`
      : `Level ${level}`;
  }
}

import { Injectable } from '@angular/core';
import { v4 as uuidv4 } from 'uuid';
import { VerbService } from './verb.service';
import { Question, QuizResult } from '../models';
import { TestConfig, VerbType } from '../../../core/models';

@Injectable({
  providedIn: 'root',
})
export class QuizService {
  constructor(private verbService: VerbService) {
    console.log('📝 QuizService initialized');
  }

  /**
   * Generate quiz questions based on configuration
   * Returns array of Question objects without user answers
   */
  /**
   * Generate quiz questions based on configuration
   * Returns array of Question objects without user answers
   */
  generateQuestions(config: TestConfig): Question[] {
    console.log('🎯 Generating questions with config:', config);

    // Validate that we have enough verbs
    if (
      !this.verbService.hasEnoughVerbs(config.questionCount, {
        verbTypes: config.verbTypes as VerbType[],
        difficultyLevels: config.difficultyLevels,
        infinitives: config.specificVerbs,
      })
    ) {
      console.warn(
        '⚠️ Not enough verbs matching criteria, using all available verbs'
      );
    }

    // Get verbs that have all required conjugations
    const availableVerbs = this.verbService.getVerbsWithConjugations(
      config.tenses,
      config.persons,
      {
        verbTypes: config.verbTypes as VerbType[],
        difficultyLevels: config.difficultyLevels,
        infinitives: config.specificVerbs,
      }
    );

    if (availableVerbs.length === 0) {
      console.error('❌ No verbs available matching the configuration');
      return [];
    }

    console.log(`✅ Found ${availableVerbs.length} verbs matching criteria`);

    // Generate all possible combinations
    const allCombinations: Array<{
      verb: any;
      tense: string;
      person: string;
    }> = [];

    for (const verb of availableVerbs) {
      for (const tense of config.tenses) {
        for (const person of config.persons) {
          // Verify this combination has a valid conjugation
          const conjugation = this.verbService.getConjugation(
            verb,
            tense,
            person
          );
          if (conjugation) {
            allCombinations.push({ verb, tense, person });
          }
        }
      }
    }

    // Shuffle all combinations using Fisher-Yates
    for (let i = allCombinations.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [allCombinations[i], allCombinations[j]] = [
        allCombinations[j],
        allCombinations[i],
      ];
    }

    // Take the first N combinations
    const actualQuestionCount = Math.min(
      config.questionCount,
      allCombinations.length
    );
    const selectedCombinations = allCombinations.slice(0, actualQuestionCount);

    // Generate questions from selected combinations
    const questions: Question[] = selectedCombinations.map((combo) => {
      const correctAnswer = this.verbService.getConjugation(
        combo.verb,
        combo.tense,
        combo.person
      )!;

      return {
        id: uuidv4(),
        verb: combo.verb,
        tense: combo.tense,
        person: combo.person,
        correctAnswer,
        questionText: this.generateQuestionText(
          combo.verb,
          combo.tense,
          combo.person
        ),
      };
    });

    console.log(`✅ Generated ${questions.length} questions`);
    return questions;
  }

  /**
   * Generate human-readable question text
   */
  private generateQuestionText(
    verb: any,
    tense: string,
    person: string
  ): string {
    const tenseLabels: Record<string, string> = {
      präsens: 'Present',
      präteritum: 'Simple Past',
      perfekt: 'Present Perfect',
      plusquamperfekt: 'Past Perfect',
      futur: 'Future',
    };

    const personLabels: Record<string, string> = {
      ich: 'I',
      du: 'you (informal)',
      er: 'he/she/it',
      wir: 'we',
      ihr: 'you (plural)',
      sie: 'they/you (formal)',
    };

    const tenseLabel = tenseLabels[tense] || tense;
    const personLabel = personLabels[person] || person;

    return `Conjugate "${verb.infinitive}" (${verb.english_translation}) in ${tenseLabel} for "${personLabel}" (${person})`;
  }

  /**
   * Validate a single answer against the question
   */
  validateAnswer(question: Question, userAnswer: string): boolean {
    const normalized = this.normalizeAnswer(userAnswer);
    const correctNormalized = this.normalizeAnswer(question.correctAnswer);

    return normalized === correctNormalized;
  }

  /**
   * Normalize answer string for comparison
   * Handles case, whitespace, and special characters
   */
  private normalizeAnswer(answer: string): string {
    return answer
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .replace(/[.,!?;:]/g, ''); // Remove punctuation
  }

  /**
   * Score the entire quiz
   * Returns QuizResult with all questions, scores, and statistics
   */
  scoreQuiz(
    questions: Question[],
    userAnswers: Map<string, string>,
    startTime?: Date
  ): QuizResult {
    console.log('📊 Scoring quiz...');

    let correctCount = 0;
    const scoredQuestions: Question[] = [];

    // Score each question
    questions.forEach((question) => {
      const userAnswer = userAnswers.get(question.id) || '';
      const isCorrect = this.validateAnswer(question, userAnswer);

      if (isCorrect) {
        correctCount++;
      }

      // Create scored question
      const scoredQuestion: Question = {
        ...question,
        userAnswer,
        isCorrect,
      };

      scoredQuestions.push(scoredQuestion);
    });

    // Calculate statistics
    const totalQuestions = questions.length;
    const percentage =
      totalQuestions > 0 ? (correctCount / totalQuestions) * 100 : 0;

    // Calculate duration if start time provided
    let duration: number | undefined;
    if (startTime) {
      const endTime = new Date();
      duration = Math.floor((endTime.getTime() - startTime.getTime()) / 1000);
    }

    const result: QuizResult = {
      questions: scoredQuestions,
      score: correctCount,
      totalQuestions,
      percentage: Math.round(percentage * 100) / 100, // Round to 2 decimal places
      duration,
      timestamp: new Date(),
    };

    console.log(
      `✅ Quiz scored: ${correctCount}/${totalQuestions} (${result.percentage}%)`
    );

    return result;
  }

  /**
   * Get a hint for a question
   * Returns the first letter(s) of the correct answer
   */
  getHint(question: Question, level: number = 1): string {
    const answer = question.correctAnswer;
    const revealLength = Math.min(level, Math.floor(answer.length / 2));

    return answer.substring(0, revealLength) + '...';
  }

  /**
   * Check if answer is partially correct (useful for feedback)
   */
  isPartiallyCorrect(question: Question, userAnswer: string): boolean {
    const normalized = this.normalizeAnswer(userAnswer);
    const correctNormalized = this.normalizeAnswer(question.correctAnswer);

    if (normalized.length < 2) {
      return false;
    }

    // Check if user answer starts with correct answer or vice versa
    return (
      correctNormalized.startsWith(normalized) ||
      normalized.startsWith(correctNormalized)
    );
  }

  /**
   * Get difficulty rating for a verb (helper method)
   */
  getVerbDifficulty(verb: any): string {
    const level = verb.difficulty_level;

    if (level <= 1) return 'Very Easy';
    if (level === 2) return 'Easy';
    if (level === 3) return 'Medium';
    if (level === 4) return 'Hard';
    return 'Very Hard';
  }

  /**
   * Helper method to pick random element from array
   */
  private pickRandom<T>(array: T[]): T {
    const index = Math.floor(Math.random() * array.length);
    return array[index];
  }

  /**
   * Validate quiz configuration before generating questions
   */
  validateConfiguration(config: TestConfig): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!config.tenses || config.tenses.length === 0) {
      errors.push('At least one tense must be selected');
    }

    if (!config.verbTypes || config.verbTypes.length === 0) {
      errors.push('At least one verb type must be selected');
    }

    if (!config.persons || config.persons.length === 0) {
      errors.push('At least one person must be selected');
    }

    if (config.questionCount < 1) {
      errors.push('Question count must be at least 1');
    }

    if (config.questionCount > 100) {
      errors.push('Question count cannot exceed 100');
    }

    // Check if enough verbs are available
    const availableVerbs = this.verbService.getVerbsWithConjugations(
      config.tenses,
      config.persons,
      {
        verbTypes: config.verbTypes as VerbType[],
        difficultyLevels: config.difficultyLevels,
        infinitives: config.specificVerbs,
      }
    );

    if (availableVerbs.length === 0) {
      errors.push('No verbs available matching the selected criteria');
    } else if (availableVerbs.length < config.questionCount) {
      errors.push(
        `Only ${availableVerbs.length} verbs available, but ${config.questionCount} questions requested`
      );
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Get statistics for a quiz result
   */
  getQuizStatistics(result: QuizResult): {
    correctByTense: Record<string, { correct: number; total: number }>;
    correctByPerson: Record<string, { correct: number; total: number }>;
    correctByVerbType: Record<string, { correct: number; total: number }>;
  } {
    const correctByTense: Record<string, { correct: number; total: number }> =
      {};
    const correctByPerson: Record<string, { correct: number; total: number }> =
      {};
    const correctByVerbType: Record<
      string,
      { correct: number; total: number }
    > = {};

    result.questions.forEach((q) => {
      // By tense
      if (!correctByTense[q.tense]) {
        correctByTense[q.tense] = { correct: 0, total: 0 };
      }
      correctByTense[q.tense].total++;
      if (q.isCorrect) correctByTense[q.tense].correct++;

      // By person
      if (!correctByPerson[q.person]) {
        correctByPerson[q.person] = { correct: 0, total: 0 };
      }
      correctByPerson[q.person].total++;
      if (q.isCorrect) correctByPerson[q.person].correct++;

      // By verb type
      const verbType = q.verb.verb_type;
      if (!correctByVerbType[verbType]) {
        correctByVerbType[verbType] = { correct: 0, total: 0 };
      }
      correctByVerbType[verbType].total++;
      if (q.isCorrect) correctByVerbType[verbType].correct++;
    });

    return { correctByTense, correctByPerson, correctByVerbType };
  }
}

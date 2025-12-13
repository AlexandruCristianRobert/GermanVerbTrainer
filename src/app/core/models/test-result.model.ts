// Update e:\Projects\Angular\German Verbs\german-verb-trainer\src\app\core\models\test-result.model.ts

import { TestConfig } from './test-config.model';

export interface Answer {
  verb: string;
  tense: string;
  person: string;
  correctAnswer: string;
  userAnswer: string;
  isCorrect: boolean;
  verb_type: string;
  difficulty_level: number;
}

export interface VocabAnswer {
  infinitive: string;
  correctAnswer: string;
  userAnswer: string;
  isCorrect: boolean;
}

export interface TestResult {
  id: string;
  user_id?: string | null;
  test_date: string;
  test_type: 'conjugation' | 'vocabulary';
  score: number;
  total_questions: number;
  percentage: number;
  test_configuration: any; // Changed from TestConfig to any to support both quiz types
  answers: Answer[] | VocabAnswer[];
  duration_seconds?: number | null;
  synced: boolean;
  synced_at?: string | null;
  client_generated_id: string;
}

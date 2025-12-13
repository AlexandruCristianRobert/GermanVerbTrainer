import { Verb } from '../../../core/models';

export interface Question {
  id: string; // Unique identifier for this question
  verb: Verb; // The verb being tested
  tense: string; // Which tense (präsens, präteritum, etc.)
  person: string; // Which person (ich, du, er, etc.)
  correctAnswer: string; // The correct conjugation
  userAnswer?: string; // User's submitted answer
  isCorrect?: boolean; // Whether the answer was correct
  questionText: string; // Human-readable question
}

export interface QuizResult {
  questions: Question[]; // All questions with answers
  score: number; // Number of correct answers
  totalQuestions: number; // Total number of questions
  percentage: number; // Score as percentage
  duration?: number; // Time taken in seconds (optional)
  timestamp: Date; // When the quiz was completed
}

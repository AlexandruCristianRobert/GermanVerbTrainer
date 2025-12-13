import { Verb } from '../../../core/models';

export interface VocabQuestion {
  verb: Verb;
  userAnswer: string;
  isCorrect?: boolean;
  submitted: boolean;
}

export interface VocabQuizState {
  questions: VocabQuestion[];
  currentIndex: number;
  score: number;
  startTime: Date;
  endTime?: Date;
}

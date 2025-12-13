import { Verb } from './verb.model';

export interface Question {
  id: string;
  verb: Verb;
  tense: string;
  person: string;
  correctAnswer: string;
  userAnswer?: string;
}

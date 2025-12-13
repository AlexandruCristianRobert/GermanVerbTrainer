export interface Verb {
  id: string;
  infinitive: string;
  english_translation: string;
  verb_type: VerbType;
  stem: string;
  conjugations: VerbConjugations;
  difficulty_level: number;
  created_at: string;
}

export type VerbType = 'weak' | 'strong' | 'irregular' | 'modal';

export interface VerbConjugations {
  präsens?: PersonConjugations;
  präteritum?: PersonConjugations;
  perfekt?: PersonConjugations;
  plusquamperfekt?: PersonConjugations;
  futur?: PersonConjugations;
  [tense: string]: PersonConjugations | undefined;
}

export interface PersonConjugations {
  ich: string;
  du: string;
  er: string;
  wir: string;
  ihr: string;
  sie: string;
  [person: string]: string;
}

export interface VerbFilters {
  verbTypes?: VerbType[];
  difficultyLevels?: number[];
  infinitives?: string[];
}

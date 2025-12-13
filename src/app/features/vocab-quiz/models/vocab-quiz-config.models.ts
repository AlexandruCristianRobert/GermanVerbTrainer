export interface VocabQuizConfig {
  verbCount: number; // 5-100
  difficultyLevels: number[]; // [1, 2, 3] where 1=A1-A2, 2=B1-B2, 3=C1-C2
  includeAllTypes: boolean;
}

export const DEFAULT_VOCAB_CONFIG: VocabQuizConfig = {
  verbCount: 20,
  difficultyLevels: [1, 2],
  includeAllTypes: true,
};

export interface DifficultyLevelOption {
  level: number;
  label: string;
  description: string;
  cefr: string[];
}

export const DIFFICULTY_LEVEL_OPTIONS: DifficultyLevelOption[] = [
  {
    level: 1,
    label: 'Beginner',
    description: 'A1-A2',
    cefr: ['A1', 'A2'],
  },
  {
    level: 2,
    label: 'Intermediate',
    description: 'B1-B2',
    cefr: ['B1', 'B2'],
  },
  {
    level: 3,
    label: 'Advanced',
    description: 'C1-C2',
    cefr: ['C1', 'C2'],
  },
];

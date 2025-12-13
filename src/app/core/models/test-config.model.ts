export interface TestConfig {
  tenses: string[];
  verbTypes: string[];
  persons: string[];
  questionCount: number;
  difficultyLevels?: number[];
  specificVerbs?: string[];
}

export const DEFAULT_TEST_CONFIG: TestConfig = {
  tenses: ['präsens'],
  verbTypes: ['weak', 'strong'],
  persons: ['ich', 'du', 'er'],
  questionCount: 10,
  difficultyLevels: [1, 2, 3],
};

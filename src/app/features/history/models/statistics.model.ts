export interface Statistics {
  totalTests: number;
  totalQuestions: number;
  totalCorrect: number;
  averageScore: number;
  averagePercentage: number;
  bestScore: number;
  worstScore: number;
  bestPercentage: number;
  worstPercentage: number;
  totalDuration: number;
  averageDuration: number;

  // Breakdown by tense
  byTense: {
    [tense: string]: {
      totalQuestions: number;
      correctAnswers: number;
      percentage: number;
    };
  };

  // Breakdown by verb type
  byVerbType: {
    [verbType: string]: {
      totalQuestions: number;
      correctAnswers: number;
      percentage: number;
    };
  };

  // Breakdown by person
  byPerson: {
    [person: string]: {
      totalQuestions: number;
      correctAnswers: number;
      percentage: number;
    };
  };

  // Breakdown by difficulty
  byDifficulty: {
    [level: number]: {
      totalQuestions: number;
      correctAnswers: number;
      percentage: number;
    };
  };

  // Performance trend
  trend: {
    improving: boolean;
    recentAverage: number;
    olderAverage: number;
    changePercentage: number;
  };
}

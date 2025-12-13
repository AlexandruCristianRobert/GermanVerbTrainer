export interface HistoryFilters {
  dateFrom?: Date;
  dateTo?: Date;
  minScore?: number;
  maxScore?: number;
  tenses?: string[];
  verbTypes?: string[];
  difficultyLevels?: number[];
  syncedOnly?: boolean;
  unsyncedOnly?: boolean;
}

export interface SyncResult {
  success: boolean;
  message: string;
  syncedCount?: number;
  failedCount?: number;
  timestamp: string;
}

export interface SyncStats {
  totalResults: number;
  syncedResults: number;
  unsyncedResults: number;
  lastSyncTime: Date | null;
}

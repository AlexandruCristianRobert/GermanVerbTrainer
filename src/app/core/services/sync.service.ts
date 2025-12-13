import { Injectable } from '@angular/core';
import { Observable, from, of } from 'rxjs';
import { map, catchError, tap, switchMap } from 'rxjs/operators';
import { TestResult, SyncResult, SyncStats } from '../models';
import { StorageService } from './storage.service';
import { SupabaseService } from './supabase.service';

@Injectable({
  providedIn: 'root',
})
export class SyncService {
  constructor(
    private storageService: StorageService,
    private supabaseService: SupabaseService
  ) {
    console.log('🔄 SyncService initialized');
  }

  // Get unsynced results from localStorage
  getUnsyncedResults(): TestResult[] {
    const allResults = this.storageService.getTestResults();
    const unsynced = allResults.filter((result) => !result.synced);
    console.log(
      `📊 Found ${unsynced.length} unsynced results out of ${allResults.length} total`
    );
    return unsynced;
  }

  // Upload history to Supabase (user triggered)
  uploadHistory(): Observable<SyncResult> {
    console.log('⬆️ Starting history upload...');

    const unsyncedResults = this.getUnsyncedResults();

    if (unsyncedResults.length === 0) {
      console.log('✅ No unsynced results to upload');
      return of({
        success: true,
        message: 'No unsynced results to upload',
        syncedCount: 0,
        failedCount: 0,
        timestamp: new Date().toISOString(),
      });
    }

    console.log(
      `📤 Uploading ${unsyncedResults.length} results to Supabase...`
    );

    return this.supabaseService.uploadResults(unsyncedResults).pipe(
      tap(() => {
        // Mark all results as synced in localStorage
        unsyncedResults.forEach((result) => {
          this.storageService.updateTestResult(result.id, {
            synced: true,
            synced_at: new Date().toISOString(),
          });
        });

        // Save sync timestamp
        this.storageService.saveLastSyncTime(new Date());

        console.log(
          `✅ Successfully uploaded ${unsyncedResults.length} results`
        );
      }),
      map(() => ({
        success: true,
        message: `Successfully uploaded ${unsyncedResults.length} result(s)`,
        syncedCount: unsyncedResults.length,
        failedCount: 0,
        timestamp: new Date().toISOString(),
      })),
      catchError((error) => {
        console.error('❌ Upload failed:', error);
        return of({
          success: false,
          message: error.message || 'Failed to upload results to server',
          syncedCount: 0,
          failedCount: unsyncedResults.length,
          timestamp: new Date().toISOString(),
        });
      })
    );
  }

  // Download history from Supabase
  downloadHistory(userId?: string): Observable<TestResult[]> {
    console.log('⬇️ Downloading history from Supabase...');

    return this.supabaseService.downloadHistory(userId).pipe(
      map((serverResults) => {
        console.log(
          `📥 Downloaded ${serverResults.length} results from server`
        );

        // Get local results
        const localResults = this.storageService.getTestResults();

        // Create a map of existing local results by client_generated_id
        const localResultsMap = new Map<string, TestResult>();
        localResults.forEach((result) => {
          localResultsMap.set(result.client_generated_id, result);
        });

        // Add server results that don't exist locally
        let newResultsCount = 0;
        serverResults.forEach((serverResult) => {
          if (!localResultsMap.has(serverResult.client_generated_id)) {
            // Mark as synced since it came from server
            const resultToSave: TestResult = {
              ...serverResult,
              synced: true,
            };
            this.storageService.saveTestResult(resultToSave);
            newResultsCount++;
          }
        });

        console.log(
          `✅ Added ${newResultsCount} new results from server to localStorage`
        );

        // Return merged results
        return this.storageService.getTestResults();
      }),
      tap(() => {
        // Save sync timestamp
        this.storageService.saveLastSyncTime(new Date());
      }),
      catchError((error) => {
        console.error('❌ Download failed:', error);
        // Return local results on error
        return of(this.storageService.getTestResults());
      })
    );
  }

  // Get last sync time
  getLastSyncTime(): Date | null {
    return this.storageService.getLastSyncTime();
  }

  // Get sync statistics
  getSyncStats(): SyncStats {
    const allResults = this.storageService.getTestResults();
    const syncedResults = allResults.filter((r) => r.synced);
    const unsyncedResults = allResults.filter((r) => !r.synced);

    const stats: SyncStats = {
      totalResults: allResults.length,
      syncedResults: syncedResults.length,
      unsyncedResults: unsyncedResults.length,
      lastSyncTime: this.getLastSyncTime(),
    };

    console.log('📊 Sync Stats:', stats);
    return stats;
  }

  clearSyncedResults(): number {
    console.log('🗑️ Clearing synced results from localStorage...');

    const allResults = this.storageService.getTestResults();
    const unsyncedResults = allResults.filter((r) => !r.synced);
    const syncedCount = allResults.length - unsyncedResults.length;

    if (syncedCount === 0) {
      console.log('✅ No synced results to clear');
      return 0;
    }

    // Delete all synced results
    allResults.forEach((result) => {
      if (result.synced) {
        this.storageService.deleteTestResult(result.id);
      }
    });

    console.log(`✅ Cleared ${syncedCount} synced results from localStorage`);
    return syncedCount;
  }
}

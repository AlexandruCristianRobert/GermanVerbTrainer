import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Observable, from, throwError, of } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { Verb, TestResult } from '../models';

@Injectable({
  providedIn: 'root',
})
export class SupabaseService {
  private supabase: SupabaseClient;

  constructor() {
    if (typeof window !== 'undefined') {
      try {
        const authKey = 'sb-zbebdpbdtsyoyilzhbbc-auth-token';
        const stored = window.localStorage.getItem(authKey);
        if (stored) {
          JSON.parse(stored);
        }
      } catch (e) {
        window.localStorage.removeItem('sb-zbebdpbdtsyoyilzhbbc-auth-token');
      }
    }

    this.supabase = createClient(
      environment.supabaseUrl,
      environment.supabaseAnonKey,
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: false,
          flowType: 'pkce',
          storageKey: 'sb-zbebdpbdtsyoyilzhbbc-auth-token',
          storage: {
            getItem: (key) => {
              if (typeof window === 'undefined') return null;
              return window.localStorage.getItem(key);
            },
            setItem: (key, value) => {
              if (typeof window === 'undefined') return;
              window.localStorage.setItem(key, value);
            },
            removeItem: (key) => {
              if (typeof window === 'undefined') return;
              window.localStorage.removeItem(key);
            },
          },
          // CRITICAL: Custom lock function that bypasses Navigator LockManager
          lock: async (
            name: string,
            acquireTimeout: number,
            fn: () => Promise<any>
          ) => {
            // Simply execute the function without any locking mechanism
            try {
              return await fn();
            } catch (error) {
              console.error('Lock function error:', error);
              throw error;
            }
          },
        },
        global: {
          headers: {
            'x-client-info': 'german-verb-trainer@1.0.0',
          },
        },
      }
    );

    if (environment.enableDebugLogging) {
      console.log('✅ Supabase client initialized');
    }
  }

  /**
   * Expose Supabase client for direct access
   * Use sparingly - prefer specific methods below
   */
  getClient(): SupabaseClient {
    return this.supabase;
  }

  /**
   * Load all verbs from the database
   * Called ONCE on app initialization
   *
   * @returns Observable<Verb[]> - Array of all verbs
   */
  loadAllVerbs(): Observable<Verb[]> {
    if (environment.enableDebugLogging) {
      console.log('📥 Loading all verbs from Supabase...');
    }

    // Convert Supabase Promise to Observable
    return from(
      this.supabase
        .from('verbs')
        .select('*')
        .order('infinitive', { ascending: true })
    ).pipe(
      map((response) => {
        if (response.error) {
          throw response.error;
        }

        const verbs = response.data as Verb[];

        if (environment.enableDebugLogging) {
          console.log(`✅ Loaded ${verbs.length} verbs from Supabase`);
        }

        return verbs;
      }),
      catchError((error) => {
        console.error('❌ Failed to load verbs from Supabase:', error);

        // Return empty array instead of throwing
        // App can still work with cached/fallback data
        return of([]);
      })
    );
  }

  /**
   * Upload test results to Supabase
   * Called when user clicks "Upload History" button
   * Uses ON CONFLICT to prevent duplicates
   *
   * @param results - Array of test results to upload
   * @returns Observable<void>
   */
  uploadResults(results: TestResult[]): Observable<void> {
    if (results.length === 0) {
      if (environment.enableDebugLogging) {
        console.log('ℹ️ No results to upload');
      }
      return of(void 0);
    }

    if (environment.enableDebugLogging) {
      console.log(`📤 Uploading ${results.length} test results to Supabase...`);
    }

    // Prepare data for database (remove local-only fields)
    const dataToUpload = results.map((result) => ({
      id: result.id,
      user_id: result.user_id || null,
      test_date: result.test_date,
      score: result.score,
      total_questions: result.total_questions,
      percentage: result.percentage,
      test_configuration: result.test_configuration,
      answers: result.answers,
      duration_seconds: result.duration_seconds || null,
      synced_from_client: new Date().toISOString(),
      client_generated_id: result.client_generated_id,
    }));

    return from(
      this.supabase.from('test_results').upsert(dataToUpload, {
        onConflict: 'client_generated_id', // Prevent duplicates
        ignoreDuplicates: false, // Update existing records
      })
    ).pipe(
      tap(() => {
        if (environment.enableDebugLogging) {
          console.log(`✅ Successfully uploaded ${results.length} results`);
        }
      }),
      map((response) => {
        if (response.error) {
          throw response.error;
        }
        return void 0;
      }),
      catchError((error) => {
        console.error('❌ Failed to upload results:', error);

        // Re-throw error so calling code can handle it
        return throwError(() => ({
          message: 'Failed to upload results to server',
          originalError: error,
        }));
      })
    );
  }

  /**
   * Download user's test history from Supabase
   * Optional feature for authenticated users
   *
   * @param userId - Optional user ID to filter by
   * @returns Observable<TestResult[]>
   */
  downloadHistory(userId?: string): Observable<TestResult[]> {
    if (environment.enableDebugLogging) {
      console.log('📥 Downloading test history from Supabase...');
    }

    // Build query
    let query = this.supabase
      .from('test_results')
      .select('*')
      .order('test_date', { ascending: false });

    // Filter by user ID if provided, otherwise get anonymous results
    if (userId) {
      query = query.eq('user_id', userId);
    } else {
      query = query.is('user_id', null);
    }

    return from(query).pipe(
      map((response) => {
        if (response.error) {
          throw response.error;
        }

        const dbResults = response.data as any[];

        if (environment.enableDebugLogging) {
          console.log(
            `✅ Downloaded ${dbResults.length} results from Supabase`
          );
        }

        // Add local-only fields
        return dbResults.map(
          (dbResult) =>
            ({
              id: dbResult.id,
              user_id: dbResult.user_id,
              test_date: dbResult.test_date,
              score: dbResult.score,
              total_questions: dbResult.total_questions,
              percentage: dbResult.percentage,
              test_configuration: dbResult.test_configuration,
              answers: dbResult.answers,
              duration_seconds: dbResult.duration_seconds,
              client_generated_id: dbResult.client_generated_id,
              synced: true, // Mark as synced since it came from server
              synced_at: dbResult.synced_from_client, // Map DB field to local field
            } as TestResult)
        );
      }),
      catchError((error) => {
        console.error('❌ Failed to download history:', error);

        // Return empty array instead of throwing
        return of([]);
      })
    );
  }

  /**
   * Test connection to Supabase
   * Useful for debugging and checking server status
   *
   * @returns Observable<boolean> - true if connected
   */
  testConnection(): Observable<boolean> {
    if (environment.enableDebugLogging) {
      console.log('🔍 Testing Supabase connection...');
    }

    return from(
      this.supabase.from('verbs').select('id', { count: 'exact', head: true })
    ).pipe(
      map((response) => {
        if (response.error) {
          throw response.error;
        }

        if (environment.enableDebugLogging) {
          console.log('✅ Supabase connection successful');
        }

        return true;
      }),
      catchError((error) => {
        console.error('❌ Supabase connection failed:', error);
        return of(false);
      })
    );
  }

  /**
   * Get count of verbs in database
   * Useful for verification and debugging
   *
   * @returns Observable<number>
   */
  getVerbCount(): Observable<number> {
    return from(
      this.supabase.from('verbs').select('id', { count: 'exact', head: true })
    ).pipe(
      map((response) => {
        if (response.error) {
          throw response.error;
        }
        return response.count || 0;
      }),
      catchError((error) => {
        console.error('❌ Failed to get verb count:', error);
        return of(0);
      })
    );
  }
}

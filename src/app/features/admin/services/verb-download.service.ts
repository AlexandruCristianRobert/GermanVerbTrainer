// e:\Projects\Angular\German Verbs\german-verb-trainer\src\app\features\admin\services\verb-download.service.ts

import { Injectable } from '@angular/core';
import { Observable, from } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { SupabaseService } from '../../../core/services/supabase.service';
import { Verb } from '../../../core/models/verb.model';

interface DownloadResult {
  success: boolean;
  verbs?: Verb[];
  error?: string;
}

@Injectable({
  providedIn: 'root',
})
export class VerbDownloadService {
  constructor(private supabaseService: SupabaseService) {
    console.log('📥 VerbDownloadService initialized');
  }

  /**
   * Download all verbs from the database
   */
  downloadAllVerbs(): Observable<DownloadResult> {
    console.log('📥 Downloading all verbs from database...');

    const client = this.supabaseService.getClient();

    return from(
      client.from('verbs').select('*').order('infinitive', { ascending: true })
    ).pipe(
      map(({ data, error }) => {
        if (error) {
          console.error('❌ Verb download failed:', error);
          return {
            success: false,
            error: error.message || 'Failed to download verbs',
          };
        }

        console.log(`✅ Downloaded ${data?.length || 0} verbs`);
        return {
          success: true,
          verbs: data as Verb[],
        };
      }),
      catchError((error) => {
        console.error('❌ Download error:', error);
        return from([
          {
            success: false,
            error: error.message || 'An unexpected error occurred',
          },
        ]);
      })
    );
  }

  /**
   * Export verbs to JSON file and trigger download
   */
  exportToJSON(verbs: Verb[], filename: string = 'verbs-export.json'): void {
    const jsonString = JSON.stringify(verbs, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    window.URL.revokeObjectURL(url);

    console.log(`✅ Exported ${verbs.length} verbs to ${filename}`);
  }
}

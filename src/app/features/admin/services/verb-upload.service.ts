// e:\Projects\Angular\German Verbs\german-verb-trainer\src\app\features\admin\services\verb-upload.service.ts

import { Injectable } from '@angular/core';
import { Observable, from } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { SupabaseService } from '../../../core/services/supabase.service';
import { Verb } from '../../../core/models/verb.model';

interface ValidationResult {
  valid: boolean;
  verbs?: Verb[];
  errors?: string[];
}

interface UploadResult {
  success: boolean;
  count: number;
  error?: string;
}

@Injectable({
  providedIn: 'root',
})
export class VerbUploadService {
  constructor(private supabaseService: SupabaseService) {
    console.log('📤 VerbUploadService initialized');
  }

  /**
   * Validate JSON string containing verbs
   */
  validateVerbsJSON(jsonString: string): ValidationResult {
    try {
      // Parse JSON
      const parsed = JSON.parse(jsonString);

      // Check if array
      if (!Array.isArray(parsed)) {
        return {
          valid: false,
          errors: ['JSON must be an array of verbs'],
        };
      }

      // Filter out empty objects BEFORE validation
      const nonEmptyItems = parsed.filter((item) => {
        return item && typeof item === 'object' && Object.keys(item).length > 0;
      });

      console.log(
        `📋 Found ${parsed.length} total items, ${nonEmptyItems.length} non-empty`
      );

      if (nonEmptyItems.length === 0) {
        return {
          valid: false,
          errors: ['No valid verb objects found in the file'],
        };
      }

      // Validate each verb and track duplicates
      const errors: string[] = [];
      const validVerbs: Verb[] = [];
      const infinitivesSeen = new Map<string, number>(); // Track first occurrence
      let duplicatesRemoved = 0;

      nonEmptyItems.forEach((item, index) => {
        const verbErrors = this.validateVerb(item, index);
        if (verbErrors.length > 0) {
          errors.push(...verbErrors);
          return; // Skip this verb, don't add to validVerbs
        }

        // Check for duplicate infinitives in the file
        if (item.infinitive) {
          const firstOccurrence = infinitivesSeen.get(item.infinitive);
          if (firstOccurrence !== undefined) {
            // This is a duplicate - skip it silently
            duplicatesRemoved++;
            return; // Skip duplicate, don't add to validVerbs
          } else {
            infinitivesSeen.set(item.infinitive, index);
          }
        }

        // Only add to validVerbs if no errors and not a duplicate
        validVerbs.push(item as Verb);
      });

      // Only show validation errors for actual problems, not duplicates
      if (errors.length > 0) {
        return { valid: false, errors };
      }

      // Log info about duplicates removed
      if (duplicatesRemoved > 0) {
        console.log(
          `ℹ️ Automatically removed ${duplicatesRemoved} duplicate verbs`
        );
      }

      console.log(
        `✅ Validated ${validVerbs.length} unique verbs successfully`
      );
      return {
        valid: true,
        verbs: validVerbs,
      };
    } catch (error) {
      return {
        valid: false,
        errors: ['Invalid JSON format: ' + (error as Error).message],
      };
    }
  }

  /**
   * Validate individual verb object
   */
  private validateVerb(verb: any, index: number): string[] {
    const errors: string[] = [];
    const prefix = `Verb ${index + 1}`;
    const verbName = verb.infinitive ? ` ("${verb.infinitive}")` : '';

    // Check if verb is empty object
    if (Object.keys(verb).length === 0) {
      errors.push(`${prefix}: Empty verb object`);
      return errors; // Return early if empty
    }

    // Check if verb has only "conjugations" field without data
    if (Object.keys(verb).length === 1 && verb.conjugations) {
      errors.push(
        `${prefix}: Verb has only conjugations field without other required data`
      );
      return errors;
    }

    // Required fields
    if (!verb.infinitive || typeof verb.infinitive !== 'string') {
      errors.push(`${prefix}: Missing or invalid 'infinitive' field`);
    }
    if (
      !verb.english_translation ||
      typeof verb.english_translation !== 'string'
    ) {
      errors.push(
        `${prefix}${verbName}: Missing or invalid 'english_translation' field`
      );
    }
    if (!verb.verb_type || typeof verb.verb_type !== 'string') {
      errors.push(`${prefix}${verbName}: Missing or invalid 'verb_type' field`);
    } else {
      // Validate verb_type value
      const validTypes = ['weak', 'strong', 'irregular', 'modal'];
      if (!validTypes.includes(verb.verb_type)) {
        errors.push(
          `${prefix}${verbName}: Invalid 'verb_type' "${
            verb.verb_type
          }". Must be one of: ${validTypes.join(', ')}`
        );
      }
    }

    if (!verb.stem || typeof verb.stem !== 'string') {
      errors.push(`${prefix}${verbName}: Missing or invalid 'stem' field`);
    }

    // Difficulty level
    if (
      typeof verb.difficulty_level !== 'number' ||
      verb.difficulty_level < 1 ||
      verb.difficulty_level > 5
    ) {
      errors.push(
        `${prefix}${verbName}: 'difficulty_level' must be a number between 1 and 5`
      );
    }

    // Conjugations
    if (!verb.conjugations || typeof verb.conjugations !== 'object') {
      errors.push(
        `${prefix}${verbName}: Missing or invalid 'conjugations' field`
      );
    } else {
      // Check that conjugations has at least one tense
      const tenses = Object.keys(verb.conjugations);
      if (tenses.length === 0) {
        errors.push(
          `${prefix}${verbName}: 'conjugations' must have at least one tense`
        );
      }

      // Validate each tense
      tenses.forEach((tense) => {
        const tenseConjugations = verb.conjugations[tense];
        if (typeof tenseConjugations !== 'object') {
          errors.push(
            `${prefix}${verbName}: Conjugations for '${tense}' must be an object`
          );
          return;
        }

        // Check that each tense has person keys with string values
        const persons = Object.keys(tenseConjugations);
        if (persons.length === 0) {
          errors.push(
            `${prefix}${verbName}: Tense '${tense}' must have at least one person conjugation`
          );
        }

        persons.forEach((person) => {
          if (typeof tenseConjugations[person] !== 'string') {
            errors.push(
              `${prefix}${verbName}: Conjugation for '${tense}' - '${person}' must be a string`
            );
          }
        });
      });
    }

    return errors;
  }

  /**
   * Upload verbs to Supabase (insert only, will fail on duplicates)
   */
  uploadVerbs(verbs: Verb[]): Observable<UploadResult> {
    console.log(`📤 Uploading ${verbs.length} verbs to Supabase...`);

    const client = this.supabaseService.getClient();

    return from(client.from('verbs').insert(verbs).select()).pipe(
      map(({ data, error }) => {
        if (error) {
          console.error('❌ Verb upload failed:', error);

          // Enhanced error message for duplicate key violations
          let errorMessage = error.message || 'Upload failed';

          if (
            error.code === '23505' &&
            error.message.includes('verbs_infinitive_key')
          ) {
            // Extract the duplicate value if possible from error details
            const duplicateMatch = error.message.match(
              /Key \(infinitive\)=\(([^)]+)\)/
            );
            const duplicateVerb = duplicateMatch
              ? duplicateMatch[1]
              : 'unknown';

            errorMessage = `Duplicate verb infinitive: "${duplicateVerb}" already exists in the database. Please remove duplicates or update existing verbs instead.`;
          }

          return {
            success: false,
            count: 0,
            error: errorMessage,
          };
        }

        console.log(`✅ Successfully uploaded ${data?.length || 0} verbs`);
        return {
          success: true,
          count: data?.length || 0,
        };
      }),
      catchError((error) => {
        console.error('❌ Upload error:', error);
        return from([
          {
            success: false,
            count: 0,
            error: error.message || 'An unexpected error occurred',
          },
        ]);
      })
    );
  }

  /**   * Upsert verbs to Supabase (insert new or update existing based on ID)
   */
  upsertVerbs(verbs: Verb[]): Observable<UploadResult> {
    console.log(`🔄 Upserting ${verbs.length} verbs to Supabase...`);

    const client = this.supabaseService.getClient();

    // Use upsert with onConflict on the 'id' column
    return from(
      client.from('verbs').upsert(verbs, { onConflict: 'id' }).select()
    ).pipe(
      map(({ data, error }) => {
        if (error) {
          console.error('❌ Verb upsert failed:', error);
          return {
            success: false,
            count: 0,
            error: error.message || 'Upsert failed',
          };
        }

        console.log(`✅ Successfully upserted ${data?.length || 0} verbs`);
        return {
          success: true,
          count: data?.length || 0,
        };
      }),
      catchError((error) => {
        console.error('❌ Upsert error:', error);
        return from([
          {
            success: false,
            count: 0,
            error: error.message || 'An unexpected error occurred',
          },
        ]);
      })
    );
  }

  /**   * Generate template JSON for verb structure
   */
  generateTemplate(): string {
    const template = [
      {
        infinitive: 'sein',
        english_translation: 'to be',
        verb_type: 'irregular',
        stem: 'sei',
        difficulty_level: 1,
        conjugations: {
          präsens: {
            ich: 'bin',
            du: 'bist',
            er: 'ist',
            wir: 'sind',
            ihr: 'seid',
            sie: 'sind',
          },
          präteritum: {
            ich: 'war',
            du: 'warst',
            er: 'war',
            wir: 'waren',
            ihr: 'wart',
            sie: 'waren',
          },
          perfekt: {
            ich: 'bin gewesen',
            du: 'bist gewesen',
            er: 'ist gewesen',
            wir: 'sind gewesen',
            ihr: 'seid gewesen',
            sie: 'sind gewesen',
          },
        },
      },
      {
        infinitive: 'haben',
        english_translation: 'to have',
        verb_type: 'irregular',
        stem: 'hab',
        difficulty_level: 1,
        conjugations: {
          präsens: {
            ich: 'habe',
            du: 'hast',
            er: 'hat',
            wir: 'haben',
            ihr: 'habt',
            sie: 'haben',
          },
          präteritum: {
            ich: 'hatte',
            du: 'hattest',
            er: 'hatte',
            wir: 'hatten',
            ihr: 'hattet',
            sie: 'hatten',
          },
          perfekt: {
            ich: 'habe gehabt',
            du: 'hast gehabt',
            er: 'hat gehabt',
            wir: 'haben gehabt',
            ihr: 'habt gehabt',
            sie: 'haben gehabt',
          },
        },
      },
    ];

    return JSON.stringify(template, null, 2);
  }
}

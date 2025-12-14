// e:\Projects\Angular\German Verbs\german-verb-trainer\src\app\features\admin\components\verb-upload\verb-upload.component.ts

import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { VerbUploadService } from '../../services/verb-upload.service';
import { VerbDownloadService } from '../../services/verb-download.service';
import { CacheService } from '../../../../core/services/cache.service';
import { Verb } from '../../../../core/models/verb.model';

type UploadStatus = 'idle' | 'validating' | 'uploading' | 'success' | 'error';
type DownloadStatus = 'idle' | 'downloading' | 'success' | 'error';

@Component({
  selector: 'app-verb-upload',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './verb-upload.component.html',
  styleUrls: ['./verb-upload.component.scss'],
})
export class VerbUploadComponent {
  selectedFile: File | null = null;
  uploadStatus: UploadStatus = 'idle';
  downloadStatus: DownloadStatus = 'idle';
  validationErrors: string[] = [];
  uploadResult: { count: number; message: string } | null = null;
  downloadResult: { count: number; message: string } | null = null;
  isLoading = false;
  isDownloading = false;
  validatedVerbs: Verb[] | null = null;
  filePreview = '';

  constructor(
    private verbUploadService: VerbUploadService,
    private verbDownloadService: VerbDownloadService,
    private cacheService: CacheService,
    private router: Router
  ) {}

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) {
      return;
    }

    const file = input.files[0];

    // Check file type
    if (!file.name.endsWith('.json')) {
      this.validationErrors = ['Please select a JSON file'];
      this.uploadStatus = 'error';
      return;
    }

    // Reset state
    this.selectedFile = file;
    this.uploadStatus = 'idle';
    this.validationErrors = [];
    this.uploadResult = null;
    this.validatedVerbs = null;
    this.filePreview = '';

    console.log('✅ File selected:', file.name);

    // Auto-preview file
    this.previewFile();
  }

  previewFile(): void {
    if (!this.selectedFile) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      // Show first 500 characters
      this.filePreview =
        content.length > 500
          ? content.substring(0, 500) + '\n...(truncated)'
          : content;
    };
    reader.readAsText(this.selectedFile);
  }

  validateFile(): void {
    if (!this.selectedFile) {
      return;
    }

    this.uploadStatus = 'validating';
    this.isLoading = true;
    this.validationErrors = [];

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;

      // Validate JSON
      const result = this.verbUploadService.validateVerbsJSON(content);

      this.isLoading = false;

      if (result.valid && result.verbs) {
        console.log('✅ Validation successful:', result.verbs.length, 'verbs');
        this.uploadStatus = 'idle';
        this.validatedVerbs = result.verbs;
        this.validationErrors = [];
      } else {
        console.error('❌ Validation failed:', result.errors);
        this.uploadStatus = 'error';
        this.validationErrors = result.errors || ['Unknown validation error'];
        this.validatedVerbs = null;
      }
    };

    reader.onerror = () => {
      this.isLoading = false;
      this.uploadStatus = 'error';
      this.validationErrors = ['Failed to read file'];
    };

    reader.readAsText(this.selectedFile);
  }

  uploadVerbs(): void {
    if (!this.validatedVerbs || this.validatedVerbs.length === 0) {
      alert('Please validate the file first');
      return;
    }

    this.uploadStatus = 'uploading';
    this.isLoading = true;

    this.verbUploadService.uploadVerbs(this.validatedVerbs).subscribe({
      next: (result) => {
        this.isLoading = false;

        if (result.success) {
          console.log('✅ Upload successful:', result.count, 'verbs');
          this.uploadStatus = 'success';
          this.uploadResult = {
            count: result.count,
            message: `Successfully uploaded ${result.count} verbs!`,
          };

          // Clear and reload cache
          console.log('🔄 Reloading verb cache...');
          this.cacheService.clearCache();
          this.cacheService.initializeCache().then(() => {
            console.log('✅ Cache reloaded');
          });

          // Reset form after 3 seconds
          setTimeout(() => {
            this.resetForm();
          }, 3000);
        } else {
          console.error('❌ Upload failed:', result.error);
          this.uploadStatus = 'error';
          this.validationErrors = [result.error || 'Upload failed'];
        }
      },
      error: (err) => {
        this.isLoading = false;
        this.uploadStatus = 'error';
        console.error('❌ Upload error:', err);
        this.validationErrors = ['An unexpected error occurred during upload'];
      },
    });
  }

  downloadVerbs(): void {
    this.downloadStatus = 'downloading';
    this.isDownloading = true;
    this.downloadResult = null;

    this.verbDownloadService.downloadAllVerbs().subscribe({
      next: (result) => {
        this.isDownloading = false;

        if (result.success && result.verbs) {
          console.log('✅ Download successful:', result.verbs.length, 'verbs');
          this.downloadStatus = 'success';
          this.downloadResult = {
            count: result.verbs.length,
            message: `Successfully downloaded ${result.verbs.length} verbs!`,
          };

          // Generate filename with current date
          const date = new Date().toISOString().split('T')[0];
          const filename = `verbs-export-${date}.json`;

          // Export to JSON file
          this.verbDownloadService.exportToJSON(result.verbs, filename);

          // Reset download status after 3 seconds
          setTimeout(() => {
            this.downloadStatus = 'idle';
            this.downloadResult = null;
          }, 3000);
        } else {
          console.error('❌ Download failed:', result.error);
          this.downloadStatus = 'error';
          this.downloadResult = {
            count: 0,
            message: result.error || 'Download failed',
          };
        }
      },
      error: (err) => {
        this.isDownloading = false;
        this.downloadStatus = 'error';
        console.error('❌ Download error:', err);
        this.downloadResult = {
          count: 0,
          message: 'An unexpected error occurred during download',
        };
      },
    });
  }

  downloadTemplate(): void {
    const template = this.verbUploadService.generateTemplate();
    const blob = new Blob([template], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'verb-template.json';
    link.click();
    window.URL.revokeObjectURL(url);

    console.log('✅ Template downloaded');
  }

  resetForm(): void {
    this.selectedFile = null;
    this.uploadStatus = 'idle';
    this.validationErrors = [];
    this.uploadResult = null;
    this.validatedVerbs = null;
    this.filePreview = '';
  }

  mergeHintsFromJSON(): void {
    if (!this.selectedFile) {
      return;
    }

    if (
      !confirm(
        'This will merge hints from the JSON file with existing verbs in the database. Continue?'
      )
    ) {
      return;
    }

    this.uploadStatus = 'validating';
    this.isLoading = true;
    this.validationErrors = [];

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;

      try {
        const hintsData = JSON.parse(content);

        if (!Array.isArray(hintsData)) {
          throw new Error('JSON must be an array of verbs');
        }

        // Create a map of infinitive -> hint
        // Handle both "german" and "infinitive" properties from JSON
        const hintMap = new Map<string, string>();
        hintsData.forEach((verb: any) => {
          const infinitive = verb.infinitive || verb.german;
          if (infinitive && verb.hint) {
            hintMap.set(infinitive.toLowerCase(), verb.hint);
          }
        });

        console.log(`📝 Found ${hintMap.size} verbs with hints in JSON`);

        // Now fetch all existing verbs and update them
        this.verbDownloadService.downloadAllVerbs().subscribe({
          next: (result) => {
            if (result.success && result.verbs) {
              const verbsToUpdate = result.verbs.map((verb) => {
                const hint = hintMap.get(verb.infinitive.toLowerCase());
                if (hint) {
                  return { ...verb, hint };
                }
                return verb;
              });

              const updatedCount = verbsToUpdate.filter((v) => v.hint).length;
              console.log(`✅ Will update ${updatedCount} verbs with hints`);

              // Upsert the updated verbs (this will update existing records)
              this.verbUploadService.upsertVerbs(verbsToUpdate).subscribe({
                next: (uploadResult) => {
                  this.isLoading = false;

                  if (uploadResult.success) {
                    this.uploadStatus = 'success';
                    this.uploadResult = {
                      count: updatedCount,
                      message: `Successfully merged hints for ${updatedCount} verbs!`,
                    };

                    // Clear and reload cache
                    this.cacheService.clearCache();
                    this.cacheService.initializeCache().then(() => {
                      console.log('✅ Cache reloaded with hints');
                    });

                    setTimeout(() => {
                      this.resetForm();
                    }, 3000);
                  } else {
                    this.uploadStatus = 'error';
                    this.validationErrors = [
                      uploadResult.error || 'Hint merge failed',
                    ];
                  }
                },
                error: (err) => {
                  this.isLoading = false;
                  this.uploadStatus = 'error';
                  this.validationErrors = [
                    'Failed to upload updated verbs: ' + err.message,
                  ];
                },
              });
            } else {
              this.isLoading = false;
              this.uploadStatus = 'error';
              this.validationErrors = ['Failed to download existing verbs'];
            }
          },
          error: (err) => {
            this.isLoading = false;
            this.uploadStatus = 'error';
            this.validationErrors = [
              'Failed to fetch existing verbs: ' + err.message,
            ];
          },
        });
      } catch (error: any) {
        this.isLoading = false;
        this.uploadStatus = 'error';
        this.validationErrors = ['Invalid JSON format: ' + error.message];
      }
    };

    reader.onerror = () => {
      this.isLoading = false;
      this.uploadStatus = 'error';
      this.validationErrors = ['Failed to read file'];
    };

    reader.readAsText(this.selectedFile);
  }

  goBack(): void {
    this.router.navigate(['/config']);
  }
}

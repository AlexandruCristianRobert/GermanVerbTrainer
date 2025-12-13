// e:\Projects\Angular\German Verbs\german-verb-trainer\src\app\core\guards\data-loaded.guard.ts

import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { CacheService } from '../services/cache.service';
import { Observable, interval, of } from 'rxjs';
import { map, take, timeout, catchError } from 'rxjs/operators';

export const dataLoadedGuard: CanActivateFn = (route, state) => {
  const cacheService = inject(CacheService);
  const router = inject(Router);

  // If cache is already ready, allow immediately
  if (cacheService.isCacheReady()) {
    console.log('✅ Data Loaded Guard: Cache ready, allowing access');
    return true;
  }

  console.log('⏳ Data Loaded Guard: Waiting for cache to initialize...');

  // Wait for cache to initialize with timeout
  return interval(500).pipe(
    map(() => cacheService.isCacheReady()),
    // Take the first true value (cache ready)
    take(1),
    // Timeout after 30 seconds (adjust based on your needs)
    timeout(30000),
    map((isReady) => {
      if (isReady) {
        console.log('✅ Data Loaded Guard: Cache initialized, allowing access');
        return true;
      }

      console.error('❌ Data Loaded Guard: Cache not ready, redirecting');
      router.navigate(['/'], {
        queryParams: { error: 'data-not-loaded' },
      });
      return false;
    }),
    catchError((error) => {
      console.error(
        '❌ Data Loaded Guard: Timeout or error waiting for cache:',
        error
      );
      router.navigate(['/'], {
        queryParams: { error: 'cache-timeout' },
      });
      return of(false);
    })
  );
};

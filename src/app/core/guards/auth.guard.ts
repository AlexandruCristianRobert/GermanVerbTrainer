// e:\Projects\Angular\German Verbs\german-verb-trainer\src\app\core\guards\auth.guard.ts

import { inject } from '@angular/core';
import {
  CanActivateFn,
  Router,
  ActivatedRouteSnapshot,
  RouterStateSnapshot,
} from '@angular/router';
import { AuthService } from '../services/auth.service';
import { map, take } from 'rxjs/operators';

export const authGuard: CanActivateFn = (
  route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot
) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Check if user is authenticated
  return authService.currentUser$.pipe(
    take(1), // Take only the current value, don't keep subscription
    map((user) => {
      const isAuthenticated = user !== null;

      if (isAuthenticated) {
        console.log(
          '✅ Auth Guard: User authenticated, allowing access to:',
          state.url
        );
        return true;
      }

      // User not authenticated - save return URL and redirect
      console.warn(
        '🚫 Auth Guard: User not authenticated, redirecting to /home'
      );

      // Save the attempted URL for redirecting after login
      sessionStorage.setItem('returnUrl', state.url);

      // Redirect to home/login page
      router.navigate(['/home'], {
        queryParams: { returnUrl: state.url },
      });

      return false;
    })
  );
};

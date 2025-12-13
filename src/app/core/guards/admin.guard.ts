// src/app/core/guards/admin.guard.ts

import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { map, take } from 'rxjs/operators';

export const adminGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.currentUser$.pipe(
    take(1),
    map((user) => {
      const isAdmin = user?.user_metadata?.['is_admin'] === true;

      if (!isAdmin) {
        console.warn('⚠️ Access denied: Admin privileges required');
        // Redirect to config page with error
        router.navigate(['/config'], {
          queryParams: { error: 'admin_required' },
        });
        return false;
      }

      return true;
    })
  );
};

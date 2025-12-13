import { HttpInterceptorFn } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  return next(req).pipe(
    catchError((error) => {
      // Log error for debugging
      console.error('HTTP Error:', error);

      // TODO: Add user-friendly error handling in Phase 2
      // - Show toast notification
      // - Log to error tracking service
      // - Retry logic for network errors

      return throwError(() => error);
    })
  );
};

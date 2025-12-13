import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, from, of } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';
import { User, AuthError, Session } from '@supabase/supabase-js';
import { SupabaseService } from './supabase.service';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor(private supabaseService: SupabaseService) {
    console.log('🔐 AuthService initialized');
    // Initialize auth state on service creation
    this.initializeAuth();
  }

  isAdmin(): boolean {
    const user = this.currentUserSubject.value;
    return user?.user_metadata?.['is_admin'] === true;
  }

  // Initialize auth state
  async initializeAuth(): Promise<void> {
    try {
      console.log('🔍 Checking authentication state...');

      const client = this.supabaseService.getClient();

      // IMPORTANT: Clear any stuck locks before attempting to get session
      // This helps when switching between tabs or after browser crashes
      try {
        if (typeof navigator !== 'undefined' && 'locks' in navigator) {
          const locks = await (navigator.locks as any).query();
          console.log('🔒 Active locks:', locks);
        }
      } catch (e) {
        // Ignore lock query errors
      }

      // Add retry logic for session retrieval
      let session: Session | null = null;
      let retries = 3;

      while (retries > 0) {
        try {
          const {
            data: { session: retrievedSession },
            error,
          } = await client.auth.getSession();

          if (error) {
            // If it's a lock timeout error, retry
            if (
              error.message.includes('LockManager') ||
              error.message.includes('lock') ||
              error.message.includes('NavigatorLockAcquireTimeoutError')
            ) {
              console.warn(
                '⚠️ Lock timeout, retrying...',
                retries - 1,
                'attempts left'
              );

              // Try to clear localStorage auth key as a last resort
              if (retries === 1) {
                console.warn(
                  '🔓 Attempting to clear stuck lock by removing auth key...'
                );
                if (typeof window !== 'undefined') {
                  window.localStorage.removeItem(
                    'sb-zbebdpbdtsyoyilzhbbc-auth-token'
                  );
                }
              }

              retries--;
              await new Promise((resolve) => setTimeout(resolve, 1500)); // Wait 1.5 seconds
              continue;
            }
            throw error;
          }

          session = retrievedSession;
          break; // Success, exit retry loop
        } catch (err: any) {
          console.error('❌ Session retrieval error:', err);

          if (retries === 1) {
            // Last retry failed - give up and start fresh
            console.warn('⚠️ All retries failed, starting with clean state');
            break;
          }
          retries--;
          await new Promise((resolve) => setTimeout(resolve, 1500));
        }
      }

      if (session?.user) {
        console.log('✅ User is authenticated:', session.user.email);
        this.currentUserSubject.next(session.user);
      } else {
        console.log('ℹ️ No authenticated user found');
        this.currentUserSubject.next(null);
      }

      // Set up auth state change listener
      client.auth.onAuthStateChange((event, session) => {
        console.log('🔄 Auth state changed:', event);

        if (session?.user) {
          console.log('✅ User authenticated:', session.user.email);
          this.currentUserSubject.next(session.user);
        } else {
          console.log('ℹ️ User signed out');
          this.currentUserSubject.next(null);
        }
      });
    } catch (error) {
      console.error('❌ Error initializing auth:', error);
      // Continue anyway - user can still login
      this.currentUserSubject.next(null);
    }
  }

  // Sign up new user
  signUp(
    email: string,
    password: string,
    metadata?: { [key: string]: any }
  ): Observable<{ user: User | null; error: AuthError | null }> {
    console.log('📝 Signing up user:', email);

    const client = this.supabaseService.getClient();

    return from(
      client.auth.signUp({
        email,
        password,
        options: {
          data: metadata || {},
        },
      })
    ).pipe(
      map(({ data, error }) => {
        if (error) {
          console.error('❌ Sign up failed:', error.message);
          return { user: null, error };
        }

        if (data.user) {
          console.log('✅ User signed up successfully:', data.user.email);
          this.currentUserSubject.next(data.user);
        }

        return { user: data.user, error: null };
      }),
      catchError((error) => {
        console.error('❌ Sign up error:', error);
        return of({ user: null, error });
      })
    );
  }

  // Sign in existing user
  signIn(
    email: string,
    password: string
  ): Observable<{
    user: User | null;
    session: Session | null;
    error: AuthError | null;
  }> {
    console.log('🔑 Signing in user:', email);

    const client = this.supabaseService.getClient();

    return from(
      client.auth.signInWithPassword({
        email,
        password,
      })
    ).pipe(
      map(({ data, error }) => {
        if (error) {
          console.error('❌ Sign in failed:', error.message);
          return { user: null, session: null, error };
        }

        if (data.user) {
          console.log('✅ User signed in successfully:', data.user.email);
          this.currentUserSubject.next(data.user);
        }

        return { user: data.user, session: data.session, error: null };
      }),
      catchError((error) => {
        console.error('❌ Sign in error:', error);
        return of({ user: null, session: null, error });
      })
    );
  }

  // Sign out current user
  signOut(): Observable<{ error: AuthError | null }> {
    console.log('👋 Signing out user...');

    const client = this.supabaseService.getClient();

    return from(client.auth.signOut()).pipe(
      map(({ error }) => {
        if (error) {
          console.error('❌ Sign out failed:', error.message);
          return { error };
        }

        console.log('✅ User signed out successfully');
        this.currentUserSubject.next(null);

        // Optional: Clear user-specific data from localStorage
        // You might want to keep anonymous user data
        // this.storageService.clearAllData();

        return { error: null };
      }),
      catchError((error) => {
        console.error('❌ Sign out error:', error);
        return of({ error });
      })
    );
  }

  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  // Get current user ID
  getCurrentUserId(): string | null {
    const user = this.currentUserSubject.value;
    return user ? user.id : null;
  }
  isAuthenticated(): boolean {
    return this.currentUserSubject.value !== null;
  }

  resetPassword(email: string): Observable<{ error: AuthError | null }> {
    console.log('🔄 Sending password reset email to:', email);

    const client = this.supabaseService.getClient();

    return from(
      client.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })
    ).pipe(
      map(({ error }) => {
        if (error) {
          console.error('❌ Password reset failed:', error.message);
          return { error };
        }

        console.log('✅ Password reset email sent');
        return { error: null };
      }),
      catchError((error) => {
        console.error('❌ Password reset error:', error);
        return of({ error });
      })
    );
  }

  updatePassword(newPassword: string): Observable<{ error: AuthError | null }> {
    console.log('🔄 Updating password...');

    const client = this.supabaseService.getClient();

    return from(client.auth.updateUser({ password: newPassword })).pipe(
      map(({ error }) => {
        if (error) {
          console.error('❌ Password update failed:', error.message);
          return { error };
        }

        console.log('✅ Password updated successfully');
        return { error: null };
      }),
      catchError((error) => {
        console.error('❌ Password update error:', error);
        return of({ error });
      })
    );
  }

  resendVerificationEmail(): Observable<{ error: AuthError | null }> {
    const user = this.getCurrentUser();

    if (!user?.email) {
      return of({ error: { message: 'No user email found' } as AuthError });
    }

    console.log('📧 Resending verification email to:', user.email);

    const client = this.supabaseService.getClient();

    return from(
      client.auth.resend({
        type: 'signup',
        email: user.email,
      })
    ).pipe(
      map(({ error }) => {
        if (error) {
          console.error('❌ Resend verification failed:', error.message);
          return { error };
        }

        console.log('✅ Verification email sent');
        return { error: null };
      }),
      catchError((error) => {
        console.error('❌ Resend verification error:', error);
        return of({ error });
      })
    );
  }

  updateUserMetadata(metadata: {
    [key: string]: any;
  }): Observable<{ error: AuthError | null }> {
    console.log('🔄 Updating user metadata...');

    const client = this.supabaseService.getClient();

    return from(client.auth.updateUser({ data: metadata })).pipe(
      map(({ data, error }) => {
        if (error) {
          console.error('❌ Metadata update failed:', error.message);
          return { error };
        }

        if (data.user) {
          console.log('✅ User metadata updated');
          this.currentUserSubject.next(data.user);
        }

        return { error: null };
      }),
      catchError((error) => {
        console.error('❌ Metadata update error:', error);
        return of({ error });
      })
    );
  }
}

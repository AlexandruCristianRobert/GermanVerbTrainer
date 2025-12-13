# German Verb Trainer - Angular SPA + Supabase
## Complete Implementation Guide for AI-Assisted Development

**Version:** 3.0 - Offline-First Architecture with Tailwind CSS  
**Target Framework:** Angular 18+  
**Styling:** Tailwind CSS  
**Backend:** Supabase (PostgreSQL + Auth)  
**Storage Strategy:** Offline-first with manual sync

---

## TABLE OF CONTENTS

1. [Project Overview](#project-overview)
2. [Architecture Philosophy](#architecture-philosophy)
3. [Database Schema](#database-schema)
4. [Application Structure](#application-structure)
5. [Phase 1: Project Setup](#phase-1-project-setup)
6. [Phase 2: Core Services](#phase-2-core-services)
7. [Phase 3: Feature Services](#phase-3-feature-services)
8. [Phase 4: Routing & Guards](#phase-4-routing--guards)
9. [Phase 5: Authentication & Home](#phase-5-authentication--home)
10. [Phase 6: Verb Upload Feature](#phase-6-verb-upload-feature)
11. [Phase 7: Configuration Feature](#phase-7-configuration-feature)
12. [Phase 8: Vocabulary Quiz Feature](#phase-8-vocabulary-quiz-feature)
13. [Phase 9: Conjugation Quiz Feature](#phase-9-conjugation-quiz-feature)
14. [Phase 10: Results Feature](#phase-10-results-feature)
15. [Phase 11: History Feature](#phase-11-history-feature)
16. [Phase 12: Sync Feature](#phase-12-sync-feature)
17. [Phase 13: Styling & Polish](#phase-13-styling--polish)
18. [Testing Strategy](#testing-strategy)
19. [Deployment Guide](#deployment-guide)

---

## PROJECT OVERVIEW

### Purpose
Build a German verb conjugation trainer that helps users practice verb forms across different tenses, persons, and verb types through interactive quizzes.

### Core Requirements
- User authentication with login/register pages
- Protected routes requiring authentication
- Load all verb data once on app initialization
- Store test results locally in browser (localStorage)
- Allow manual upload of history to server
- Admin page to upload verb JSON data
- Work fully offline after initial data load
- Minimize server calls due to slow/sleeping server
- Use Tailwind CSS for all styling
- Responsive design for mobile and desktop

### Key Features
1. User authentication (register, login, logout)
2. Protected routes with auth guards
3. Admin verb upload page (JSON import)
4. Customizable conjugation quiz configuration
5. Customizable vocabulary quiz configuration (infinitive translation)
6. Dynamic question generation from in-memory verb database
7. Immediate answer validation and scoring
8. Test history with detailed answer review (supports both quiz types)
9. Manual server synchronization with sync status tracking
10. Statistics and progress tracking (separate for each quiz type)

---

## ARCHITECTURE PHILOSOPHY

### Authentication Flow

```
UNAUTHENTICATED USER:
1. Lands on /home (public)
2. Sees login/register options
3. Cannot access /config, /quiz, /results, /history
4. Guards redirect to /home with message

AUTHENTICATED USER:
1. Successful login → redirect to /config
2. Can access all protected routes
3. Auth state persists across sessions
4. Logout → clear session, redirect to /home
```

### Data Flow Overview

```
INITIAL LOAD (ONE TIME):
1. User logs in successfully
2. Show loading screen
3. HTTP GET: Fetch ALL verbs from Supabase
4. Store in JavaScript memory (Map or Array)
5. Load user's test history from localStorage
6. Hide loading screen
→ App now works fully offline

NORMAL USAGE (NO NETWORK):
1. User configures quiz → Read from memory
2. Generate questions → Use cached verbs
3. User answers questions → Validate in-memory
4. Calculate score → Pure JavaScript computation
5. Save result → Write to localStorage only
6. View history → Read from localStorage
→ Everything happens instantly (< 10ms)

MANUAL SYNC (USER TRIGGERED):
1. User clicks "Upload History" button
2. Wait for server wake-up (5-15 seconds)
3. HTTP POST: Send all unsynced results
4. Mark results as synced in localStorage
5. Show success message
→ User controls when to wait

VERB UPLOAD (ADMIN ONLY):
1. Admin navigates to /admin/upload-verbs
2. Selects JSON file with verb data
3. Validates JSON structure
4. Uploads to Supabase verbs table
5. Clears cache, forces reload
→ New verbs available immediately
```

---

## DATABASE SCHEMA

### Table 1: verbs

**Purpose:** Master database of German verbs with all conjugations

**Access Pattern:** Read once on app start, admin writes via upload page

**Columns:**

| Column Name | Data Type | Constraints | Description |
|-------------|-----------|-------------|-------------|
| id | UUID | PRIMARY KEY, DEFAULT uuid_generate_v4() | Unique identifier |
| infinitive | TEXT | NOT NULL, UNIQUE | Base form (e.g., "sein", "haben") |
| english_translation | TEXT | NOT NULL | English meaning (e.g., "to be") |
| verb_type | TEXT | NOT NULL | Category: "weak", "strong", "irregular", "modal" |
| stem | TEXT | NOT NULL | Root form for conjugation rules |
| conjugations | JSONB | NOT NULL | All tense/person forms |
| difficulty_level | INTEGER | NOT NULL, CHECK (1-5) | Difficulty rating |
| created_at | TIMESTAMP WITH TIME ZONE | DEFAULT now() | Record creation time |
| uploaded_by | UUID | NULLABLE, FOREIGN KEY(auth.users) | Admin who uploaded |

**Indexes to Create:**
```sql
CREATE INDEX idx_verbs_infinitive ON verbs(infinitive);
CREATE INDEX idx_verbs_type ON verbs(verb_type);
CREATE INDEX idx_verbs_difficulty ON verbs(difficulty_level);
```

**JSONB Structure for conjugations column:**
```json
{
  "präsens": {
    "ich": "bin",
    "du": "bist",
    "er": "ist",
    "sie": "ist",
    "es": "ist",
    "wir": "sind",
    "ihr": "seid",
    "sie_plural": "sind"
  },
  "präteritum": {
    "ich": "war",
    "du": "warst",
    "er": "war",
    "wir": "waren",
    "ihr": "wart",
    "sie_plural": "waren"
  },
  "perfekt": {
    "ich": "bin gewesen",
    "du": "bist gewesen",
    "er": "ist gewesen",
    "wir": "sind gewesen",
    "ihr": "seid gewesen",
    "sie_plural": "sind gewesen"
  }
}
```

**Row Level Security (RLS):**
```sql
ALTER TABLE verbs ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read verbs
CREATE POLICY "Authenticated users can read verbs"
ON verbs FOR SELECT
TO authenticated
USING (true);

-- Allow only authenticated users to insert verbs (admin upload)
CREATE POLICY "Authenticated users can insert verbs"
ON verbs FOR INSERT
TO authenticated
WITH CHECK (true);

-- Optional: Add admin role check for INSERT if you want stricter control
```

---

### Table 2: test_results

**Purpose:** Server backup of quiz performance history

**Columns:**

| Column Name | Data Type | Constraints | Description |
|-------------|-----------|-------------|-------------|
| id | UUID | PRIMARY KEY, DEFAULT uuid_generate_v4() | Unique server-side identifier |
| user_id | UUID | NOT NULL, FOREIGN KEY(auth.users) | User who took test |
| test_type | TEXT | NOT NULL, CHECK IN ('conjugation', 'vocabulary') | Type of quiz taken |
| test_date | TIMESTAMP WITH TIME ZONE | NOT NULL | When test was taken |
| score | INTEGER | NOT NULL | Number of correct answers |
| total_questions | INTEGER | NOT NULL | Total number of questions |
| percentage | NUMERIC(5,2) | NOT NULL | Score as percentage |
| test_configuration | JSONB | NOT NULL | Snapshot of quiz settings |
| answers | JSONB | NOT NULL | Detailed answer log |
| duration_seconds | INTEGER | NULLABLE | Time taken |
| synced_from_client | TIMESTAMP WITH TIME ZONE | DEFAULT now() | When uploaded |
| client_generated_id | TEXT | UNIQUE | Original localStorage ID |

**Indexes:**
```sql
CREATE INDEX idx_test_results_user ON test_results(user_id);
CREATE INDEX idx_test_results_date ON test_results(test_date DESC);
CREATE INDEX idx_test_results_type ON test_results(test_type);
CREATE INDEX idx_test_results_client_id ON test_results(client_generated_id);
```

**Row Level Security:**
```sql
ALTER TABLE test_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own test results"
ON test_results FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read own test results"
ON test_results FOR SELECT
TO authenticated
USING (auth.uid() = user_id);
```

---

### Table 3: user_preferences

**Purpose:** Store user-specific preferences

**Columns:**

| Column Name | Data Type | Constraints | Description |
|-------------|-----------|-------------|-------------|
| user_id | UUID | PRIMARY KEY, FOREIGN KEY(auth.users) | User identifier |
| default_config | JSONB | NOT NULL | Default quiz configuration |
| favorite_verbs | TEXT[] | DEFAULT '{}' | Array of infinitives |
| ui_preferences | JSONB | DEFAULT '{}' | Theme, language, etc. |
| updated_at | TIMESTAMP WITH TIME ZONE | DEFAULT now() | Last update time |

**Row Level Security:**
```sql
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own preferences"
ON user_preferences FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
```

---

### Table 4: auth.users (Supabase Built-in)

**Purpose:** User authentication

**Configuration Required:**
1. Enable email/password authentication in Supabase dashboard
2. Configure email confirmation (optional but recommended)
3. Set up password requirements (min length, complexity)
4. Configure email templates for verification and password reset

---

## APPLICATION STRUCTURE

### Directory Tree

```
src/
├── app/
│   ├── core/
│   │   ├── services/
│   │   │   ├── supabase.service.ts
│   │   │   ├── cache.service.ts
│   │   │   ├── storage.service.ts
│   │   │   ├── sync.service.ts
│   │   │   └── auth.service.ts
│   │   ├── guards/
│   │   │   ├── auth.guard.ts              # NEW: Protect authenticated routes
│   │   │   ├── data-loaded.guard.ts
│   │   │   ├── config-valid.guard.ts
│   │   │   └── result-data.guard.ts
│   │   ├── interceptors/
│   │   │   └── error.interceptor.ts
│   │   ├── models/
│   │   │   ├── verb.model.ts
│   │   │   ├── test-result.model.ts
│   │   │   ├── test-config.model.ts
│   │   │   ├── question.model.ts
│   │   │   ├── answer.model.ts
│   │   │   ├── sync-result.model.ts
│   │   │   └── user.model.ts              # NEW: User interface
│   │   └── core.module.ts
│   │
│   ├── shared/
│   │   ├── components/
│   │   │   ├── loading-spinner/
│   │   │   ├── error-message/
│   │   │   ├── navigation-header/
│   │   │   ├── sync-status-indicator/
│   │   │   └── modal/
│   │   ├── pipes/
│   │   │   └── safe-html.pipe.ts
│   │   ├── directives/
│   │   │   └── auto-focus.directive.ts
│   │   └── shared.module.ts
│   │
│   ├── features/
│   │   ├── home/                          # NEW: Landing/login page
│   │   │   ├── components/
│   │   │   │   ├── home-container/
│   │   │   │   ├── login-form/
│   │   │   │   └── register-form/
│   │   │   └── home.module.ts
│   │   │
│   │   ├── admin/                         # NEW: Admin pages
│   │   │   ├── components/
│   │   │   │   └── verb-upload/
│   │   │   ├── services/
│   │   │   │   └── verb-upload.service.ts
│   │   │   └── admin.module.ts
│   │   │
│   │   ├── configuration/
│   │   │   ├── components/
│   │   │   │   ├── config-form/
│   │   │   │   ├── verb-selector/
│   │   │   │   └── statistics-display/
│   │   │   ├── services/
│   │   │   │   └── config.service.ts
│   │   │   └── configuration.module.ts
│   │   │
│   │   ├── quiz/
│   │   │   ├── components/
│   │   │   │   ├── quiz-container/
│   │   │   │   ├── question-item/
│   │   │   │   ├── progress-bar/
│   │   │   │   └── quiz-timer/
│   │   │   ├── services/
│   │   │   │   ├── quiz.service.ts
│   │   │   │   └── verb.service.ts
│   │   │   └── quiz.module.ts
│   │   │
│   │   ├── results/
│   │   │   ├── components/
│   │   │   │   ├── results-summary/
│   │   │   │   ├── answer-review/
│   │   │   │   └── results-actions/
│   │   │   ├── services/
│   │   │   │   └── results.service.ts
│   │   │   └── results.module.ts
│   │   │
│   │   ├── history/
│   │   │   ├── components/
│   │   │   │   ├── history-table/
│   │   │   │   ├── result-detail-modal/
│   │   │   │   ├── history-filters/
│   │   │   │   └── statistics-panel/
│   │   │   ├── services/
│   │   │   │   └── history.service.ts
│   │   │   └── history.module.ts
│   │   │
│   │   └── sync/
│   │       ├── components/
│   │       │   ├── sync-manager/
│   │       │   ├── sync-status-display/
│   │       │   └── sync-history-log/
│   │       └── sync.module.ts
│   │
│   ├── app.component.ts
│   ├── app.module.ts
│   └── app-routing.module.ts
│
├── environments/
│   ├── environment.ts
│   └── environment.prod.ts
│
├── assets/
│   ├── data/
│   │   └── verb-seed.json
│   └── images/
│
└── styles.scss
```

---

## PHASE 1: PROJECT SETUP

(Steps 1.1 through 1.8 remain the same as in the previous document - project creation, Tailwind setup, dependencies, TypeScript config, environment files, Supabase setup, database creation, and core module structure)

---

## PHASE 2: CORE SERVICES

### Step 2.1: Implement Auth Service

**Goal:** Create authentication service for user login/register/logout

**Instructions:**

**Part A: Service Setup**
1. Open auth.service.ts
2. Import necessary items:
   - Import createClient from @supabase/supabase-js
   - Import SupabaseService
   - Import User model interface
   - Import BehaviorSubject, Observable from rxjs
   - Import Router for navigation
3. Mark service with @Injectable({ providedIn: 'root' })
4. Inject SupabaseService and Router in constructor

**Part B: Create User State Management**
1. Create private BehaviorSubject for current user:
   - Property: private currentUserSubject = new BehaviorSubject<User | null>(null)
   - This holds the current authenticated user or null
2. Create public Observable for components to subscribe:
   - Property: public currentUser$ = this.currentUserSubject.asObservable()
   - Components subscribe to this for reactive user state
3. Create getter for current user value:
   - Property: public get currentUser(): User | null
   - Returns currentUserSubject.value
   - Synchronous access to current user

**Part C: Initialize Auth State**
1. Create initialization method:
   - Method name: initializeAuth()
   - Return type: Promise<void>
   - Called from app.component.ts on init
2. Implementation:
   - Get Supabase client from SupabaseService
   - Call getSession() to check for existing session
   - If session exists:
     - Extract user from session
     - Emit user to currentUserSubject
     - Log user info to console (development only)
   - If no session:
     - Emit null to currentUserSubject
3. Set up auth state change listener:
   - Use onAuthStateChange() from Supabase
   - Listen for SIGNED_IN, SIGNED_OUT, TOKEN_REFRESHED events
   - Update currentUserSubject when auth state changes
   - This keeps user state synchronized automatically

**Part D: Create Sign Up Method**
1. Method name: signUp(email: string, password: string, fullName?: string)
2. Return type: Observable<{ user: User | null; error: Error | null }>
3. Implementation:
   - Get Supabase client
   - Call signUp() with email and password
   - Optional: Include user metadata (full name)
   - Convert Promise to Observable using from()
   - On success:
     - Emit user to currentUserSubject
     - Log success message
     - Return user object
   - On error:
     - Log error details
     - Return null user with error
   - Handle common errors:
     - Weak password
     - Email already registered
     - Invalid email format
4. Email verification:
   - If enabled in Supabase, user must verify email
   - Show message to check email inbox
   - User cannot login until verified

**Part E: Create Sign In Method**
1. Method name: signIn(email: string, password: string)
2. Return type: Observable<{ user: User | null; error: Error | null }>
3. Implementation:
   - Get Supabase client
   - Call signInWithPassword() with credentials
   - Convert Promise to Observable
   - On success:
     - Emit user to currentUserSubject
     - Navigate to /config using Router
     - Log successful login
     - Return user object
   - On error:
     - Log error details
     - Return null user with error
   - Handle common errors:
     - Invalid credentials
     - Email not verified
     - Too many login attempts (rate limiting)

**Part F: Create Sign Out Method**
1. Method name: signOut()
2. Return type: Observable<{ error: Error | null }>
3. Implementation:
   - Get Supabase client
   - Call signOut()
   - Convert Promise to Observable
   - On success:
     - Emit null to currentUserSubject
     - Clear localStorage (test results, config)
     - Navigate to /home using Router
     - Log successful logout
   - On error:
     - Log error but still clear local state
     - Still navigate to /home

**Part G: Create Helper Methods**
1. Method: isAuthenticated()
   - Return type: boolean
   - Returns: currentUserSubject.value !== null
   - Used by guards to check auth status

2. Method: getCurrentUserId()
   - Return type: string | null
   - Returns: currentUserSubject.value?.id || null
   - Used by services to associate data with user

3. Method: getUserEmail()
   - Return type: string | null
   - Returns: currentUserSubject.value?.email || null
   - Display in UI

4. Method: resetPassword(email: string)
   - Return type: Observable<{ error: Error | null }>
   - Sends password reset email
   - User clicks link in email to reset

**Part H: Add Session Persistence**
1. Supabase automatically handles session persistence
2. Session stored in localStorage by default
3. Session automatically refreshed when expired
4. Configure session timeout in Supabase dashboard if needed

**Key Concepts:**
- Authentication state is reactive (BehaviorSubject)
- Components subscribe to currentUser$ for updates
- Session persists across page refreshes
- Auth state changes are detected automatically
- Errors are handled gracefully with user-friendly messages

**Verification:**
- Can sign up new users successfully
- Can sign in existing users
- Can sign out and clear session
- currentUser$ emits correct values
- Session persists after page refresh
- Auth state listener works correctly
- Error messages are clear and helpful

---

### Step 2.2: Implement Supabase Service

(Implementation remains the same as previously documented, but add methods for verb upload)

**Additional Methods for Verb Upload:**

**Part F: Create Verb Upload Method**
1. Method name: uploadVerbs(verbs: Verb[])
2. Return type: Observable<{ count: number; error: Error | null }>
3. Implementation:
   - Get Supabase client
   - Validate verb structure before upload
   - Use INSERT with ON CONFLICT handling:
     - ON CONFLICT (infinitive) DO UPDATE
     - This allows updating existing verbs or adding new ones
   - Add uploaded_by field with current user ID
   - Convert Promise to Observable
   - On success:
     - Return count of verbs uploaded
     - Log success message
   - On error:
     - Log detailed error
     - Return error object
4. Validation checks:
   - Each verb has required fields (infinitive, translations, conjugations)
   - JSONB structure is valid
   - Difficulty level is 1-5
   - Verb type is valid value

**Part G: Create Verb Deletion Method**
1. Method name: deleteVerb(infinitive: string)
2. Return type: Observable<{ error: Error | null }>
3. Implementation:
   - Get Supabase client
   - DELETE FROM verbs WHERE infinitive = infinitive
   - Convert Promise to Observable
   - On success: Return no error
   - On error: Return error object

---

### Step 2.3: Implement Cache Service

(Implementation remains the same as previously documented)

**Additional consideration:**
- After verb upload, cache must be invalidated and reloaded
- Add method: clearCache() to reset isInitialized flag
- After upload, call clearCache() then initializeCache()

---

### Step 2.4: Implement Storage Service

(Implementation remains the same as previously documented)

**Additional consideration:**
- When user logs out, clear all their data from localStorage
- Add method: clearUserData() called from AuthService.signOut()

---

### Step 2.5: Implement Sync Service

(Implementation remains the same as previously documented)

**Additional consideration:**
- All sync operations now require authenticated user
- Use AuthService.getCurrentUserId() to get user_id
- Add user_id to all test results before upload

---

## PHASE 3: FEATURE SERVICES

### Step 3.1: Implement Config Service
### Step 3.2: Implement Verb Service
### Step 3.3: Implement Quiz Service
### Step 3.4: Implement Results Service
### Step 3.5: Implement History Service

(All implementations remain the same as previously documented)

---

## PHASE 4: ROUTING & GUARDS

### Step 4.1: Configure App Routing

**Goal:** Set up routes with authentication protection

**Instructions:**

**Part A: Define Route Configuration**
1. Open app-routing.module.ts
2. Import all necessary guards
3. Define routes array with following structure:

```
Routes configuration:

/ (root) → Redirect to /home

/home → HomeModule (lazy-loaded)
  - Public route (no guards)
  - Landing page with login/register

/config → ConfigurationModule (lazy-loaded)
  - Protected by: AuthGuard, DataLoadedGuard
  - Main quiz configuration page

/quiz → QuizModule (lazy-loaded)
  - Protected by: AuthGuard, DataLoadedGuard, ConfigValidGuard
  - Active quiz page

/results → ResultsModule (lazy-loaded)
  - Protected by: AuthGuard, ResultDataGuard
  - Quiz results display

/history → HistoryModule (lazy-loaded)
  - Protected by: AuthGuard
  - Test history page

/admin/upload-verbs → AdminModule (lazy-loaded)
  - Protected by: AuthGuard
  - Admin verb upload page

** (wildcard) → Redirect to /home
```

**Part B: Configure Route Guards**
1. All authenticated routes use AuthGuard
2. AuthGuard checks if user is logged in
3. If not authenticated, redirect to /home with return URL
4. After login, redirect to original requested URL

**Part C: Configure Lazy Loading**
1. Use loadChildren syntax for all feature modules
2. This creates separate bundles for each feature
3. Improves initial load time
4. Modules load on-demand when route accessed

**Part D: Add Route Options**
1. Enable preloading strategy (optional):
   - PreloadAllModules: Preload all lazy modules after initial load
   - OR NoPreloading: Load only when accessed
2. Configure scroll position restoration:
   - scrollPositionRestoration: 'enabled'
   - Restores scroll position when navigating back
3. Add route data for breadcrumbs, titles, etc.

**Verification:**
- All routes defined correctly
- Guards applied to protected routes
- Lazy loading works (check network tab for separate chunks)
- Navigation works between all routes
- Redirects work as expected

---

### Step 4.2: Implement Auth Guard

**Goal:** Protect routes from unauthenticated access

**Instructions:**

**Part A: Create Auth Guard**
1. Generate guard using Angular CLI
2. Implement CanActivate interface
3. Open auth.guard.ts

**Part B: Guard Implementation**
1. Inject AuthService and Router in constructor
2. Implement canActivate method:
   - Method signature: canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot)
   - Return type: Observable<boolean> | Promise<boolean> | boolean
3. Check authentication status:
   - Call AuthService.isAuthenticated()
   - If true (user logged in):
     - Return true to allow navigation
   - If false (user not logged in):
     - Store requested URL in session storage
     - Navigate to /home with query param: ?returnUrl=...
     - Return false to block navigation
4. Add logging (development only):
   - Log which route was requested
   - Log auth check result
   - Log redirect destination

**Part C: Return URL Handling**
1. When user tries to access protected route while logged out:
   - Save requested URL: sessionStorage.setItem('returnUrl', state.url)
2. After successful login in AuthService:
   - Check for stored return URL
   - If exists, navigate there
   - If not exists, navigate to /config (default)
   - Clear stored URL after redirect

**Part D: Handle Edge Cases**
1. If auth state is loading/initializing:
   - Wait for auth initialization
   - Use AuthService.currentUser$ Observable
   - Return Observable<boolean> instead of immediate boolean
2. If session expired:
   - Redirect to /home with expiration message
   - Show toast: "Session expired, please login again"

**Key Concepts:**
- Guard runs before route activation
- Synchronous or asynchronous return supported
- Can redirect to different route
- Can pass state/data to redirected route
- Return URL allows seamless flow after login

**Verification:**
- Cannot access /config without login
- Cannot access /quiz without login
- Redirect to /home works correctly
- Return URL is preserved and used after login
- Auth state changes are detected
- Works with page refresh (session persistence)

---

### Step 4.3: Implement Data Loaded Guard

**Goal:** Ensure verbs are loaded before accessing quiz features

**Instructions:**

**Part A: Create Guard**
1. Generate guard using Angular CLI
2. Implement CanActivate interface
3. Open data-loaded.guard.ts

**Part B: Guard Implementation**
1. Inject CacheService and Router
2. Implement canActivate method:
   - Check CacheService.isCacheReady()
   - If true (verbs loaded):
     - Return true to allow navigation
   - If false (verbs not loaded):
     - Option A: Redirect to loading page
     - Option B: Show modal and wait for load
     - Option C: Return Observable that resolves when ready
3. Recommended approach: Return Observable
   - Create interval that checks cache status every 500ms
   - When cache becomes ready, emit true
   - Apply timeout (30 seconds) in case of failure
   - If timeout, redirect to /home with error

**Part C: Loading State Handling**
1. While waiting for cache:
   - Show loading spinner in guard (if using modal approach)
   - OR rely on app.component loading screen
2. If cache initialization fails:
   - Redirect to /home
   - Show error message
   - Provide retry button

**Part D: Integration with App Init**
1. App component initializes cache on startup
2. Guards wait for initialization to complete
3. User shouldn't access protected routes before data ready
4. First navigation to quiz triggers guard check

**Key Concepts:**
- Verbs must be in memory before quiz can run
- Guard ensures data dependency is met
- Can return Observable for async checking
- Timeout prevents infinite waiting
- Error handling provides user feedback

**Verification:**
- Cannot access /quiz before verbs loaded
- Guard waits for cache initialization
- Timeout works if initialization hangs
- Error messages display correctly
- After successful load, guard allows access

---

### Step 4.4: Implement Config Valid Guard

**Goal:** Ensure valid quiz configuration before starting quiz

**Instructions:**

**Part A: Create Guard**
1. Generate guard using Angular CLI
2. Implement CanActivate interface
3. Open config-valid.guard.ts

**Part B: Guard Implementation**
1. Inject ConfigService and Router
2. Implement canActivate method:
   - Get current config: ConfigService.getConfig()
   - Validate configuration:
     - At least one tense selected
     - At least one verb type selected
     - At least one person selected
     - Question count in valid range (5-50)
   - If valid: Return true
   - If invalid: 
     - Navigate to /config
     - Show toast/message: "Please configure your quiz first"
     - Return false
3. Validation logic:
   - Create private method: validateConfig(config: TestConfig): boolean
   - Check all required fields have values
   - Check arrays are not empty
   - Check numbers are in range
   - Return true only if all checks pass

**Part C: User Experience**
1. When redirected from /quiz to /config:
   - Highlight invalid fields in config form
   - Show helpful message explaining what's missing
   - Auto-focus first invalid field
2. After fixing config and clicking "Start Test":
   - Should navigate successfully to /quiz

**Key Concepts:**
- Prevents starting quiz with incomplete config
- Validation catches user errors early
- Redirect to config page allows fixing
- Clear error messages guide user

**Verification:**
- Cannot access /quiz with empty config
- Cannot access /quiz with invalid config
- Valid config allows access
- Redirect to /config works
- Error messages are clear

---

### Step 4.5: Implement Result Data Guard

**Goal:** Ensure quiz result exists before showing results page

**Instructions:**

**Part A: Create Guard**
1. Generate guard using Angular CLI
2. Implement CanActivate interface
3. Open result-data.guard.ts

**Part B: Guard Implementation**
1. Inject Router
2. Implement canActivate method:
   - Check navigation state for result data:
     - Access via: window.history.state
     - Look for: quizResult property
   - If result exists: Return true
   - If no result:
     - Navigate to /config
     - Show message: "No quiz result found"
     - Return false
3. Alternative approach (if using service):
   - Inject ResultsService
   - Check if result stored in service
   - If exists: Return true
   - If not: Redirect

**Part C: Passing Result Data**
1. When navigating from quiz to results:
   - Use Router.navigate() with state:
   ```
   this.router.navigate(['/results'], { 
     state: { quizResult: result }
   });
   ```
2. Results component retrieves data:
   - Access via: this.router.getCurrentNavigation()?.extras.state
   - OR window.history.state

**Part D: Handle Direct URL Access**
1. If user types /results directly in browser:
   - No state data exists
   - Guard blocks access
   - Redirects to /config
2. If user refreshes /results page:
   - State data is lost
   - Guard blocks access
   - Alternative: Store result ID in URL param and fetch from localStorage

**Key Concepts:**
- Prevents showing results without quiz completion
- Navigation state carries data between routes
- Direct URL access is blocked
- Provides clear user feedback

**Verification:**
- Can access /results after completing quiz
- Cannot access /results by typing URL
- Cannot access /results after page refresh (expected behavior)
- Redirect to /config works
- State data passes correctly

---

## PHASE 5: AUTHENTICATION & HOME

### Step 5.1: Create Home Module

**Goal:** Set up home feature module for landing/auth pages

**Instructions:**

**Part A: Generate Module**
1. Use Angular CLI to generate home module
2. Create in features/home/ directory
3. Configure as lazy-loaded module

**Part B: Create Module Structure**
1. Create components/ subdirectory
2. Generate components:
   - HomeContainerComponent (smart component)
   - LoginFormComponent (presentation component)
   - RegisterFormComponent (presentation component)
3. Import necessary Angular modules:
   - CommonModule
   - ReactiveFormsModule (for forms)
   - RouterModule (for routing)
4. Import SharedModule for common components

**Part C: Configure Home Routing**
1. Create home-routing.module.ts
2. Define routes:
   ```
   /home → HomeContainerComponent (default)
   /home/login → HomeContainerComponent (show login form)
   /home/register → HomeContainerComponent (show register form)
   ```
3. Or use single route with tabs/toggle between forms

**Part D: Module Configuration**
1. Declare all components in module
2. Import routing module
3. Export HomeContainerComponent (if needed)

**Verification:**
- Module generates without errors
- Components exist in correct folders
- Module imports in lazy route configuration
- Can navigate to /home

---

### Step 5.2: Implement Home Container Component

**Goal:** Create main landing page container

**Instructions:**

**Part A: Component Setup**
1. Open home-container.component.ts
2. Import AuthService
3. Import Router
4. Inject both services in constructor

**Part B: Component Logic**
1. Create property to track which form to show:
   - Property: showLoginForm = true
   - Toggle between login and register
2. Create method to switch forms:
   - Method: switchToLogin() sets showLoginForm = true
   - Method: switchToRegister() sets showLoginForm = false
3. Check if already authenticated:
   - In ngOnInit, check AuthService.isAuthenticated()
   - If true, redirect to /config
   - No need to show login forms if already logged in

**Part C: Template Structure** (Using Tailwind CSS)
1. Create full-height container:
   - Use: class="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600"
2. Center content:
   - Use: class="flex items-center justify-center px-4 py-12"
3. Create card container:
   - Use: class="max-w-md w-full bg-white rounded-lg shadow-xl p-8"
4. Add app branding:
   - App title/logo at top
   - Tagline or description
   - Use Tailwind typography classes
5. Conditional form display:
   - Use *ngIf="showLoginForm" for login form
   - Use *ngIf="!showLoginForm" for register form
6. Toggle button between forms:
   - "Don't have an account? Register" (when showing login)
   - "Already have an account? Login" (when showing register)
   - Style as text link with Tailwind

**Part D: Styling with Tailwind**
1. Background gradient:
   - from-blue-500 to-purple-600
   - Add animate-gradient-x for animated gradient (custom animation)
2. Card styling:
   - bg-white rounded-lg shadow-xl
   - p-8 for padding
   - max-w-md for width constraint
3. Branding:
   - text-3xl font-bold text-gray-800 for title
   - text-gray-600 for tagline
   - mb-8 for spacing below

**Part E: Responsive Design**
1. Mobile (default):
   - Full width with padding: px-4
   - Smaller text sizes
2. Tablet and up (md:):
   - Fixed width card: max-w-md
   - Larger text sizes
3. Use Tailwind responsive prefixes: sm:, md:, lg:

**Verification:**
- Component displays correctly
- Can toggle between login and register forms
- Styling looks good on mobile and desktop
- Redirects if already authenticated
- Gradient background displays

---

### Step 5.3: Implement Login Form Component

**Goal:** Create login form with validation

**Instructions:**

**Part A: Component Setup**
1. Open login-form.component.ts
2. Import FormBuilder, FormGroup, Validators
3. Import AuthService
4. Import Router
5. Inject FormBuilder, AuthService, Router

**Part B: Create Form**
1. In ngOnInit, create form:
   - Form group with two controls:
     - email: ['', [Validators.required, Validators.email]]
     - password: ['', [Validators.required, Validators.minLength(6)]]
2. Store form as property: loginForm: FormGroup

**Part C: Create Submit Handler**
1. Method: onSubmit()
2. Implementation:
   - Check if form is valid
   - If invalid, mark all fields as touched (shows errors)
   - If valid:
     - Show loading state (disable button, show spinner)
     - Get email and password from form.value
     - Call AuthService.signIn(email, password)
     - Subscribe to Observable:
       - On success:
         - Hide loading state
         - Navigate to /config (or return URL)
         - Show success toast (optional)
       - On error:
         - Hide loading state
         - Show error message below form
         - Keep form enabled for retry
3. Add property for loading state: isLoading = false
4. Add property for error message: errorMessage = ''

**Part D: Template Structure** (Using Tailwind CSS)
1. Form element:
   - [formGroup]="loginForm"
   - (ngSubmit)="onSubmit()"
   - class="space-y-6"
2. Email field:
   - Label: class="block text-sm font-medium text-gray-700"
   - Input: class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
   - formControlName="email"
   - type="email"
   - Add error message div:
     - *ngIf="loginForm.get('email').invalid && loginForm.get('email').touched"
     - class="text-sm text-error mt-1"
     - Show specific error: "Please enter a valid email"
3. Password field:
   - Similar structure to email
   - type="password"
   - Error message for minLength: "Password must be at least 6 characters"
4. Error display (for login errors):
   - *ngIf="errorMessage"
   - class="bg-red-50 border-l-4 border-error p-4 mb-4"
   - Show errorMessage text
5. Submit button:
   - type="submit"
   - [disabled]="isLoading"
   - class="w-full btn-primary disabled:opacity-50"
   - Show spinner when loading:
     - *ngIf="isLoading" show loading spinner
     - *ngIf="!isLoading" show "Sign In" text
6. Forgot password link (optional):
   - class="text-sm text-primary hover:underline"
   - Routes to password reset page (future feature)

**Part E: Accessibility**
1. All inputs have associated labels with "for" attribute
2. Error messages have role="alert"
3. Form has proper ARIA labels
4. Focus management (auto-focus email field)

**Verification:**
- Form displays correctly
- Validation works (required, email format, min length)
- Error messages show when fields touched
- Submit button disabled while loading
- Successful login navigates to /config
- Failed login shows error message
- Form stays enabled after error for retry

---

### Step 5.4: Implement Register Form Component

**Goal:** Create registration form with validation

**Instructions:**

**Part A: Component Setup**
1. Open register-form.component.ts
2. Import FormBuilder, FormGroup, Validators, AbstractControl
3. Import AuthService
4. Import Router (optional, for auto-login after register)
5. Inject FormBuilder, AuthService, Router

**Part B: Create Form**
1. In ngOnInit, create form:
   - Form group with controls:
     - fullName: ['', [Validators.required, Validators.minLength(2)]]
     - email: ['', [Validators.required, Validators.email]]
     - password: ['', [Validators.required, Validators.minLength(8), this.passwordStrength]]
     - confirmPassword: ['', [Validators.required]]
2. Add custom validator for password confirmation:
   - Add to form, not individual control
   - Validator: { validators: this.passwordsMatch }
3. Store form as property: registerForm: FormGroup

**Part C: Create Custom Validators**
1. Password strength validator:
   - Method: passwordStrength(control: AbstractControl)
   - Check for at least one uppercase, lowercase, number
   - Return null if valid, { weak: true } if invalid
2. Passwords match validator:
   - Method: passwordsMatch(formGroup: FormGroup)
   - Compare password and confirmPassword controls
   - Return null if match, { mismatch: true } if different

**Part D: Create Submit Handler**
1. Method: onSubmit()
2. Implementation:
   - Check if form is valid
   - If invalid, mark all fields as touched
   - If valid:
     - Show loading state
     - Get values from form
     - Call AuthService.signUp(email, password, fullName)
     - Subscribe to Observable:
       - On success:
         - Hide loading state
         - Show success message: "Account created! Please check your email."
         - Option A: Auto-login and redirect to /config
         - Option B: Switch to login form
       - On error:
         - Hide loading state
         - Show error message (email taken, weak password, etc.)
3. Add properties: isLoading, errorMessage, successMessage

**Part E: Template Structure** (Using Tailwind CSS)
1. Form element:
   - [formGroup]="registerForm"
   - (ngSubmit)="onSubmit()"
   - class="space-y-6"
2. Full Name field:
   - Label + Input (same Tailwind classes as login)
   - formControlName="fullName"
   - Error messages for required and minLength
3. Email field:
   - Same structure as login form
   - Error message for invalid email
4. Password field:
   - Same structure as login form
   - Error messages for:
     - Required
     - Min length (8 characters)
     - Weak password (strength validator)
   - Add password strength indicator:
     - Show weak/medium/strong based on validation
     - Use color coding: red/yellow/green
5. Confirm Password field:
   - Same input structure
   - Error message for mismatch:
     - *ngIf="registerForm.errors?.['mismatch'] && confirmPassword.touched"
     - "Passwords do not match"
6. Success message display:
   - *ngIf="successMessage"
   - class="bg-green-50 border-l-4 border-success p-4 mb-4"
7. Error message display:
   - *ngIf="errorMessage"
   - class="bg-red-50 border-l-4 border-error p-4 mb-4"
8. Submit button:
   - type="submit"
   - [disabled]="isLoading || registerForm.invalid"
   - class="w-full btn-primary disabled:opacity-50"
   - Show "Create Account" or loading spinner
9. Terms of service (optional):
   - Checkbox control
   - Link to terms page
   - Required validator

**Part F: Password Strength Indicator**
1. Create method: getPasswordStrength(): string
2. Return 'weak', 'medium', or 'strong' based on password
3. Display indicator below password field:
   - Weak: red bar, 33% width
   - Medium: yellow bar, 66% width
   - Strong: green bar, 100% width
   - Use Tailwind: h-2 rounded transition-all duration-300

**Verification:**
- All fields validate correctly
- Custom validators work (password strength, match)
- Error messages display appropriately
- Password strength indicator updates
- Successful registration creates account
- Success/error messages display correctly
- Loading state works
- Form resets or switches after success

---

### Step 5.5: Update Navigation Header

**Goal:** Add login/logout functionality to navigation

**Instructions:**

**Part A: Update Component Logic**
1. Open navigation-header.component.ts
2. Inject AuthService
3. Subscribe to currentUser$ in ngOnInit:
   - this.authService.currentUser$.subscribe(user => this.currentUser = user)
   - Store in component property
4. Create logout method:
   - Method: onLogout()
   - Call AuthService.signOut()
   - Subscribe and handle response
   - Show logout confirmation (optional)

**Part B: Update Template**
1. Show different nav items based on auth state:
   - If NOT logged in (*ngIf="!currentUser"):
     - Show "Login" link to /home
   - If logged in (*ngIf="currentUser"):
     - Show "Dashboard" link to /config
     - Show "History" link to /history
     - Show user email or name
     - Show "Logout" button
2. Add user menu dropdown (Tailwind):
   - Click user name to show dropdown
   - Options: Profile, Settings, Logout
   - Position: absolute, right-0, top-full
   - Style: bg-white shadow-lg rounded-lg

**Part C: Styling Updates**
1. User info display:
   - class="flex items-center gap-3"
   - Avatar (optional): rounded-full bg-primary text-white
   - Email: text-sm text-gray-600
2. Logout button:
   - class="text-sm text-error hover:text-red-700"
   - OR icon button with tooltip

**Verification:**
- Navigation updates when user logs in
- Shows correct items for auth state
- Logout button works
- User info displays correctly
- Dropdown menu works (if implemented)

---

## PHASE 6: VERB UPLOAD FEATURE

### Step 6.1: Create Admin Module

**Goal:** Set up admin feature module for verb management

**Instructions:**

**Part A: Generate Module**
1. Use Angular CLI to generate admin module
2. Create in features/admin/ directory
3. Configure as lazy-loaded module

**Part B: Create Module Structure**
1. Create components/ subdirectory
2. Generate VerbUploadComponent
3. Create services/ subdirectory
4. Generate VerbUploadService
5. Import necessary modules:
   - CommonModule
   - ReactiveFormsModule
   - RouterModule
   - SharedModule

**Part C: Configure Admin Routing**
1. Create admin-routing.module.ts
2. Define route:
   - /admin/upload-verbs → VerbUploadComponent
   - Protected by AuthGuard
3. Add route to main app routing

**Verification:**
- Module generates successfully
- Can navigate to /admin/upload-verbs (when logged in)
- Component loads correctly

---

### Step 6.2: Create Verb Upload Service

**Goal:** Handle verb JSON validation and upload

**Instructions:**

**Part A: Service Setup**
1. Open verb-upload.service.ts
2. Import SupabaseService
3. Import Verb model
4. Mark with @Injectable({ providedIn: 'root' })
5. Inject SupabaseService

**Part B: Create JSON Validation Method**
1. Method name: validateVerbsJSON(jsonString: string)
2. Return type: { valid: boolean; verbs?: Verb[]; errors?: string[] }
3. Implementation:
   - Try to parse JSON string
   - If parse fails:
     - Return { valid: false, errors: ['Invalid JSON format'] }
   - Check if parsed data is array
   - If not array:
     - Return { valid: false, errors: ['JSON must be an array of verbs'] }
   - Validate each verb object:
     - Has required fields: infinitive, english_translation, verb_type, stem, conjugations
     - infinitive is non-empty string
     - verb_type is one of: weak, strong, irregular, modal
     - difficulty_level is number 1-5
     - conjugations is object with tense keys
     - Each tense has person keys with string values
   - Collect all validation errors
   - If no errors:
     - Return { valid: true, verbs: parsedArray }
   - If errors:
     - Return { valid: false, errors: errorArray }

**Part C: Create Upload Method**
1. Method name: uploadVerbs(verbs: Verb[])
2. Return type: Observable<{ success: boolean; count: number; error?: string }>
3. Implementation:
   - Call SupabaseService.uploadVerbs(verbs)
   - Map response to success/failure object
   - On success: Return count of verbs uploaded
   - On error: Return error message
   - Use RxJS operators for transformation

**Part D: Create Verb Template Generator**
1. Method name: generateTemplate()
2. Return type: string (JSON string)
3. Implementation:
   - Create sample verb object with all fields
   - Include comments (as JSON - not ideal but helpful)
   - Stringify with pretty formatting
   - Return template string
4. Template structure:
   ```json
   [
     {
       "infinitive": "sein",
       "english_translation": "to be",
       "verb_type": "irregular",
       "stem": "sei",
       "difficulty_level": 1,
       "conjugations": {
         "präsens": {
           "ich": "bin",
           "du": "bist",
           ...
         },
         ...
       }
     }
   ]
   ```

**Verification:**
- Validation catches invalid JSON
- Validation catches missing required fields
- Validation catches invalid verb_type values
- Upload method calls Supabase correctly
- Template generator creates valid JSON

---

### Step 6.3: Implement Verb Upload Component

**Goal:** Create UI for uploading verb JSON files

**Instructions:**

**Part A: Component Setup**
1. Open verb-upload.component.ts
2. Import VerbUploadService
3. Import CacheService (to reload after upload)
4. Import Router
5. Inject all services

**Part B: Component Properties**
1. selectedFile: File | null = null
2. uploadStatus: 'idle' | 'validating' | 'uploading' | 'success' | 'error'
3. validationErrors: string[] = []
4. uploadResult: { count: number; message: string } | null = null
5. isLoading = false

**Part C: Create File Selection Handler**
1. Method: onFileSelected(event: Event)
2. Implementation:
   - Get file from event target
   - Check file type (must be .json)
   - If not JSON:
     - Show error: "Please select a JSON file"
     - Return
   - Store file in selectedFile property
   - Reset previous errors/results
   - Log file name

**Part D: Create File Preview Method**
1. Method: previewFile()
2. Implementation:
   - If no file selected, return
   - Use FileReader to read file
   - Display first 500 characters in preview area
   - Show "..." if file is longer
   - This helps user verify correct file

**Part E: Create Validation Method**
1. Method: validateFile()
2. Implementation:
   - If no file selected, return
   - Set uploadStatus = 'validating'
   - Use FileReader to read file as text
   - Call VerbUploadService.validateVerbsJSON(fileContent)
   - If valid:
     - Show success message
     - Show verb count
     - Enable upload button
     - Set uploadStatus = 'idle'
   - If invalid:
     - Show validation errors
     - Disable upload button
     - Set uploadStatus = 'error'
     - Display each error in list

**Part F: Create Upload Method**
1. Method: uploadVerbs()
2. Implementation:
   - If no file or file not validated, return
   - Set uploadStatus = 'uploading'
   - Set isLoading = true
   - Read file again
   - Parse JSON to Verb[]
   - Call VerbUploadService.uploadVerbs(verbs)
   - Subscribe to Observable:
     - On success:
       - Set uploadStatus = 'success'
       - Store result (count of verbs)
       - Show success message
       - Clear cache: CacheService.clearCache()
       - Reload cache: CacheService.initializeCache()
       - Reset form after 3 seconds
     - On error:
       - Set uploadStatus = 'error'
       - Show error message
       - Keep form for retry
   - Set isLoading = false in finalize()

**Part G: Create Download Template Method**
1. Method: downloadTemplate()
2. Implementation:
   - Get template string from VerbUploadService
   - Create Blob from string
   - Create download link
   - Trigger download
   - Filename: 'verb-template.json'

**Part H: Template Structure** (Using Tailwind CSS)
1. Page container:
   - class="max-w-4xl mx-auto p-6"
2. Page header:
   - Title: "Upload Verbs" (text-2xl font-bold)
   - Description: Instructions for uploading
   - Download template button
3. Upload area:
   - File input (styled with Tailwind):
     - class="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-primary file:text-white hover:file:bg-blue-600"
     - (change)="onFileSelected($event)"
     - accept=".json"
   - Selected file name display
4. Validation section:
   - Validate button:
     - class="btn-primary"
     - (click)="validateFile()"
     - [disabled]="!selectedFile"
   - Validation errors list:
     - *ngFor="let error of validationErrors"
     - class="bg-red-50 border-l-4 border-error p-3 text-sm"
   - Validation success message:
     - *ngIf="uploadStatus === 'idle' && selectedFile && validationErrors.length === 0"
     - class="bg-green-50 border-l-4 border-success p-3"
     - "File validated successfully! X verbs ready to upload."
5. Upload section:
   - Upload button:
     - class="btn-primary"
     - (click)="uploadVerbs()"
     - [disabled]="!selectedFile || validationErrors.length > 0 || isLoading"
     - Show loading spinner when uploading
   - Progress indicator (if large file)
   - Success message:
     - *ngIf="uploadStatus === 'success'"
     - class="bg-green-50 border-l-4 border-success p-4"
     - "Successfully uploaded X verbs!"
   - Error message:
     - *ngIf="uploadStatus === 'error'"
     - class="bg-red-50 border-l-4 border-error p-4"
6. File preview area:
   - Show first 500 chars of JSON
   - Syntax highlighted (optional)
   - Scrollable container
7. Template download button:
   - class="btn-secondary"
   - (click)="downloadTemplate()"
   - "Download Template"
8. Back to dashboard link:
   - routerLink="/config"
   - class="text-primary hover:underline"

**Part I: Additional Features (Optional)**
1. Drag and drop file upload:
   - Use (drop) and (dragover) events
   - Style drop zone with Tailwind
   - Visual feedback on drag over
2. Bulk validation:
   - Validate multiple files at once
   - Show results for each file
3. Verb preview:
   - Show table of verbs before upload
   - Allow editing individual verbs
   - Remove verbs from list
4. Upload history:
   - Track previous uploads
   - Show date, user, count
   - Store in Supabase table

**Verification:**
- Can select JSON file
- File validation works correctly
- Invalid JSON shows errors
- Valid JSON enables upload
- Upload successfully adds verbs to database
- Cache reloads after upload
- Template download works
- UI provides clear feedback at each step
- Error handling works

---

## PHASE 7: CONFIGURATION FEATURE

### Step 7.1: Create Configuration Module

**Goal:** Set up quiz configuration feature module

**Instructions:**

**Part A: Generate Module**
1. Use Angular CLI to generate configuration module
2. Create in features/configuration/ directory
3. Configure as lazy-loaded module

**Part B: Create Module Structure**
1. Create components/ subdirectory
2. Generate components:
   - ConfigFormComponent (smart component)
   - VerbSelectorComponent (optional, dumb component)
   - StatisticsDisplayComponent (dumb component)
3. Create services/ subdirectory
4. ConfigService already created in core (use that)
5. Import necessary modules:
   - CommonModule
   - ReactiveFormsModule
   - RouterModule
   - SharedModule

**Part C: Configure Routing**
1. Create configuration-routing.module.ts
2. Define route:
   - '' (empty path) → ConfigFormComponent
3. This route loaded at /config

**Verification:**
- Module generates successfully
- Can navigate to /config
- ConfigFormComponent loads

---

### Step 7.2: Implement Config Form Component

**Goal:** Create main quiz configuration interface

**Instructions:**

**Part A: Component Setup**
1. Open config-form.component.ts
2. Import necessary items:
   - FormBuilder, FormGroup, Validators
   - ConfigService
   - VerbService
   - HistoryService (for statistics)
   - Router
3. Inject all services

**Part B: Component Properties**
1. configForm: FormGroup
2. availableTenses: string[] = ['präsens', 'präteritum', 'perfekt', 'plusquamperfekt', 'futur']
3. availableVerbTypes: string[] = ['weak', 'strong', 'irregular', 'modal']
4. availablePersons: string[] = ['ich', 'du', 'er', 'sie', 'es', 'wir', 'ihr', 'sie_plural']
5. statistics: Statistics (from HistoryService)
6. totalAvailableVerbs: number

**Part C: Initialize Form**
1. In ngOnInit:
   - Load current config from ConfigService
   - Get total verbs from VerbService
   - Get statistics from HistoryService
   - Build form with loaded values:
     ```
     this.configForm = this.fb.group({
       tenses: [config.tenses, [Validators.required, this.minArrayLength(1)]],
       verbTypes: [config.verbTypes, [Validators.required, this.minArrayLength(1)]],
       persons: [config.persons, [Validators.required, this.minArrayLength(1)]],
       questionCount: [config.questionCount, [Validators.required, Validators.min(5), Validators.max(50)]],
       difficultyRange: [[1, 3], [Validators.required]]
     });
     ```
2. Create custom validator:
   - Method: minArrayLength(min: number)
   - Returns ValidatorFn
   - Checks array length >= min
   - Returns { minArrayLength: true } if invalid

**Part D: Create Form Submission Handler**
1. Method: onSubmit()
2. Implementation:
   - Check if form valid
   - If invalid, mark all as touched and return
   - Get form values
   - Call ConfigService.updateConfig(formValues)
   - Navigate to /quiz
   - Config auto-saved to localStorage by ConfigService

**Part E: Create Checkbox Toggle Handlers**
1. For tenses, verb types, persons (checkboxes):
   - Method: toggleTense(tense: string)
   - Get current array from form control
   - If tense in array, remove it
   - If not in array, add it
   - Update form control value
   - This allows checking/unchecking boxes
2. Similar methods for verb types and persons

**Part F: Create Reset Handler**
1. Method: resetToDefaults()
2. Implementation:
   - Call ConfigService.resetToDefaults()
   - Reload form with default values
   - Show toast: "Configuration reset to defaults"

**Part G: Template Structure** (Using Tailwind CSS)
1. Page container:
   - class="max-w-4xl mx-auto p-6"
2. Page header:
   - Title: "Configure Your German Verb Quiz"
   - Description: "Select tenses, verb types, and settings for your practice session"
3. Statistics panel (at top):
   - Show user's stats in cards:
     - Total tests taken
     - Average score
     - Best score
     - Unsynced results count
   - Use grid layout: grid grid-cols-2 md:grid-cols-4 gap-4
   - Each stat card: bg-white rounded-lg shadow p-4
4. Form container:
   - class="bg-white rounded-lg shadow-md p-6"
   - [formGroup]="configForm"
   - (ngSubmit)="onSubmit()"
5. Tenses selection:
   - Label: "Select Tenses"
   - Grid of checkboxes:
     - class="grid grid-cols-2 md:grid-cols-3 gap-3"
   - Each checkbox option:
     - class="flex items-center p-3 border-2 rounded-lg cursor-pointer hover:bg-gray-50"
     - [class.border-primary]="isTenseSelected(tense)"
     - [class.bg-blue-50]="isTenseSelected(tense)"
     - Input checkbox + label
   - Validation error:
     - *ngIf="form errors"
     - class="text-sm text-error mt-2"
     - "Please select at least one tense"
6. Verb Types selection:
   - Similar to tenses
   - Pill/badge style buttons instead of checkboxes:
     - class="px-4 py-2 rounded-full border-2"
     - Click to toggle selection
     - Active: bg-primary text-white
     - Inactive: bg-white text-gray-700
7. Persons selection:
   - Grid of checkboxes
   - Group by singular/plural (optional)
8. Question Count slider:
   - Label: "Number of Questions: X"
   - Input type="range":
     - class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary"
     - min="5" max="50" step="5"
     - formControlName="questionCount"
   - Show current value above slider
   - Show min/max labels (5 and 50)
9. Difficulty Range (optional):
   - Dual range slider (1-5)
   - OR checkboxes for difficulty levels
10. Action buttons:
    - Submit button:
      - class="w-full btn-primary mt-6"
      - [disabled]="configForm.invalid"
      - "Start Quiz →"
    - Reset button:
      - class="w-full btn-secondary mt-3"
      - (click)="resetToDefaults()"
      - "Reset to Defaults"

**Part H: Show Available Verbs Count**
1. Below form, show info:
   - "X verbs available matching your criteria"
   - Use VerbService.filterVerbs() with current form values
   - Update count reactively as user changes selections
   - Color code:
     - Green if enough verbs (>= questionCount)
     - Yellow if barely enough (= questionCount)
     - Red if not enough (< questionCount)

**Part I: Responsive Design**
1. Mobile: Single column, full width
2. Tablet: 2 columns for checkboxes
3. Desktop: 3 columns, max width container

**Verification:**
- Form loads with saved or default config
- Can select/deselect all options
- Question count slider works
- Validation prevents invalid configs
- Submit saves config and navigates to quiz
- Reset button works
- Statistics display correctly
- Available verbs count updates reactively
- Form looks good on all screen sizes

---

## PHASE 8: VOCABULARY QUIZ FEATURE

### Overview
A simplified quiz mode that tests users' knowledge of verb infinitives and their English translations. Unlike the conjugation quiz, this focuses purely on vocabulary recognition.

### Feature Requirements
1. Select number of verbs to test (configurable, e.g., 10, 20, 30, 50)
2. Filter verbs by difficulty categories (A1, A2, B1, B2, C1, C2)
3. Select from multiple difficulty levels simultaneously
4. Display German infinitive → user provides English translation
5. Similar UI/UX to conjugation quiz (reuse components where possible)
6. Same result tracking and history integration
7. Immediate feedback on answers
8. Progress tracking through the vocabulary test

---

### File: vocab-quiz-config.component.ts

**Purpose:** Configuration page for vocabulary quiz settings

**Location:** src/app/features/vocab-quiz/vocab-quiz-config/vocab-quiz-config.component.ts

**Instructions:**

**Part A: Component Setup**
1. Create new feature module: ng g module features/vocab-quiz
2. Create config component: ng g component features/vocab-quiz/vocab-quiz-config
3. Import necessary items:
   - FormBuilder, FormGroup, Validators
   - VocabQuizConfigService (to be created)
   - VerbService
   - Router

**Part B: Component Properties**
```typescript
export interface VocabQuizConfig {
  verbCount: number;
  difficultyLevels: number[];  // Array of selected levels (1-3)
  includeAllTypes: boolean;  // If true, ignore verb type filters
}

// Component properties
configForm: FormGroup;
difficultyLevelOptions = [
  { level: 1, label: 'A1-A2 (Beginner)', categories: ['A1', 'A2'] },
  { level: 2, label: 'B1-B2 (Intermediate)', categories: ['B1', 'B2'] },
  { level: 3, label: 'C1-C2 (Advanced)', categories: ['C1', 'C2'] }
];
availableVerbsCount: number = 0;
previewVerbs: any[] = [];  // Show sample verbs matching criteria
```

**Part C: Initialize Form**
```typescript
ngOnInit() {
  const savedConfig = this.vocabConfigService.getConfig();
  
  this.configForm = this.fb.group({
    verbCount: [savedConfig.verbCount || 20, [
      Validators.required, 
      Validators.min(5), 
      Validators.max(100)
    ]],
    difficultyLevels: [savedConfig.difficultyLevels || [1, 2], [
      Validators.required,
      this.minArrayLength(1)
    ]],
    includeAllTypes: [savedConfig.includeAllTypes ?? true]
  });
  
  // Update count when form changes
  this.configForm.valueChanges.subscribe(() => {
    this.updateAvailableVerbsCount();
  });
  
  this.updateAvailableVerbsCount();
}
```

**Part D: Filter Verbs Logic**
```typescript
updateAvailableVerbsCount() {
  const formValue = this.configForm.value;
  const selectedLevels = formValue.difficultyLevels || [];
  
  // Get all verbs from VerbService
  const allVerbs = this.verbService.getAllVerbs();
  
  // Filter by difficulty level
  const filteredVerbs = allVerbs.filter(verb => 
    selectedLevels.includes(verb.difficulty_level)
  );
  
  this.availableVerbsCount = filteredVerbs.length;
  
  // Get random preview (5 verbs)
  this.previewVerbs = this.getRandomSample(filteredVerbs, 5);
  
  // Validate verbCount doesn't exceed available
  if (formValue.verbCount > this.availableVerbsCount) {
    this.configForm.patchValue({ 
      verbCount: this.availableVerbsCount 
    }, { emitEvent: false });
  }
}

private getRandomSample(arr: any[], count: number): any[] {
  const shuffled = [...arr].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, Math.min(count, arr.length));
}
```

**Part E: Template Structure** (Tailwind CSS)
```html
<div class="max-w-4xl mx-auto p-6">
  <!-- Header -->
  <div class="mb-8">
    <h1 class="text-3xl font-bold text-gray-900 mb-2">
      Vocabulary Quiz Setup
    </h1>
    <p class="text-gray-600">
      Test your knowledge of German verb infinitives and their English meanings
    </p>
  </div>

  <!-- Configuration Form -->
  <form [formGroup]="configForm" (ngSubmit)="onSubmit()" 
        class="bg-white rounded-lg shadow-md p-6 space-y-6">
    
    <!-- Number of Questions -->
    <div>
      <label class="block text-sm font-medium text-gray-700 mb-2">
        Number of Verbs: {{ configForm.get('verbCount')?.value }}
      </label>
      <input 
        type="range" 
        formControlName="verbCount"
        min="5" 
        max="100" 
        step="5"
        class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600">
      <div class="flex justify-between text-xs text-gray-500 mt-1">
        <span>5</span>
        <span>50</span>
        <span>100</span>
      </div>
    </div>

    <!-- Difficulty Levels -->
    <div>
      <label class="block text-sm font-medium text-gray-700 mb-3">
        Select Difficulty Levels
      </label>
      <div class="space-y-2">
        <div *ngFor="let option of difficultyLevelOptions" 
             class="flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all hover:bg-gray-50"
             [class.border-blue-600]="isLevelSelected(option.level)"
             [class.bg-blue-50]="isLevelSelected(option.level)"
             (click)="toggleLevel(option.level)">
          <input 
            type="checkbox"
            [checked]="isLevelSelected(option.level)"
            class="w-4 h-4 text-blue-600 rounded focus:ring-blue-500">
          <div class="ml-3">
            <p class="font-medium text-gray-900">{{ option.label }}</p>
            <p class="text-sm text-gray-500">{{ option.categories.join(', ') }}</p>
          </div>
        </div>
      </div>
      <div *ngIf="configForm.get('difficultyLevels')?.errors?.['minArrayLength']" 
           class="text-sm text-red-600 mt-2">
        Please select at least one difficulty level
      </div>
    </div>

    <!-- Available Verbs Info -->
    <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
      <div class="flex items-center justify-between">
        <div>
          <p class="font-medium text-blue-900">
            {{ availableVerbsCount }} verbs available
          </p>
          <p class="text-sm text-blue-700">
            Based on your selected difficulty levels
          </p>
        </div>
        <div class="text-3xl font-bold text-blue-600">
          {{ availableVerbsCount }}
        </div>
      </div>
    </div>

    <!-- Preview Verbs -->
    <div *ngIf="previewVerbs.length > 0" class="border-t pt-4">
      <p class="text-sm font-medium text-gray-700 mb-2">Sample Verbs:</p>
      <div class="flex flex-wrap gap-2">
        <span *ngFor="let verb of previewVerbs" 
              class="px-3 py-1 bg-gray-100 rounded-full text-sm text-gray-700">
          {{ verb.infinitive }} → {{ verb.english_translation }}
        </span>
      </div>
    </div>

    <!-- Action Buttons -->
    <div class="flex gap-3">
      <button 
        type="submit"
        [disabled]="configForm.invalid || availableVerbsCount === 0"
        class="flex-1 btn-primary disabled:opacity-50 disabled:cursor-not-allowed">
        Start Vocabulary Quiz →
      </button>
      <button 
        type="button"
        (click)="resetToDefaults()"
        class="flex-1 btn-secondary">
        Reset to Defaults
      </button>
    </div>
  </form>

  <!-- Navigation -->
  <div class="mt-6 text-center">
    <a routerLink="/config" class="text-blue-600 hover:text-blue-700">
      ← Back to Conjugation Quiz
    </a>
  </div>
</div>
```

**Part F: Submit Handler**
```typescript
onSubmit() {
  if (this.configForm.invalid) {
    this.configForm.markAllAsTouched();
    return;
  }

  const config: VocabQuizConfig = this.configForm.value;
  this.vocabConfigService.updateConfig(config);
  this.router.navigate(['/vocab-quiz/test']);
}

toggleLevel(level: number) {
  const control = this.configForm.get('difficultyLevels');
  const current = control?.value || [];
  
  if (current.includes(level)) {
    control?.setValue(current.filter((l: number) => l !== level));
  } else {
    control?.setValue([...current, level]);
  }
}

isLevelSelected(level: number): boolean {
  const levels = this.configForm.get('difficultyLevels')?.value || [];
  return levels.includes(level);
}

resetToDefaults() {
  this.configForm.patchValue({
    verbCount: 20,
    difficultyLevels: [1, 2],
    includeAllTypes: true
  });
}
```

---

### File: vocab-quiz-test.component.ts

**Purpose:** The actual vocabulary quiz interface

**Instructions:**

**Part A: Component Structure**
```typescript
export interface VocabQuestion {
  verb: Verb;
  userAnswer: string;
  isCorrect?: boolean;
  submitted: boolean;
}

export interface VocabQuizState {
  questions: VocabQuestion[];
  currentIndex: number;
  score: number;
  startTime: Date;
  endTime?: Date;
}

@Component({
  selector: 'app-vocab-quiz-test',
  templateUrl: './vocab-quiz-test.component.html'
})
export class VocabQuizTestComponent implements OnInit {
  quizState: VocabQuizState;
  currentQuestion: VocabQuestion;
  answerForm: FormGroup;
  showFeedback = false;
  
  constructor(
    private fb: FormBuilder,
    private vocabConfigService: VocabQuizConfigService,
    private verbService: VerbService,
    private historyService: HistoryService,
    private router: Router
  ) {}
}
```

**Part B: Initialize Quiz**
```typescript
ngOnInit() {
  const config = this.vocabConfigService.getConfig();
  const verbs = this.selectRandomVerbs(config);
  
  if (verbs.length === 0) {
    // No verbs available
    this.router.navigate(['/vocab-quiz/config']);
    return;
  }
  
  this.quizState = {
    questions: verbs.map(verb => ({
      verb,
      userAnswer: '',
      submitted: false
    })),
    currentIndex: 0,
    score: 0,
    startTime: new Date()
  };
  
  this.currentQuestion = this.quizState.questions[0];
  
  this.answerForm = this.fb.group({
    answer: ['', [Validators.required, Validators.minLength(2)]]
  });
}

private selectRandomVerbs(config: VocabQuizConfig): Verb[] {
  const allVerbs = this.verbService.getAllVerbs();
  
  // Filter by difficulty
  const filtered = allVerbs.filter(verb => 
    config.difficultyLevels.includes(verb.difficulty_level)
  );
  
  // Shuffle and select
  const shuffled = [...filtered].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, config.verbCount);
}
```

**Part C: Answer Submission**
```typescript
submitAnswer() {
  if (this.answerForm.invalid) {
    this.answerForm.markAllAsTouched();
    return;
  }
  
  const userAnswer = this.answerForm.get('answer')?.value.trim().toLowerCase();
  const correctAnswer = this.currentQuestion.verb.english_translation.toLowerCase();
  
  // Check if answer is correct (allow minor variations)
  const isCorrect = this.checkAnswer(userAnswer, correctAnswer);
  
  this.currentQuestion.userAnswer = this.answerForm.get('answer')?.value;
  this.currentQuestion.isCorrect = isCorrect;
  this.currentQuestion.submitted = true;
  
  if (isCorrect) {
    this.quizState.score++;
  }
  
  this.showFeedback = true;
}

private checkAnswer(userAnswer: string, correctAnswer: string): boolean {
  // Exact match
  if (userAnswer === correctAnswer) return true;
  
  // Remove common prefixes (to, to be, etc.)
  const cleanUser = userAnswer.replace(/^to\s+/, '');
  const cleanCorrect = correctAnswer.replace(/^to\s+/, '');
  
  if (cleanUser === cleanCorrect) return true;
  
  // Check if user answer contains the main verb
  return cleanCorrect.includes(cleanUser) || cleanUser.includes(cleanCorrect);
}

nextQuestion() {
  this.showFeedback = false;
  this.answerForm.reset();
  
  if (this.quizState.currentIndex < this.quizState.questions.length - 1) {
    this.quizState.currentIndex++;
    this.currentQuestion = this.quizState.questions[this.quizState.currentIndex];
  } else {
    this.finishQuiz();
  }
}

finishQuiz() {
  this.quizState.endTime = new Date();
  
  // Save result to history
  const result = {
    id: crypto.randomUUID(),
    userId: this.authService.getCurrentUserId(),
    testDate: this.quizState.startTime,
    testType: 'vocabulary',  // New field to distinguish quiz types
    score: this.quizState.score,
    totalQuestions: this.quizState.questions.length,
    percentage: (this.quizState.score / this.quizState.questions.length) * 100,
    answers: this.quizState.questions.map(q => ({
      infinitive: q.verb.infinitive,
      correctAnswer: q.verb.english_translation,
      userAnswer: q.userAnswer,
      isCorrect: q.isCorrect
    })),
    durationSeconds: Math.floor(
      (this.quizState.endTime.getTime() - this.quizState.startTime.getTime()) / 1000
    ),
    synced: false
  };
  
  this.historyService.addResult(result);
  this.router.navigate(['/vocab-quiz/results'], { state: { result } });
}
```

**Part D: Template Structure**
```html
<div class="min-h-screen bg-gray-50 py-8 px-4">
  <div class="max-w-2xl mx-auto">
    
    <!-- Progress Header -->
    <div class="mb-6">
      <div class="flex justify-between items-center mb-2">
        <span class="text-sm font-medium text-gray-600">
          Question {{ quizState.currentIndex + 1 }} of {{ quizState.questions.length }}
        </span>
        <span class="text-sm font-medium text-gray-600">
          Score: {{ quizState.score }}/{{ quizState.currentIndex + 1 }}
        </span>
      </div>
      <div class="w-full bg-gray-200 rounded-full h-2">
        <div 
          class="bg-blue-600 h-2 rounded-full transition-all duration-300"
          [style.width.%]="((quizState.currentIndex + 1) / quizState.questions.length) * 100">
        </div>
      </div>
    </div>

    <!-- Question Card -->
    <div class="bg-white rounded-lg shadow-lg p-8">
      
      <!-- German Verb -->
      <div class="text-center mb-8">
        <p class="text-sm text-gray-600 mb-2">Translate to English:</p>
        <p class="text-5xl font-bold text-gray-900">
          {{ currentQuestion.verb.infinitive }}
        </p>
        <span class="inline-block mt-3 px-3 py-1 bg-gray-100 rounded-full text-xs text-gray-600">
          {{ currentQuestion.verb.verb_type }}
        </span>
      </div>

      <!-- Answer Form -->
      <form [formGroup]="answerForm" (ngSubmit)="submitAnswer()" *ngIf="!showFeedback">
        <div class="mb-6">
          <input 
            type="text"
            formControlName="answer"
            placeholder="Enter English translation..."
            class="w-full px-4 py-3 text-lg border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
            [class.border-red-500]="answerForm.get('answer')?.invalid && answerForm.get('answer')?.touched">
          <p *ngIf="answerForm.get('answer')?.errors?.['required'] && answerForm.get('answer')?.touched"
             class="text-sm text-red-600 mt-2">
            Please enter an answer
          </p>
        </div>
        
        <button 
          type="submit"
          [disabled]="answerForm.invalid"
          class="w-full btn-primary text-lg py-3 disabled:opacity-50">
          Check Answer
        </button>
      </form>

      <!-- Feedback -->
      <div *ngIf="showFeedback" class="space-y-4">
        
        <!-- Correct/Incorrect Badge -->
        <div class="text-center">
          <div *ngIf="currentQuestion.isCorrect" 
               class="inline-flex items-center px-6 py-3 bg-green-100 text-green-800 rounded-lg">
            <svg class="w-6 h-6 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
            </svg>
            <span class="font-semibold">Correct!</span>
          </div>
          <div *ngIf="!currentQuestion.isCorrect" 
               class="inline-flex items-center px-6 py-3 bg-red-100 text-red-800 rounded-lg">
            <svg class="w-6 h-6 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/>
            </svg>
            <span class="font-semibold">Incorrect</span>
          </div>
        </div>

        <!-- Answer Details -->
        <div class="bg-gray-50 rounded-lg p-4 space-y-2">
          <div class="flex justify-between">
            <span class="text-gray-600">Your answer:</span>
            <span [class.text-green-700]="currentQuestion.isCorrect"
                  [class.text-red-700]="!currentQuestion.isCorrect"
                  class="font-medium">
              {{ currentQuestion.userAnswer }}
            </span>
          </div>
          <div *ngIf="!currentQuestion.isCorrect" class="flex justify-between">
            <span class="text-gray-600">Correct answer:</span>
            <span class="font-medium text-green-700">
              {{ currentQuestion.verb.english_translation }}
            </span>
          </div>
        </div>

        <!-- Next Button -->
        <button 
          (click)="nextQuestion()"
          class="w-full btn-primary text-lg py-3">
          {{ quizState.currentIndex < quizState.questions.length - 1 ? 'Next Question →' : 'Finish Quiz' }}
        </button>
      </div>

    </div>

    <!-- Quit Button -->
    <div class="mt-4 text-center">
      <button 
        (click)="quitQuiz()"
        class="text-gray-600 hover:text-gray-800">
        Quit Quiz
      </button>
    </div>

  </div>
</div>
```

---

### File: vocab-quiz-results.component.ts

**Purpose:** Display vocabulary quiz results

**Instructions:**

Similar to the conjugation quiz results component, but adapted for vocabulary quiz:

1. Show final score and percentage
2. List all questions with user answers vs correct answers
3. Highlight correct/incorrect answers
4. Show statistics (time taken, accuracy)
5. Buttons:
   - Take Another Vocabulary Quiz
   - View All History
   - Back to Config

**Template includes:**
- Score summary card (large percentage display)
- Time taken
- Detailed answer review (infinitive → user answer → correct answer)
- Option to retake with same settings
- Share results (optional)

---

### File: vocab-quiz-config.service.ts

**Purpose:** Manage vocabulary quiz configuration

```typescript
@Injectable({ providedIn: 'root' })
export class VocabQuizConfigService {
  private readonly STORAGE_KEY = 'vocab-quiz-config';
  
  private defaultConfig: VocabQuizConfig = {
    verbCount: 20,
    difficultyLevels: [1, 2],
    includeAllTypes: true
  };

  getConfig(): VocabQuizConfig {
    const saved = localStorage.getItem(this.STORAGE_KEY);
    return saved ? JSON.parse(saved) : this.defaultConfig;
  }

  updateConfig(config: VocabQuizConfig): void {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(config));
  }

  resetToDefaults(): void {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.defaultConfig));
  }
}
```

---

### Routing Updates

**Add to app-routing.module.ts:**

```typescript
{
  path: 'vocab-quiz',
  canActivate: [AuthGuard],
  children: [
    {
      path: '',
      redirectTo: 'config',
      pathMatch: 'full'
    },
    {
      path: 'config',
      component: VocabQuizConfigComponent
    },
    {
      path: 'test',
      component: VocabQuizTestComponent
    },
    {
      path: 'results',
      component: VocabQuizResultsComponent
    }
  ]
}
```

---

### Navigation Updates

**Add to main navigation menu:**

```html
<!-- In header/navigation component -->
<nav>
  <a routerLink="/config" routerLinkActive="active">Conjugation Quiz</a>
  <a routerLink="/vocab-quiz/config" routerLinkActive="active">Vocabulary Quiz</a>
  <a routerLink="/history" routerLinkActive="active">History</a>
</nav>
```

---

### History Service Updates

**Modify HistoryService to support both quiz types:**

```typescript
export interface TestResult {
  id: string;
  userId: string;
  testDate: Date;
  testType: 'conjugation' | 'vocabulary';  // NEW FIELD
  score: number;
  totalQuestions: number;
  percentage: number;
  // ... other fields
}

// Filter methods
getConjugationResults(): TestResult[] {
  return this.getAllResults().filter(r => r.testType === 'conjugation');
}

getVocabularyResults(): TestResult[] {
  return this.getAllResults().filter(r => r.testType === 'vocabulary');
}

getStatisticsByType(type: 'conjugation' | 'vocabulary'): Statistics {
  const results = type === 'conjugation' 
    ? this.getConjugationResults() 
    : this.getVocabularyResults();
  
  // Calculate stats...
}
```

---

### Verification Checklist

**Vocabulary Quiz Config:**
- [ ] Can select number of verbs (5-100)
- [ ] Can select multiple difficulty levels
- [ ] Shows available verbs count
- [ ] Shows preview of matching verbs
- [ ] Validates minimum selections
- [ ] Saves config to localStorage
- [ ] Navigates to test on submit

**Vocabulary Quiz Test:**
- [ ] Displays German infinitive clearly
- [ ] Input field for English translation
- [ ] Checks answer with tolerance for variations
- [ ] Shows immediate feedback (correct/incorrect)
- [ ] Displays correct answer when wrong
- [ ] Tracks score accurately
- [ ] Shows progress through questions
- [ ] Can quit quiz anytime
- [ ] Saves result to history on completion

**Vocabulary Quiz Results:**
- [ ] Shows final score and percentage
- [ ] Displays time taken
- [ ] Lists all questions with answers
- [ ] Color codes correct/incorrect
- [ ] Can retake quiz
- [ ] Navigates to history

**Integration:**
- [ ] Results appear in history with 'vocabulary' type label
- [ ] Statistics calculated separately for each quiz type
- [ ] Both quiz types sync to server correctly
- [ ] Navigation between conjugation and vocabulary quiz works
- [ ] Responsive design on all screen sizes

---

## PHASE 9-12: REMAINING FEATURES

The remaining phases (Conjugation Quiz, Results, History, Sync) follow the same implementation pattern as originally documented in the previous guide, with these updates:

**Key Changes:**
1. All features now require authentication (AuthGuard applied)
2. User ID is included in all data saves (results, sync)
3. Navigation header shows user-specific info
4. All Tailwind CSS styling patterns established in previous sections apply
5. History now supports both conjugation and vocabulary quiz types

---

## TESTING STRATEGY

### Unit Testing
1. Service testing:
   - Mock Supabase responses
   - Test authentication flows
   - Test data transformations
   - Test error handling
2. Component testing:
   - Test form validation
   - Test user interactions
   - Test conditional rendering
   - Mock service dependencies

### Integration Testing
1. Authentication flow:
   - Register → Email verification → Login
   - Login → Verb load → Quiz flow
   - Logout → Clear data
2. Complete quiz flow:
   - Config → Quiz → Results → History
   - Sync → Verify server data
3. Admin flow:
   - Upload verbs → Validate → Refresh cache

### E2E Testing (Cypress/Playwright)
1. User journey tests:
   - New user registration and first quiz
   - Returning user login and history review
   - Admin verb upload
2. Edge case tests:
   - Network failures during sync
   - Invalid JSON upload
   - Session expiration during quiz

---

## DEPLOYMENT GUIDE

### Pre-Deployment Checklist
1. Environment variables set correctly in production
2. Supabase RLS policies tested and verified
3. All authentication flows tested
4. Email templates configured in Supabase
5. CORS settings include production domain
6. Build optimization (ng build --configuration production)
7. Test production build locally

### Deployment Steps
1. Build Angular app for production
2. Deploy to hosting (Vercel, Netlify, Firebase Hosting)
3. Configure environment variables on host
4. Set up custom domain (optional)
5. Enable HTTPS
6. Test deployed application
7. Monitor for errors (Sentry, LogRocket)

### Post-Deployment
1. Verify authentication works
2. Test verb upload as admin
3. Complete full quiz flow
4. Test sync functionality
5. Monitor server wake-up times
6. Gather user feedback

---

## CONCLUSION

This implementation guide provides complete instructions for building a German Verb Trainer with:
- ✅ User authentication (register/login/logout)
- ✅ Protected routes with auth guards
- ✅ Admin verb upload functionality
- ✅ Offline-first architecture
- ✅ Manual server synchronization
- ✅ Tailwind CSS styling
- ✅ Responsive design
- ✅ Optimized for slow/sleeping servers

Follow each phase sequentially, verify at each step, and you'll have a fully functional application.
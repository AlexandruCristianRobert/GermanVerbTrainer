# German Verb Trainer - Angular SPA + Supabase Architecture Plan
## Offline-First, Tailwind CSS Edition (AI Implementation Guide)

## Executive Overview

This document provides a complete architectural blueprint for building a **German Verb Trainer** as an **Angular 18+ Single Page Application** with **Tailwind CSS** styling and **offline-first architecture**. The app is designed to minimize server interactions due to hosting on a slow/sleeping server (free-tier Supabase that sleeps after 2 minutes of inactivity).

### **Core Architectural Principles:**
- ✅ **Single Initial Load:** Load all verbs from Supabase once on app initialization
- ✅ **In-Memory Storage:** Keep all verb data in browser memory for instant access
- ✅ **Local Persistence:** Store test history and settings in browser localStorage
- ✅ **Manual Sync Only:** User clicks "Upload History" button to push data to Supabase
- ✅ **100% Client-Side Logic:** All quiz generation, scoring, and validation runs in browser
- ✅ **Tailwind CSS:** Utility-first styling without heavy component library dependencies
- ✅ **Optimized for Sleeping Servers:** Designed to handle long server wake-up times

---

## Architecture Philosophy

### **Why Offline-First?**

**Problem:** Your Supabase instance sleeps after 2 minutes of inactivity. Every database call:
- Takes 5-15 seconds to wake the server
- Blocks the user interface
- Creates poor user experience
- Makes the app feel slow and unresponsive

**Solution:** Load everything once, then work entirely offline:
- First load: 5-15 seconds (acceptable one-time cost)
- Every subsequent action: Instant (milliseconds)
- User controls when to sync data back to server
- App works even without internet after initial load

### **Data Flow Strategy**

```
App Start (ONE TIME):
1. Show loading screen
2. Fetch ALL verbs from Supabase (single HTTP request)
3. Store verbs in memory (JavaScript object/array)
4. Load user history from localStorage
5. Hide loading screen → app ready

Normal Usage (NO SERVER CALLS):
1. Configure quiz → Read from memory
2. Generate questions → Use in-memory verbs
3. User answers → Validate against memory
4. Score quiz → Pure computation
5. Save result → localStorage only
6. View history → Read from localStorage

Manual Sync (USER TRIGGERED):
1. User clicks "Upload History" button
2. Check if server is awake (optional ping)
3. Send all unsynced results to Supabase
4. Mark results as synced in localStorage
5. Show success message
```

---

## Supabase Database Schema

### **Table 1: verbs (READ-ONLY FOR CLIENT)**

**Purpose:** Master verb conjugation database - loaded once on app start

**Columns to Create:**
- **id** - UUID, primary key, auto-generated
- **infinitive** - Text, unique index, not null (examples: "sein", "haben", "gehen")
- **english_translation** - Text, not null (examples: "to be", "to have", "to go")
- **verb_type** - Text or ENUM, not null (values: "weak", "strong", "irregular", "modal")
- **stem** - Text, not null (base form used for conjugation rules)
- **conjugations** - JSONB, not null (nested structure containing all tense/person forms)
- **difficulty_level** - Integer, not null (1-5 scale for progressive learning)
- **created_at** - Timestamp with time zone, defaults to now()

**JSONB Structure for conjugations column:**
```
{
  "präsens": {
    "ich": "bin",
    "du": "bist",
    "er": "ist",
    "wir": "sind",
    "ihr": "seid",
    "sie": "sind"
  },
  "präteritum": {
    "ich": "war",
    "du": "warst",
    ...
  },
  "perfekt": {
    "ich": "bin gewesen",
    ...
  },
  "plusquamperfekt": { ... },
  "futur": { ... }
}
```

**Row Level Security (RLS) Policy:**
- Enable RLS on the table
- Create policy: "Allow public SELECT" - anyone can read verbs (no authentication required)
- No INSERT/UPDATE/DELETE policies needed (verbs are seeded by admin)

**Client Interaction Strategy:**
- Fetch ALL rows on app initialization (single query: SELECT * FROM verbs)
- Store in JavaScript Map or Array in memory
- Never query again during session
- On page refresh: Load from memory cache if available, else re-fetch

---

### **Table 2: test_results (WRITE-ONLY, MANUAL SYNC)**

**Purpose:** Server backup of quiz performance - written to only when user clicks "Upload History"

**Columns to Create:**
- **id** - UUID, primary key, auto-generated
- **user_id** - UUID, nullable, foreign key to auth.users (null for anonymous users)
- **test_date** - Timestamp with time zone, not null
- **score** - Integer, not null (number of correct answers)
- **total_questions** - Integer, not null
- **percentage** - Numeric/Decimal, not null (calculated: score/total * 100)
- **test_configuration** - JSONB, not null (snapshot of quiz settings used)
- **answers** - JSONB, not null (detailed answer log for review)
- **duration_seconds** - Integer, nullable (if implementing timer feature)
- **synced_from_client** - Timestamp with time zone (when uploaded from localStorage)
- **client_generated_id** - Text, unique (original localStorage ID to prevent duplicate uploads)

**JSONB Structure for test_configuration column:**
```
{
  "tenses": ["präsens", "präteritum"],
  "verb_types": ["strong", "irregular"],
  "persons": ["ich", "du", "er"],
  "question_count": 20
}
```

**JSONB Structure for answers column:**
```
[
  {
    "verb": "gehen",
    "tense": "präteritum",
    "person": "ich",
    "correct_answer": "ging",
    "user_answer": "ginge",
    "is_correct": false
  },
  {
    "verb": "haben",
    "tense": "präsens",
    "person": "du",
    "correct_answer": "hast",
    "user_answer": "hast",
    "is_correct": true
  }
]
```

**Row Level Security (RLS) Policy:**
- Enable RLS on the table
- Create policy: "Users can insert own records" - allow INSERT where user_id = auth.uid() OR user_id IS NULL
- Create policy: "Users can read own records" - allow SELECT where user_id = auth.uid() OR user_id IS NULL
- Optional: Allow UPDATE on synced_from_client column only

**Client Interaction Strategy:**
- Store test results ONLY in localStorage immediately after quiz
- When user clicks "Upload History" button:
  - Read all unsynced results from localStorage
  - Send in batch INSERT to Supabase
  - Mark results as synced in localStorage
  - Never auto-sync without user action

---

### **Table 3: user_preferences (OPTIONAL)**

**Purpose:** Server backup of user settings - synced manually if user wants cross-device settings

**Columns to Create:**
- **user_id** - UUID, primary key, foreign key to auth.users
- **default_config** - JSONB (same structure as test_configuration)
- **favorite_verbs** - Text array (list of infinitives)
- **ui_preferences** - JSONB (theme, language, display options)
- **updated_at** - Timestamp with time zone, auto-updated

**Row Level Security (RLS) Policy:**
- Enable RLS on the table
- Policy: "Users can read/write own preferences" - allow all operations where user_id = auth.uid()

**Client Interaction Strategy:**
- Store preferences in localStorage by default
- Optional: Sync to Supabase if user wants cross-device support
- Pull from Supabase on login if available
- Otherwise use localStorage values

---

### **Table 4: auth.users (SUPABASE BUILT-IN)**

**Purpose:** User authentication for cross-device sync (optional feature)

**Implementation Notes:**
- Managed entirely by Supabase Auth
- Enable email/password authentication
- Enable anonymous authentication for users who don't want accounts
- Anonymous users can still use app fully, just no cross-device sync

**Client Interaction Strategy:**
- Optional feature - app works without authentication
- If user wants cross-device sync:
  - Offer sign-up/login UI
  - Store user_id with test results
  - Enable server-side history access
- Anonymous users:
  - user_id stays null in test_results
  - Everything stored locally
  - Can still manually upload to server for backup

---

## Angular Application Structure

### **Directory Organization (Feature-Based Modules)**

**Root Level (src/):**
- **app/** - Main application directory
- **environments/** - Environment-specific configuration files
- **assets/** - Static resources (images, fonts, fallback data)
- **styles.scss** - Global Tailwind CSS imports and custom styles

**Core Module (app/core/):**
- **Purpose:** Singleton services used throughout the app
- **services/** subdirectory:
  - supabase.service.ts - Wrapper for Supabase client (minimal usage)
  - cache.service.ts - In-memory verb storage and retrieval
  - storage.service.ts - localStorage abstraction layer
  - sync.service.ts - Manual history upload to Supabase
  - auth.service.ts - Optional authentication logic
- **guards/** subdirectory:
  - data-loaded.guard.ts - Ensures verbs loaded before allowing quiz
- **interceptors/** subdirectory:
  - error.interceptor.ts - Global HTTP error handling
- **models/** subdirectory:
  - TypeScript interfaces/types shared across features

**Shared Module (app/shared/):**
- **Purpose:** Reusable UI components, pipes, directives
- **components/** subdirectory:
  - loading-spinner/ - Tailwind-styled loading indicator
  - error-message/ - Toast/alert component for errors
  - navigation-header/ - Top navigation bar
  - sync-status-indicator/ - Shows online/offline and sync status
  - modal/ - Reusable modal wrapper with Tailwind styling
- **pipes/** subdirectory:
  - safe-html.pipe.ts - Sanitize HTML for displaying umlauts
- **directives/** subdirectory:
  - auto-focus.directive.ts - Auto-focus input fields

**Feature Modules (app/features/):**

**1. Configuration Module (features/configuration/):**
- **Purpose:** Test setup and configuration
- **components/** subdirectory:
  - config-form/ - Main configuration form component
  - verb-selector/ - Optional manual verb selection UI
  - statistics-display/ - Show user's overall stats
- **services/** subdirectory:
  - config.service.ts - Manage quiz settings in localStorage
- **models/** subdirectory:
  - test-config.model.ts - TypeScript interfaces for configuration

**2. Quiz Module (features/quiz/):**
- **Purpose:** Active quiz functionality
- **components/** subdirectory:
  - quiz-container/ - Main quiz orchestration component
  - question-item/ - Individual question display and input
  - progress-bar/ - Visual progress indicator
  - quiz-timer/ - Optional countdown timer
- **services/** subdirectory:
  - quiz.service.ts - Question generation and scoring logic
  - verb.service.ts - Query in-memory verb cache
- **models/** subdirectory:
  - question.model.ts - Question data structure
  - answer.model.ts - Answer data structure

**3. Results Module (features/results/):**
- **Purpose:** Post-quiz feedback and review
- **components/** subdirectory:
  - results-summary/ - Score display and congratulations
  - answer-review/ - Detailed correct/incorrect breakdown
  - results-actions/ - Buttons for next actions
- **services/** subdirectory:
  - results.service.ts - Save results to localStorage

**4. History Module (features/history/):**
- **Purpose:** View past test results
- **components/** subdirectory:
  - history-table/ - List of all past tests
  - result-detail-modal/ - Popup with full answer breakdown
  - history-filters/ - Filter by date, score, etc.
  - statistics-panel/ - Aggregate statistics display
- **services/** subdirectory:
  - history.service.ts - Read from localStorage

**5. Sync Module (features/sync/) - NEW:**
- **Purpose:** Manual server synchronization
- **components/** subdirectory:
  - sync-manager/ - Upload/download controls
  - sync-status-display/ - Last sync time, pending count
  - sync-history-log/ - Log of sync operations
- **services/** subdirectory:
  - Already handled by core/services/sync.service.ts

**App-Level Files:**
- **app.component.ts** - Root component with initial data load
- **app.module.ts** - Root module with imports
- **app-routing.module.ts** - Top-level routing configuration

---

## Step-by-Step Implementation Guide

### **PHASE 1: PROJECT SETUP & INFRASTRUCTURE**

#### **Step 1.1: Create Angular Project and Install Tailwind CSS**

**Task:** Initialize new Angular application with Tailwind CSS support

**Instructions:**
1. Use Angular CLI to generate new project
   - Name it "german-verb-trainer"
   - Enable routing when prompted
   - Choose SCSS for styling when prompted
   - Use standalone components or traditional modules (your choice)

2. Install Tailwind CSS and its peer dependencies
   - Install tailwindcss, postcss, and autoprefixer as dev dependencies
   - Run Tailwind initialization command to generate config file

3. Configure Tailwind CSS
   - Edit tailwind.config.js file
   - Set content paths to scan all HTML and TypeScript files in src directory
   - Configure theme extensions:
     - Add custom colors (primary blue, success green, error red, warning yellow)
     - Add custom spacing if needed
     - Add custom font families if needed
   - Configure plugins if needed (forms, typography, etc.)

4. Set up global styles
   - Open src/styles.scss file
   - Import Tailwind's base, components, and utilities layers
   - Add custom CSS classes using @layer directive:
     - Create .btn-primary class with primary color background
     - Create .btn-secondary class with outline style
     - Create .card class with white background, rounded corners, shadow
     - Create .input-field class with border, focus states, rounded corners
   - Add any global typography or layout styles

5. Verify Tailwind is working
   - Run development server
   - Add some Tailwind classes to app.component.html
   - Check that styles are applied in browser

**Success Criteria:**
- Angular app runs without errors
- Tailwind utility classes work in templates
- Custom component classes work
- Hot reload functions properly

---

#### **Step 1.2: Install Core Dependencies**

**Task:** Add required npm packages for Supabase and utilities

**Instructions:**
1. Install Supabase JavaScript client library
   - Add @supabase/supabase-js package
   - This is the only external API library needed

2. Install UUID library for generating unique IDs
   - Add uuid package and its TypeScript types
   - This will be used for local result IDs

3. Optional: Install date-fns or similar for date formatting
   - Not strictly necessary (can use native Date methods)
   - Helpful for consistent date displays

4. Update package.json scripts if needed
   - Ensure build scripts are optimized for production
   - Add any custom scripts for deployment

**Success Criteria:**
- All packages install without conflicts
- No TypeScript errors from missing types
- App still runs after installation

---

#### **Step 1.3: Set Up Environment Configuration**

**Task:** Create environment files for Supabase credentials

**Instructions:**
1. Locate environment files in Angular project
   - Find src/environments/environment.ts (development)
   - Find src/environments/environment.prod.ts (production)

2. Add Supabase configuration to both files
   - Add supabaseUrl property (get from Supabase project dashboard)
   - Add supabaseAnonKey property (public anon key from Supabase)
   - Add production flag (true for prod, false for dev)
   - Consider adding API timeout settings (important for sleeping server)

3. Configure TypeScript strict mode
   - Open tsconfig.json
   - Enable strict: true
   - Enable strictNullChecks: true
   - Enable strictPropertyInitialization: true
   - These help catch errors at compile time

4. Add .env to .gitignore if needed
   - Ensure sensitive keys are not committed to version control
   - Document required environment variables in README

**Success Criteria:**
- Environment files exist with correct structure
- No credentials are committed to git
- TypeScript strict mode enabled
- App compiles without errors

---

#### **Step 1.4: Create Supabase Project and Database**

**Task:** Set up Supabase backend with required tables

**Instructions:**
1. Create new Supabase project
   - Go to supabase.com and sign up/login
   - Create new project (choose free tier)
   - Note down project URL and anon key
   - Wait for project to finish initializing (2-3 minutes)

2. Create verbs table using SQL editor
   - Open SQL Editor in Supabase dashboard
   - Create table with columns as specified in schema section above:
     - id (uuid, primary key, default uuid_generate_v4())
     - infinitive (text, not null, unique)
     - english_translation (text, not null)
     - verb_type (text, not null)
     - stem (text, not null)
     - conjugations (jsonb, not null)
     - difficulty_level (integer, not null)
     - created_at (timestamp with time zone, default now())
   - Add index on infinitive column for faster lookups
   - Add index on verb_type for filtering
   - Add index on difficulty_level for filtering

3. Create test_results table using SQL editor
   - Create table with columns as specified in schema section:
     - id (uuid, primary key, default uuid_generate_v4())
     - user_id (uuid, nullable, foreign key to auth.users)
     - test_date (timestamp with time zone, not null)
     - score (integer, not null)
     - total_questions (integer, not null)
     - percentage (numeric, not null)
     - test_configuration (jsonb, not null)
     - answers (jsonb, not null)
     - duration_seconds (integer, nullable)
     - synced_from_client (timestamp with time zone)
     - client_generated_id (text, unique)
   - Add index on test_date for sorting
   - Add index on user_id for filtering
   - Add index on client_generated_id for deduplication

4. Create user_preferences table (optional)
   - Create table with columns as specified in schema section
   - Add appropriate indexes

5. Set up Row Level Security (RLS) policies
   - For verbs table:
     - Enable RLS
     - Create policy: "Allow public SELECT"
       - Name: "Public read access"
       - Operation: SELECT
       - Check expression: true (allows all reads)
     - No other policies needed (admin manages verb data)
   
   - For test_results table:
     - Enable RLS
     - Create policy: "Users can insert own records"
       - Name: "Insert own results"
       - Operation: INSERT
       - Check expression: auth.uid() = user_id OR user_id IS NULL
     - Create policy: "Users can read own records"
       - Name: "Read own results"
       - Operation: SELECT
       - Check expression: auth.uid() = user_id OR user_id IS NULL
   
   - For user_preferences table (if created):
     - Enable RLS
     - Create policy allowing all operations where user_id = auth.uid()

6. Configure CORS settings
   - Go to Project Settings > API
   - Add http://localhost:4200 to allowed origins (for development)
   - Add your production domain when deploying

7. Seed verbs table with initial data
   - Option A: Import from CSV/JSON file in Supabase dashboard
   - Option B: Write SQL INSERT statements for common German verbs
   - Start with 20-50 essential verbs (sein, haben, gehen, kommen, etc.)
   - Include mix of weak, strong, and irregular verbs
   - Include all tense conjugations in JSONB format

**Success Criteria:**
- All tables created with correct columns
- RLS policies applied and tested
- CORS configured for local development
- At least 20 verbs seeded in database
- Can query verbs table from SQL editor successfully

---

#### **Step 1.5: Create Core Module Structure**

**Task:** Set up the core module with singleton services

**Instructions:**
1. Generate core module using Angular CLI
   - Create core folder in app directory
   - Generate core.module.ts file
   - Configure it as a singleton module (import only in AppModule)

2. Create services subdirectory in core folder
   - Will hold all singleton services
   - These services will be provided in root

3. Generate service skeletons (no implementation yet)
   - Create supabase.service.ts - wrapper for Supabase client
   - Create cache.service.ts - in-memory verb storage
   - Create storage.service.ts - localStorage abstraction
   - Create sync.service.ts - manual history upload
   - Create auth.service.ts - optional authentication

4. Create guards subdirectory
   - Generate data-loaded.guard.ts - ensures verbs loaded before quiz

5. Create interceptors subdirectory
   - Generate error.interceptor.ts - global HTTP error handling

6. Create models subdirectory in core
   - Create TypeScript interfaces for:
     - Verb (matches database schema)
     - TestResult (matches database schema)
     - TestConfig (quiz configuration structure)
     - Question (quiz question structure)
     - Answer (user answer structure)
     - SyncResult (sync operation result)
     - Statistics (aggregate statistics)

7. Configure core module
   - Import all services
   - Provide services at root level
   - Export guards and interceptors
   - Do NOT export services (they're global singletons)

**Success Criteria:**
- Core module exists and is importable
- All service files created (empty implementations okay)
- All TypeScript interfaces defined
- Module compiles without errors
- Core module imported in AppModule once only

---

### **PHASE 2: CORE SERVICES IMPLEMENTATION**

#### **Step 2.1: Implement Supabase Service**

**Task:** Create wrapper service for Supabase client with minimal API surface

**Instructions:**
1. Import Supabase createClient function from library
2. Import environment configuration for URL and key
3. Initialize Supabase client in service constructor
   - Create client using environment variables
   - Store client as private property
   - Configure timeout settings (important for sleeping server)
4. Create method to expose client for direct access
   - Public getter: getClient() returns SupabaseClient
   - Use sparingly - prefer specific methods below
5. Create method to load all verbs
   - Method: loadAllVerbs() returns Observable<Verb[]>
   - Query: SELECT * FROM verbs ORDER BY infinitive
   - Use RxJS from() to convert Promise to Observable
   - Map response data to Verb[] type
   - Handle errors gracefully (return empty array with console warning)
6. Create method to upload test results
   - Method: uploadResults(results: TestResult[]) returns Observable<void>
   - Use batch INSERT with ON CONFLICT handling
   - Check client_generated_id to prevent duplicates
   - Handle errors and return meaningful error messages
7. Optional: Create method to download user's history
   - Method: downloadHistory(userId?: string) returns Observable<TestResult[]>
   - Query with user_id filter if authenticated
   - Otherwise query where user_id IS NULL
8. Add logging for development
   - Log successful operations to console
   - Log errors with full context
   - Use environment flag to disable in production

**Key Concepts:**
- This service is ONLY used on app initialization and manual sync
- All methods return Observables for reactive programming
- Errors should be caught and handled gracefully
- Never expose credentials or sensitive data in logs

**Success Criteria:**
- Service compiles without TypeScript errors
- Can successfully connect to Supabase
- Can fetch verbs from database
- Can insert test results
- Error handling works (test with invalid data)

---

#### **Step 2.2: Implement Cache Service**

**Task:** Create in-memory verb storage with instant retrieval

**Instructions:**
1. Define private property to store verbs
   - Use JavaScript Map<string, Verb> for O(1) lookups by infinitive
   - OR use Array<Verb> if you prefer simpler structure
   - Add flag: private isInitialized = false

2. Create initialization method
   - Method: initializeCache() returns Promise<void>
   - Call SupabaseService.loadAllVerbs()
   - Convert Observable to Promise using firstValueFrom or toPromise
   - Store all verbs in Map/Array
   - Set isInitialized = true
   - Handle errors:
     - If Supabase fails, try loading from fallback JSON in assets
     - If fallback fails, throw error (app cannot function without verbs)
   - Log success message with verb count

3. Create method to check if cache is ready
   - Method: isCacheReady() returns boolean
   - Simply return isInitialized flag
   - Used by route guards to prevent accessing quiz before data loads

4. Create method to get all verbs
   - Method: getAllVerbs() returns Verb[]
   - Return all verbs from Map/Array
   - Return empty array if not initialized (with console warning)
   - This is synchronous - no async needed

5. Create method to get verb by infinitive
   - Method: getVerbByInfinitive(infinitive: string) returns Verb | undefined
   - Lookup in Map by key
   - OR find in Array by infinitive property
   - Return undefined if not found

6. Create method to filter verbs by criteria
   - Method: filterVerbs(criteria: VerbFilter) returns Verb[]
   - VerbFilter interface has optional properties: types, difficulty, infinitives
   - Filter array based on provided criteria
   - Return all matches
   - Synchronous operation - very fast with in-memory data

7. Create method to search verbs
   - Method: searchVerbs(query: string) returns Verb[]
   - Search in infinitive and english_translation fields
   - Case-insensitive matching
   - Return all matches

8. Optional: Create method to get random verbs
   - Method: getRandomVerbs(count: number, criteria?: VerbFilter) returns Verb[]
   - First filter by criteria if provided
   - Then randomly select specified count
   - Use Fisher-Yates shuffle algorithm
   - Return array of selected verbs

**Key Concepts:**
- Cache is populated ONCE on app start
- All retrieval methods are synchronous (instant)
- No HTTP calls after initialization
- Data lives in memory until page refresh
- This is the core performance optimization

**Success Criteria:**
- Cache initializes successfully with all verbs
- All query methods return correct results instantly
- No async operations after initialization
- Memory usage is reasonable (should be <5MB for 200 verbs)
- Methods handle edge cases (empty results, not initialized)

---

#### **Step 2.3: Implement Storage Service**

**Task:** Create localStorage abstraction for test results and configuration

**Instructions:**
1. Define localStorage key constants
   - Constant: TEST_RESULTS_KEY = 'german-verb-trainer-results'
   - Constant: CONFIG_KEY = 'german-verb-trainer-config'
   - Constant: SYNC_STATUS_KEY = 'german-verb-trainer-sync'

2. Create method to save test result
   - Method: saveTestResult(result: TestResult) returns void
   - Read existing results from localStorage
   - Parse JSON to TestResult[] array
   - Add new result to array
   - Stringify array and save back to localStorage
   - Handle quota exceeded errors gracefully
   - Log success/failure

3. Create method to get all test results
   - Method: getTestResults() returns TestResult[]
   - Read from localStorage using TEST_RESULTS_KEY
   - Parse JSON to array
   - Handle null/undefined (return empty array)
   - Handle parse errors (return empty array, log warning)
   - Sort by test_date descending before returning

4. Create method to update test result
   - Method: updateTestResult(id: string, updates: Partial<TestResult>) returns void
   - Get all results
   - Find result by id
   - Merge updates into found result
   - Save back to localStorage
   - Used for marking results as synced

5. Create method to delete test result
   - Method: deleteTestResult(id: string) returns void
   - Get all results
   - Filter out result with matching id
   - Save filtered array back to localStorage

6. Create method to save configuration
   - Method: saveConfig(config: TestConfig) returns void
   - Stringify config object
   - Save to localStorage using CONFIG_KEY
   - Handle errors

7. Create method to get configuration
   - Method: getConfig() returns TestConfig | null
   - Read from localStorage
   - Parse JSON
   - Return null if not found
   - Handle parse errors

8. Create method to clear all data
   - Method: clearAllData() returns void
   - Remove all keys used by app
   - Useful for reset functionality
   - Confirm with user before calling

9. Create method to export data as JSON
   - Method: exportToJSON() returns string
   - Get all results and config
   - Combine into single object
   - Stringify with pretty formatting (JSON.stringify with indent)
   - Return string that user can save as file

10. Create method to import data from JSON
    - Method: importFromJSON(jsonString: string) returns void
    - Parse JSON string
    - Validate structure
    - Save to localStorage
    - Handle errors

**Key Concepts:**
- localStorage is synchronous (no async needed)
- Always handle JSON parse errors
- Always handle quota exceeded errors
- Validate data before saving
- Provide clear error messages

**Success Criteria:**
- Can save and retrieve test results
- Can save and retrieve configuration
- Handles errors gracefully
- Export/import functionality works
- Data persists across browser sessions
- Works in incognito mode (with quota limits)

---

#### **Step 2.4: Implement Sync Service**

**Task:** Create manual synchronization between localStorage and Supabase

**Instructions:**
1. Inject dependencies in constructor
   - Inject StorageService
   - Inject SupabaseService
   - Inject AuthService (optional)

2. Create method to get unsynced results
   - Method: getUnsyncedResults() returns TestResult[]
   - Call StorageService.getTestResults()
   - Filter for results where synced = false
   - Return filtered array

3. Create method to upload history to Supabase
   - Method: uploadHistory() returns Observable<SyncResult>
   - Get unsynced results from StorageService
   - If empty, return immediately with success message
   - Add synced_from_client timestamp to each result
   - Call SupabaseService.uploadResults(results)
   - If successful:
     - Mark each result as synced in localStorage
     - Update syncedAt timestamp
     - Return success result with count
   - If error:
     - Return error result with message
     - Do NOT mark as synced
   - Use RxJS operators for transformation

4. Create method to download history from Supabase
   - Method: downloadHistory() returns Observable<TestResult[]>
   - Call SupabaseService.downloadHistory()
   - Merge with local results (avoid duplicates by client_generated_id)
   - Update localStorage with merged results
   - Return merged results

5. Create method to get last sync time
   - Method: getLastSyncTime() returns Date | null
   - Read from localStorage (SYNC_STATUS_KEY)
   - Parse timestamp
   - Return null if never synced

6. Create method to save last sync time
   - Private method: saveLastSyncTime(date: Date) returns void
   - Save timestamp to localStorage
   - Called automatically after successful sync

7. Create method to get sync statistics
   - Method: getSyncStats() returns SyncStats
   - Return object with:
     - totalResults: number (all results)
     - syncedResults: number (synced count)
     - unsyncedResults: number (unsynced count)
     - lastSyncTime: Date | null

8. Optional: Create method to clear synced data
   - Method: clearSyncedData() returns void
   - Remove results where synced = true from localStorage
   - Useful for keeping localStorage clean
   - Confirm with user before calling

**Key Concepts:**
- Synchronization is MANUAL only (user triggered)
- Always handle network errors gracefully
- Prevent duplicate uploads using client_generated_id
- Provide clear feedback to user about sync status
- Consider slow server wake-up time (5-15 seconds)

**Success Criteria:**
- Can upload unsynced results to Supabase
- Can download results from Supabase
- Duplicate prevention works
- Sync statistics are accurate
- Error handling provides useful feedback
- Last sync time is tracked correctly

---

#### **Step 2.5: Implement Auth Service (Optional)**

**Task:** Create authentication service for cross-device sync

**Instructions:**
1. Inject SupabaseService in constructor
2. Create BehaviorSubject for current user
   - Property: private currentUserSubject = new BehaviorSubject<User | null>(null)
   - Public observable: currentUser$ = this.currentUserSubject.asObservable()
3. Create method to check auth status on init
   - Method: initializeAuth() returns Promise<void>
   - Call Supabase getSession()
   - If session exists, emit user to BehaviorSubject
   - Set up auth state change listener
4. Create method to sign up
   - Method: signUp(email: string, password: string) returns Observable
   - Call Supabase signUp
   - Handle success/error
   - Emit user to BehaviorSubject on success
5. Create method to sign in
   - Method: signIn(email: string, password: string) returns Observable
   - Call Supabase signIn
   - Emit user to BehaviorSubject on success
6. Create method to sign out
   - Method: signOut() returns Observable
   - Call Supabase signOut
   - Emit null to BehaviorSubject
   - Clear user-specific data from localStorage
7. Create method to get current user ID
   - Method: getCurrentUserId() returns string | null
   - Return user ID from current user or null

**Key Concepts:**
- Authentication is OPTIONAL for this app
- Anonymous users can use full functionality
- Only needed for cross-device sync
- User state is reactive (BehaviorSubject)

**Success Criteria:**
- Can sign up new users
- Can sign in existing users
- Can sign out
- Auth state persists across page refresh
- Components can subscribe to currentUser$ for reactive updates

---

### **PHASE 3: FEATURE SERVICES IMPLEMENTATION**

#### **Step 3.1: Implement Config Service**

**Task:** Manage quiz configuration with localStorage persistence

**Instructions:**
1. Inject StorageService in constructor
2. Create BehaviorSubject for config state
   - Property: private configSubject = new BehaviorSubject<TestConfig>(default)
   - Public observable: config$ = this.configSubject.asObservable()
3. Create method to get default configuration
   - Method: private getDefaultConfig() returns TestConfig
   - Return object with sensible defaults:
     - tenses: ['präsens'] (start simple)
     - verbTypes: ['weak', 'strong'] (common types)
     - persons: ['ich', 'du', 'er'] (basic persons)
     - questionCount: 10 (reasonable default)
     - difficulty: 1-3 (beginner to intermediate)
4. Initialize service on construction
   - Load saved config from StorageService
   - If found, emit to BehaviorSubject
   - If not found, emit default config
5. Create method to get current configuration
   - Method: getConfig() returns TestConfig
   - Return current value from BehaviorSubject
6. Create method to update configuration
   - Method: updateConfig(updates: Partial<TestConfig>) returns void
   - Get current config from BehaviorSubject
   - Merge updates with current config
   - Validate merged config (ensure at least one option selected)
   - Save to localStorage via StorageService
   - Emit updated config to BehaviorSubject
7. Create method to reset to defaults
   - Method: resetToDefaults() returns void
   - Get default config
   - Save to localStorage
   - Emit to BehaviorSubject
8. Create method to validate configuration
   - Method: private validateConfig(config: TestConfig) returns boolean
   - Check that at least one tense is selected
   - Check that at least one verb type is selected
   - Check that at least one person is selected
   - Check that question count is in valid range (5-50)
   - Return true if valid, false otherwise
   - Log validation errors

**Key Concepts:**
- Configuration changes emit immediately to subscribers
- All components using config stay in sync
- Changes persist to localStorage automatically
- Validation prevents invalid quiz generation

**Success Criteria:**
- Config initializes with saved or default values
- Updates are saved and emitted correctly
- Components can subscribe to config$ for reactive updates
- Validation prevents invalid configurations
- Reset functionality works

---

#### **Step 3.2: Implement Verb Service**

**Task:** Query in-memory verb cache with various filters

**Instructions:**
1. Inject CacheService in constructor
2. Create method to get verbs by filter criteria
   - Method: getVerbs(filters?: VerbFilters) returns Verb[]
   - Call CacheService.getAllVerbs()
   - If no filters provided, return all verbs
   - If filters provided, apply filtering:
     - Filter by verb_type if specified
     - Filter by difficulty_level if specified
     - Filter by specific infinitives if specified
   - Return filtered array
   - All synchronous - no Observables needed
3. Create method to get verb by infinitive
   - Method: getVerbByInfinitive(infinitive: string) returns Verb | undefined
   - Call CacheService.getVerbByInfinitive(infinitive)
   - Return result (may be undefined)
4. Create method to search verbs
   - Method: searchVerbs(query: string) returns Verb[]
   - Call CacheService.searchVerbs(query)
   - Return results
5. Create method to get random verbs
   - Method: getRandomVerbs(count: number, filters?: VerbFilters) returns Verb[]
   - Get filtered verbs using getVerbs()
   - Implement Fisher-Yates shuffle algorithm
   - Take first 'count' verbs from shuffled array
   - Return selected verbs
6. Create helper method for Fisher-Yates shuffle
   - Method: private shuffle<T>(array: T[]) returns T[]
   - Create copy of array
   - Shuffle in place using Fisher-Yates algorithm
   - Return shuffled array
7. Optional: Create method to get verb conjugation
   - Method: getConjugation(verb: Verb, tense: string, person: string) returns string
   - Navigate verb.conjugations JSONB structure
   - Return specific conjugation
   - Handle missing tense/person gracefully

**Key Concepts:**
- All methods are synchronous (instant)
- No HTTP calls - everything from memory
- VerbService is a thin wrapper around CacheService
- Focused on quiz-specific queries

**Success Criteria:**
- Can retrieve verbs with various filters
- Random selection works correctly
- Shuffle algorithm produces different order each time
- All methods execute instantly (< 1ms)
- Handles edge cases (empty filters, not enough verbs)

---

#### **Step 3.3: Implement Quiz Service**

**Task:** Generate questions and score quizzes using pure computation

**Instructions:**
1. Inject VerbService in constructor
2. Create method to generate questions
   - Method: generateQuestions(config: TestConfig) returns Question[]
   - Call VerbService.getRandomVerbs() with config criteria
   - For each verb, generate one or more questions:
     - Randomly select tense from config.tenses
     - Randomly select person from config.persons
     - Create Question object with:
       - id: generate using uuid library
       - verb: the Verb object
       - tense: selected tense
       - person: selected person
       - correctAnswer: verb.conjugations[tense][person]
   - Shuffle questions array
   - Return array of Question objects
3. Create method to normalize answer strings
   - Method: private normalizeAnswer(answer: string) returns string
   - Trim whitespace
   - Convert to lowercase
   - Optional: Handle umlaut variations (ä→a, ö→o, ü→u)
   - Remove extra spaces
   - Return normalized string
4. Create method to validate single answer
   - Method: validateAnswer(question: Question, userAnswer: string) returns boolean
   - Normalize both correct answer and user answer
   - Compare normalized strings
   - Return true if match, false otherwise
5. Create method to score entire quiz
   - Method: scoreQuiz(questions: Question[], userAnswers: Map<string, string>) returns QuizResult
   - Initialize counters (correct count, total count)
   - Create empty array for detailed answers
   - Loop through each question:
     - Get user's answer from map (use question.id as key)
     - Validate answer using validateAnswer()
     - Increment correct count if valid
     - Create AnswerDetail object with all info
     - Add to detailed answers array
   - Calculate percentage: (correct / total) * 100
   - Create QuizResult object with:
     - id: generate using uuid library
     - timestamp: new Date()
     - score: correct count
     - totalQuestions: total count
     - percentage: calculated percentage
     - config: snapshot of TestConfig used
     - answers: detailed answers array
     - synced: false (not yet uploaded)
   - Return QuizResult object
6. Create helper method to pick random element
   - Method: private pickRandom<T>(array: T[]) returns T
   - Generate random index
   - Return element at that index
7. Optional: Create method to get hint for question
   - Method: getHint(question: Question) returns string
   - Return verb stem
   - Or return first letter of correct answer
   - Or return vowel change pattern

**Key Concepts:**
- Question generation is deterministic given same random seed
- Normalization handles user input variations
- Scoring is pure computation (no side effects)
- All data for reviewing answers is captured in QuizResult

**Success Criteria:**
- Generates correct number of questions
- Questions are randomized
- Validation handles case/whitespace differences
- Scoring is accurate
- QuizResult contains all necessary data
- All operations are synchronous and fast

---

#### **Step 3.4: Implement Results Service**

**Task:** Save quiz results to localStorage immediately after completion

**Instructions:**
1. Inject StorageService in constructor
2. Create Subject for result saved events
   - Property: private resultSavedSubject = new Subject<TestResult>()
   - Public observable: resultSaved$ = this.resultSavedSubject.asObservable()
3. Create method to save result
   - Method: saveResult(result: QuizResult) returns void
   - Call StorageService.saveTestResult(result)
   - Emit event to resultSavedSubject
   - No async operation needed - localStorage is synchronous
4. Create method to get result by ID
   - Method: getResultById(id: string) returns TestResult | undefined
   - Call StorageService.getTestResults()
   - Find result with matching id
   - Return result or undefined
5. Create method to mark result as synced
   - Method: markAsSynced(id: string) returns void
   - Create update object with synced: true, syncedAt: new Date()
   - Call StorageService.updateTestResult(id, updates)
6. Optional: Create method to get recent results
   - Method: getRecentResults(count: number) returns TestResult[]
   - Call StorageService.getTestResults()
   - Sort by timestamp descending (most recent first)
   - Take first 'count' results
   - Return array

**Key Concepts:**
- Results are saved immediately (no delay, no confirmation)
- Saving is synchronous (instant)
- Components can listen to resultSaved$ for notifications
- Results start with synced: false

**Success Criteria:**
- Results save successfully to localStorage
- Can retrieve result by ID
- Mark as synced updates correctly
- resultSaved$ emits on each save
- No async complexity needed

---

#### **Step 3.5: Implement History Service**

**Task:** Read and manage test history from localStorage

**Instructions:**
1. Inject StorageService in constructor
2. Create method to get full history
   - Method: getHistory() returns TestResult[]
   - Call StorageService.getTestResults()
   - Results are already sorted by timestamp descending
   - Return array
3. Create method to get unsynced results
   - Method: getUnsyncedResults() returns TestResult[]
   - Call getHistory()
   - Filter for results where synced = false
   - Return filtered array
4. Create method to get synced results
   - Method: getSyncedResults() returns TestResult[]
   - Call getHistory()
   - Filter for results where synced = true
   - Return filtered array
5. Create method to delete result
   - Method: deleteResult(id: string) returns void
   - Call StorageService.deleteTestResult(id)
   - Consider emitting event if other components need to know
6. Create method to calculate statistics
   - Method: getStatistics() returns Statistics
   - Call getHistory()
   - Calculate:
     - totalTests: array length
     - averageScore: mean of all percentages
     - bestScore: max percentage
     - worstScore: min percentage
     - unsyncedCount: count where synced = false
     - totalCorrect: sum of all scores
     - totalQuestions: sum of all total_questions
   - Return Statistics object
7. Create method to filter history
   - Method: filterHistory(filters: HistoryFilters) returns TestResult[]
   - Get all history
   - Apply filters:
     - Date range (startDate, endDate)
     - Score range (minScore, maxScore)
     - Sync status (synced, unsynced, all)
     - Tense used (filter by config.tenses)
   - Return filtered array
8. Create method to export history
   - Method: exportHistory() returns string
   - Call StorageService.exportToJSON()
   - Return JSON string
9. Create method to import history
   - Method: importHistory(jsonString: string) returns void
   - Call StorageService.importFromJSON(jsonString)
   - Validate imported data structure
   - Handle errors

**Key Concepts:**
- History is always read from localStorage (never Supabase directly)
- All operations are synchronous
- Statistics are calculated on-demand (no caching needed)
- Filtering is client-side (very fast with small datasets)

**Success Criteria:**
- Can retrieve full history
- Can filter by various criteria
- Statistics calculations are correct
- Can delete results
- Export/import functionality works
- All operations are instant

---

### **PHASE 4: ROUTING AND NAVIGATION**

#### **Step 4.1: Configure App Routing**

**Task:** Set up lazy-loaded routes with proper guards

**Instructions:**
1. Open or create app-routing.module.ts file
2. Define route configuration array with following paths:
   - Root path ('/'):
     - Redirect to '/config'
     - Use redirectTo: '/config'
     - pathMatch: 'full'
   
   - Config path ('/config'):
     - Lazy load ConfigurationModule
     - Use loadChildren syntax
     - No guards needed
   
   - Quiz path ('/quiz'):
     - Lazy load QuizModule
     - Add DataLoadedGuard to ensure verbs loaded
     - Add ConfigValidGuard to ensure valid configuration exists
   
   - Results path ('/results'):
     - Lazy load ResultsModule
     - Add ResultDataGuard to ensure quiz result exists
     - This prevents direct navigation to results without quiz
   
   - History path ('/history'):
     - Lazy load HistoryModule
     - No guards needed
   
   - Optional login path ('/login'):
     - Load AuthComponent (if implementing authentication)
   
   - Wildcard path ('**'):
     - Load NotFoundComponent or redirect to '/config'

3. Configure route options
   - Enable preloading strategy if desired
   - Set up scroll position restoration
   - Configure route reuse strategy if needed

**Key Concepts:**
- Lazy loading improves initial load time
- Guards prevent accessing routes with missing data
- All feature modules are separate bundles

**Success Criteria:**
- All routes are defined correctly
- Navigation between routes works
- Guards prevent invalid navigation
- Lazy loading reduces initial bundle size
- Browser back/forward buttons work correctly

---

#### **Step 4.2: Implement Route Guards**

**Task:** Create guard services to protect routes

**Instructions for DataLoadedGuard:**
1. Create guard using Angular CLI (implement CanActivate interface)
2. Inject CacheService and Router
3. Implement canActivate method:
   - Check CacheService.isCacheReady()
   - If true, return true (allow navigation)
   - If false, redirect to a loading page or show error
   - Return false to block navigation
4. Alternative: Return Observable that resolves when data loaded
   - Wait for cache initialization
   - Then allow navigation

**Instructions for ConfigValidGuard:**
1. Create guard using Angular CLI
2. Inject ConfigService and Router
3. Implement canActivate method:
   - Get current config from ConfigService
   - Validate that:
     - At least one tense is selected
     - At least one verb type is selected
     - At least one person is selected
     - Question count is valid
   - If valid, return true
   - If invalid, redirect to '/config' with error message
   - Return false to block navigation

**Instructions for ResultDataGuard:**
1. Create guard using Angular CLI
2. Check if navigation state contains quiz result data
3. If result data exists, return true
4. If no result data, redirect to '/config'
5. This prevents users from directly navigating to /results URL

**Key Concepts:**
- Guards run before route activation
- Can redirect or block navigation
- Provide user-friendly error messages
- Essential for data integrity

**Success Criteria:**
- Cannot access /quiz without loaded verbs
- Cannot access /quiz without valid configuration
- Cannot access /results without quiz completion
- Guards redirect appropriately when blocking

---

#### **Step 4.3: Implement Navigation Component**

**Task:** Create persistent navigation header

**Instructions:**
1. Generate NavigationHeaderComponent in shared module
2. Design navigation bar with Tailwind CSS:
   - Fixed position at top of page
   - Background color (white or primary color)
   - Shadow for depth
   - Responsive layout (hamburger menu on mobile)
3. Add navigation links:
   - "Home" or "Configure Test" → /config
   - "History" → /history
   - Optional: "Login" → /login (if implementing auth)
4. Inject Router for active route highlighting
   - Use routerLinkActive directive
   - Highlight current page
5. Add sync status indicator
   - Show unsynced count badge
   - Use color coding (yellow for pending, green for synced)
   - Click to open sync modal
6. Optional: Add user info section
   - Show logged-in user email
   - Logout button
   - Only visible if authenticated
7. Make responsive
   - Desktop: Horizontal nav bar
   - Mobile: Hamburger menu with dropdown
   - Use Tailwind responsive prefixes (md:, lg:)

**Key Concepts:**
- Navigation is always visible (fixed position)
- Active route is visually indicated
- Sync status is always accessible
- Responsive design for all screen sizes

**Success Criteria:**
- Navigation works on all pages
- Active route highlighting works
- Responsive layout works on mobile and desktop
- Sync status displays correctly
- Looks good with Tailwind styling

---

### **PHASE 5: CONFIGURATION FEATURE**

#### **Step 5.1: Create Configuration Module**

**Task:** Set up configuration feature module with components

**Instructions:**
1. Generate configuration module using Angular CLI
2. Create components subdirectory
3. Generate ConfigFormComponent (smart component)
4. Generate VerbSelectorComponent (dumb component, optional)
5. Generate StatisticsDisplayComponent (dumb component)
6. Import necessary Angular modules:
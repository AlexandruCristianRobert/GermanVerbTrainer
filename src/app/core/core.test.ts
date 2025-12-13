// Verify all exports are accessible
import {
  // Models
  Verb,
  TestConfig,
  Question,
  TestResult,
  Statistics,
  SyncResult,
  // Services
  SupabaseService,
  CacheService,
  StorageService,
  SyncService,
  AuthService,
  // Guards
  dataLoadedGuard,
  // Interceptors
  errorInterceptor,
} from './index';

console.log('✅ All core exports are accessible');

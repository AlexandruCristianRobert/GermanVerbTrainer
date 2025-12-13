export interface Environment {
  production: boolean;
  supabaseUrl: string;
  supabaseAnonKey: string;
  apiTimeout: number;
  enableDebugLogging: boolean;
  appVersion: string;
  verbCacheTimeout: number;
}

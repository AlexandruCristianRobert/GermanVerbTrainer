// TEMPLATE FILE - Copy this to environment.ts and environment.production.ts
// Then fill in your actual Supabase credentials from your Supabase dashboard

export const environment = {
  production: false, // Set to true in environment.production.ts

  // Get these from: https://app.supabase.com/project/YOUR_PROJECT/settings/api
  // IMPORTANT: Use the NEW "Publishable and secret API keys" tab, NOT the legacy tab
  supabaseUrl: 'https://YOUR_PROJECT_REF.supabase.co',
  supabaseAnonKey: 'sb_publishable_YOUR_KEY_HERE', // From "Publishable key" field

  // API Configuration
  apiTimeout: 30000, // 30 seconds - handles sleeping server wake-up time

  // App Configuration
  enableDebugLogging: true, // Set to false in production
  appVersion: '1.0.0',
  verbCacheTimeout: 86400000, // 24 hours in milliseconds
};

import { Environment } from './environment.types';

export const environment: Environment = {
  production: true,
  supabaseUrl: 'https://zbebdpbdtsyoyilzhbbc.supabase.co', // Same URL
  supabaseAnonKey: 'sb_publishable_oeaTOi8259pBpm0cigaZeQ_Onc43lES', // Same publishable key
  apiTimeout: 30000,
  enableDebugLogging: false,
  appVersion: '1.0.0',
  verbCacheTimeout: 86400000,
};

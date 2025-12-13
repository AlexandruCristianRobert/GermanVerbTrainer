import { createClient } from '@supabase/supabase-js';
import { environment } from '../environments/environment';

// Test Supabase connection
const supabase = createClient(
  environment.supabaseUrl,
  environment.supabaseAnonKey
);

console.log('🚀 Testing Supabase connection...');

// Test fetching verbs
supabase
  .from('verbs')
  .select('infinitive, english_translation, verb_type')
  .limit(5)
  .then(({ data, error }) => {
    if (error) {
      console.error('❌ Supabase connection failed:', error.message);
    } else {
      console.log('✅ Supabase connected! Found verbs:', data);
    }
  });

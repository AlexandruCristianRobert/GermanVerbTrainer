// Test imports - delete this file after verification
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

// This should compile without errors
const testUuid = uuidv4();
console.log('UUID test:', testUuid);

// This should also compile without errors
const testClient = createClient('test-url', 'test-key');
console.log('Supabase client created:', !!testClient);

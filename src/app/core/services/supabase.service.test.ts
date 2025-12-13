import { SupabaseService } from './supabase.service';

// This file is for manual testing in the browser console
// Run: npm start, then open browser console

export function testSupabaseService() {
  console.log('🧪 Testing Supabase Service...\n');

  // This would normally be injected, but for testing we create manually
  const service = new SupabaseService();

  console.log('Test 1: Testing connection...');
  service.testConnection().subscribe({
    next: (connected) => {
      console.log(
        connected ? '✅ Connection test passed' : '❌ Connection test failed'
      );
    },
    error: (err) => console.error('❌ Connection test error:', err),
  });

  console.log('\nTest 2: Getting verb count...');
  service.getVerbCount().subscribe({
    next: (count) => {
      console.log(`✅ Verb count: ${count}`);
    },
    error: (err) => console.error('❌ Verb count error:', err),
  });

  console.log('\nTest 3: Loading all verbs...');
  service.loadAllVerbs().subscribe({
    next: (verbs) => {
      console.log(`✅ Loaded ${verbs.length} verbs`);
      if (verbs.length > 0) {
        console.log('First verb:', verbs[0]);
      }
    },
    error: (err) => console.error('❌ Load verbs error:', err),
  });

  console.log('\n✅ All tests initiated. Check console for results.\n');
}

// Expose to window for browser console access
(window as any).testSupabaseService = testSupabaseService;

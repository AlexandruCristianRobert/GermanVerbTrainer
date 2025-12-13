import { CacheService } from './cache.service';

// Manual testing in browser console
export function testCacheService(cacheService: CacheService) {
  console.log('🧪 Testing Cache Service...\n');

  console.log('Test 1: Check if cache is ready');
  console.log('Is Ready:', cacheService.isCacheReady());

  console.log('\nTest 2: Get all verbs');
  const allVerbs = cacheService.getAllVerbs();
  console.log(`Total verbs: ${allVerbs.length}`);
  if (allVerbs.length > 0) {
    console.log('First verb:', allVerbs[0]);
  }

  console.log('\nTest 3: Get verb by infinitive');
  const verb = cacheService.getVerbByInfinitive('sein');
  console.log('sein:', verb);

  console.log('\nTest 4: Filter by verb type');
  const strongVerbs = cacheService.filterVerbs({ verbTypes: ['strong'] });
  console.log(`Strong verbs: ${strongVerbs.length}`);

  console.log('\nTest 5: Search verbs');
  const searchResults = cacheService.searchVerbs('go');
  console.log(`Search "go": ${searchResults.length} results`);

  console.log('\nTest 6: Get random verbs');
  const randomVerbs = cacheService.getRandomVerbs(3);
  console.log(
    'Random verbs:',
    randomVerbs.map((v) => v.infinitive)
  );

  console.log('\nTest 7: Group by type');
  const grouped = cacheService.getVerbsByType();
  console.log(
    'Verbs by type:',
    Object.keys(grouped).map((type) => `${type}: ${grouped[type].length}`)
  );

  console.log('\n✅ All cache tests completed!\n');
}

// Expose to window for browser console
(window as any).testCacheService = testCacheService;

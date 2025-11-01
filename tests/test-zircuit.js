/**
 * Zircuit Documentation Test Suite
 *
 * Real-world testing against https://docs.zircuit.com/
 */

import {
  gitbookGetNavigation,
  gitbookScrapePage,
  gitbookScrapeMultiple,
  gitbookScrapeAll
} from '../dist/tools.js';

const ZIRCUIT_BASE_URL = 'https://docs.zircuit.com/';
const TEST_ACCESS_TOKEN = 'none'; // Public docs, no auth needed

console.log('============================================================');
console.log('  ZEEKEE GITBOOK MCP - ZIRCUIT DOCUMENTATION TESTS');
console.log('============================================================\n');

let testsPassed = 0;
let testsFailed = 0;

async function runTest(name, fn) {
  try {
    console.log(`\n🧪 Test: ${name}`);
    console.log('─'.repeat(60));
    const startTime = Date.now();
    await fn();
    const duration = Date.now() - startTime;
    console.log(`✅ PASSED (${duration}ms)`);
    testsPassed++;
  } catch (error) {
    console.error(`❌ FAILED: ${error.message}`);
    console.error(error);
    testsFailed++;
  }
}

// Test 1: Get Navigation Structure
await runTest('Get Navigation Structure', async () => {
  const result = await gitbookGetNavigation({
    accessToken: TEST_ACCESS_TOKEN,
    url: ZIRCUIT_BASE_URL
  });

  if (!result.success) {
    throw new Error(`Navigation extraction failed: ${result.error}`);
  }

  console.log(`   Base URL: ${result.data.baseUrl}`);
  console.log(`   Total pages discovered: ${result.data.totalPages}`);
  console.log(`   Navigation items: ${result.data.navigation.length}`);

  if (result.data.navigation.length > 0) {
    console.log(`\n   Sample navigation items:`);
    result.data.navigation.slice(0, 5).forEach((item, i) => {
      console.log(`   ${i + 1}. ${item.title} ${item.href ? `(${item.type})` : '(group)'}`);
      if (item.href) {
        console.log(`      URL: ${item.href}`);
      }
    });
  }

  if (result.data.totalPages === 0) {
    throw new Error('No pages found in navigation');
  }
});

// Test 2: Scrape Single Page (Homepage)
await runTest('Scrape Single Page (Homepage)', async () => {
  const result = await gitbookScrapePage({
    accessToken: TEST_ACCESS_TOKEN,
    url: ZIRCUIT_BASE_URL,
    options: {
      includeMetadata: true,
      includeLinks: true
    }
  });

  if (!result.success) {
    throw new Error(`Page scraping failed: ${result.error}`);
  }

  console.log(`   URL: ${result.data.url}`);
  console.log(`   Title: ${result.data.metadata.title}`);
  console.log(`   Content length: ${result.data.markdown.length} characters`);
  console.log(`   Links found: ${result.data.linkCount || 0}`);

  console.log(`\n   Content preview (first 300 chars):`);
  console.log(`   ${result.data.markdown.substring(0, 300)}...`);

  if (result.data.markdown.length === 0) {
    throw new Error('No content extracted from page');
  }
});

// Test 3: Scrape Multiple Specific Pages
await runTest('Scrape Multiple Pages', async () => {
  const urls = [
    ZIRCUIT_BASE_URL,
    `${ZIRCUIT_BASE_URL}readme/sls`,
    `${ZIRCUIT_BASE_URL}build/start`
  ];

  const result = await gitbookScrapeMultiple({
    accessToken: TEST_ACCESS_TOKEN,
    urls: urls,
    options: {
      includeMetadata: true,
      concurrency: 2
    }
  });

  if (!result.success) {
    throw new Error(`Multiple page scraping failed: ${result.error}`);
  }

  console.log(`   Requested URLs: ${result.data.metadata.requestedUrls}`);
  console.log(`   Successful scrapes: ${result.data.metadata.successfulScrapes}`);
  console.log(`   Total pages: ${result.data.totalPages}`);
  console.log(`   Total characters: ${result.data.totalCharacters}`);

  if (result.data.pages.length > 0) {
    console.log(`\n   Scraped pages:`);
    result.data.pages.forEach((page, i) => {
      console.log(`   ${i + 1}. ${page.metadata.title} (${page.markdown.length} chars)`);
    });
  }

  if (result.data.totalPages === 0) {
    throw new Error('No pages scraped successfully');
  }
});

// Test 4: Scrape All (Limited)
await runTest('Scrape All Pages (Limited to 10)', async () => {
  const result = await gitbookScrapeAll({
    accessToken: TEST_ACCESS_TOKEN,
    url: ZIRCUIT_BASE_URL,
    options: {
      maxPages: 10,
      includeMetadata: true,
      concurrency: 2
    }
  });

  if (!result.success) {
    throw new Error(`Scrape all failed: ${result.error}`);
  }

  console.log(`   Base URL: ${result.data.baseUrl}`);
  console.log(`   Discovered pages: ${result.data.metadata.discoveredPages}`);
  console.log(`   Scraped pages: ${result.data.metadata.scrapedPages}`);
  console.log(`   Limit applied: ${result.data.metadata.limitApplied ? 'Yes' : 'No'}`);
  console.log(`   Total characters: ${result.data.totalCharacters}`);

  if (result.data.pages.length > 0) {
    console.log(`\n   First 5 scraped pages:`);
    result.data.pages.slice(0, 5).forEach((page, i) => {
      console.log(`   ${i + 1}. ${page.metadata.title}`);
      console.log(`      URL: ${page.url}`);
      console.log(`      Length: ${page.markdown.length} chars`);
    });
  }

  if (result.data.totalPages === 0) {
    throw new Error('No pages scraped');
  }
});

// Test 5: Validation - Missing accessToken
await runTest('Validation - Missing accessToken', async () => {
  const result = await gitbookScrapePage({
    url: ZIRCUIT_BASE_URL
  });

  if (result.success) {
    throw new Error('Should have failed validation for missing accessToken');
  }

  console.log(`   Error message: ${result.error}`);

  if (!result.error || !result.error.includes('Required')) {
    throw new Error('Error message should indicate required field');
  }
});

// Test 6: Error Handling - Invalid URL
await runTest('Error Handling - Invalid URL', async () => {
  const result = await gitbookScrapePage({
    accessToken: TEST_ACCESS_TOKEN,
    url: 'https://thisdoesnotexist.example.com/nonexistent'
  });

  if (result.success) {
    throw new Error('Should have failed for invalid URL');
  }

  console.log(`   Error message: ${result.error}`);

  if (!result.error) {
    throw new Error('Should have error message');
  }
});

// Summary
console.log('\n');
console.log('============================================================');
console.log('  TEST SUMMARY');
console.log('============================================================\n');
console.log(`Total Tests:    ${testsPassed + testsFailed}`);
console.log(`✅ Passed:      ${testsPassed}`);
console.log(`❌ Failed:      ${testsFailed}\n`);

if (testsFailed === 0) {
  console.log('🎉 All tests passed! ZeekeeGitbook MCP Server is working correctly.\n');
  process.exit(0);
} else {
  console.log('⚠️  Some tests failed. Please review the errors above.\n');
  process.exit(1);
}

/**
 * Analyze Zircuit GitBook structure to find all pages
 */

import axios from 'axios';
import * as cheerio from 'cheerio';

async function analyzeStructure() {
  console.log('=== Analyzing Zircuit GitBook Structure ===\n');

  const response = await axios.get('https://docs.zircuit.com/');
  const html = response.data;
  const $ = cheerio.load(html);

  // Strategy 1: Look for JSON-LD or structured data
  console.log('1. Checking for structured data...');
  $('script[type="application/ld+json"]').each((i, el) => {
    try {
      const data = JSON.parse($(el).html());
      console.log('   Found JSON-LD:', Object.keys(data));
    } catch (e) {
      // ignore
    }
  });

  // Strategy 2: Look for GitBook embedded data in scripts
  console.log('\n2. Checking for GitBook data in scripts...');
  let foundGitbookData = false;
  $('script').each((i, el) => {
    const content = $(el).html();
    if (content && content.includes('window.__GITBOOK__')) {
      console.log('   ✓ Found window.__GITBOOK__ in script', i);
      foundGitbookData = true;

      // Try to extract it
      const match = content.match(/window\.__GITBOOK__\s*=\s*(\{[\s\S]*?\});/);
      if (match) {
        try {
          const data = JSON.parse(match[1]);
          console.log('   Parsed GitBook data keys:', Object.keys(data));
          if (data.page) {
            console.log('   Page data keys:', Object.keys(data.page));
          }
          if (data.config) {
            console.log('   Config keys:', Object.keys(data.config));
          }
        } catch (e) {
          console.log('   Could not parse data:', e.message);
        }
      }
    }
  });

  if (!foundGitbookData) {
    console.log('   ✗ No window.__GITBOOK__ found');
  }

  // Strategy 3: Check for Next.js data
  console.log('\n3. Checking for Next.js __NEXT_DATA__...');
  $('script#__NEXT_DATA__').each((i, el) => {
    try {
      const data = JSON.parse($(el).html());
      console.log('   ✓ Found Next.js data');
      console.log('   Keys:', Object.keys(data));

      if (data.props && data.props.pageProps) {
        console.log('   PageProps keys:', Object.keys(data.props.pageProps));

        // Look for pages/navigation
        const pageProps = data.props.pageProps;
        if (pageProps.pages) {
          console.log('   ✓ Found pages array:', pageProps.pages.length, 'pages');
        }
        if (pageProps.navigation) {
          console.log('   ✓ Found navigation');
        }
        if (pageProps.content) {
          console.log('   ✓ Found content');
        }
      }
    } catch (e) {
      console.log('   Could not parse:', e.message);
    }
  });

  // Strategy 4: Look for sitemap or TOC
  console.log('\n4. Checking for sitemap/TOC links...');
  const sitemapLinks = [
    '/sitemap.xml',
    '/sitemap.json',
    '/_sitemap.xml',
    '/api/sitemap',
  ];

  for (const link of sitemapLinks) {
    try {
      const url = 'https://docs.zircuit.com' + link;
      const res = await axios.get(url, { timeout: 5000, validateStatus: () => true });
      if (res.status === 200) {
        console.log(`   ✓ Found: ${link} (${res.status})`);
        if (res.headers['content-type']?.includes('json')) {
          console.log('   Data:', Object.keys(res.data));
        }
      } else {
        console.log(`   ✗ ${link} (${res.status})`);
      }
    } catch (e) {
      console.log(`   ✗ ${link} (error)`);
    }
  }

  // Strategy 5: Find all unique internal links
  console.log('\n5. Extracting all internal links...');
  const allLinks = new Set();
  $('a[href^="/"]').each((i, el) => {
    const href = $(el).attr('href');
    if (href && !href.includes('#')) {
      allLinks.add(href);
    }
  });
  console.log(`   Found ${allLinks.size} unique internal links`);

  // Group by section
  const sections = {};
  allLinks.forEach(link => {
    const parts = link.split('/');
    const section = parts[1] || 'root';
    if (!sections[section]) sections[section] = [];
    sections[section].push(link);
  });

  console.log('\n   Links by section:');
  Object.entries(sections).forEach(([section, links]) => {
    console.log(`   - ${section}: ${links.length} pages`);
  });

  // Strategy 6: Try to fetch a nested page to see if we can discover more
  console.log('\n6. Checking a nested page for more links...');
  try {
    const nestedPage = await axios.get('https://docs.zircuit.com/infra/relayers');
    const $nested = cheerio.load(nestedPage.data);
    const nestedLinks = new Set();
    $nested('a[href^="/"]').each((i, el) => {
      const href = $nested(el).attr('href');
      if (href && !href.includes('#')) {
        nestedLinks.add(href);
      }
    });
    console.log(`   Found ${nestedLinks.size} links from /infra/relayers`);

    // Find links we didn't have before
    const newLinks = Array.from(nestedLinks).filter(l => !allLinks.has(l));
    if (newLinks.length > 0) {
      console.log(`   ✓ Discovered ${newLinks.length} NEW pages:`);
      newLinks.slice(0, 10).forEach(link => {
        console.log(`      - ${link}`);
      });
    }
  } catch (e) {
    console.log('   Error fetching nested page');
  }

  console.log('\n=== Analysis Complete ===');
}

analyzeStructure().catch(console.error);

import { extractNavigation } from '../dist/scraper.js';

console.log('Testing improved navigation extraction with sitemap.xml support...\n');

const result = await extractNavigation('https://docs.zircuit.com/');
console.log('✅ Total pages found:', result.length);
console.log('');

console.log('First 10 pages:');
result.slice(0, 10).forEach((item, i) => {
  console.log(`${i + 1}. ${item.title}`);
  console.log(`   ${item.href}`);
});

console.log(`\n... and ${result.length - 10} more pages\n`);

// Show breakdown by section
const sections = {};
result.forEach(item => {
  const url = new URL(item.href);
  const parts = url.pathname.split('/').filter(p => p);
  const section = parts[0] || 'root';
  if (!sections[section]) sections[section] = 0;
  sections[section]++;
});

console.log('Pages by section:');
Object.entries(sections).sort((a, b) => b[1] - a[1]).forEach(([section, count]) => {
  console.log(`  ${section}: ${count} pages`);
});

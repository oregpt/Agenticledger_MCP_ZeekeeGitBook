# ZeekeeGitbookMCP - Execution Guide

## Quick Re-Extraction Command

**When you want to re-scrape the Zircuit documentation, just say:**

> "Run the GitBook scraper to extract all Zircuit docs"

Or simply:

> "Run GitBook extraction"

---

## What This Does

This will scrape ALL documentation pages from https://docs.zircuit.com/ and save them as individual markdown files in a timestamped folder.

---

## Manual Execution Steps

### 1. Navigate to Project Directory

```bash
cd "C:\Users\oreph\Documents\AgenticLedger\Custom MCP SERVERS\ZeekeeGitbookMCP"
```

### 2. Ensure Dependencies Are Installed

```bash
npm install
```

### 3. Build the Project

```bash
npm run build
```

### 4. Run the Scraper

```bash
node tests/scrape-and-save-zircuit.js
```

---

## Output

The scraper will:

1. **Discover** all pages from https://docs.zircuit.com/ (via sitemap.xml)
2. **Scrape** each page to clean markdown
3. **Save** to folder: `zircuit-docs-scraped-YYYYMMDD-HHMMSS/`
4. **Create** an `INDEX.md` with links to all pages

### Example Output Structure

```
zircuit-docs-scraped-20251101-143022/
├── INDEX.md
├── index.md                                    # Homepage
├── research.md                                 # Research overview
├── build_start.md                              # Quick Start
├── build_contracts_deploying-contracts.md      # Deploy contracts
├── infra_relayers.md                           # Relayers
├── zircuit-ecosystem_overview.md               # Ecosystem
└── ... (all 52 pages)
```

### Each Markdown File Contains

```markdown
---
url: https://docs.zircuit.com/build/start
title: Quick Start | Zircuit
scraped: 2025-11-01T14:30:22.000Z
---

# Quick Start | Zircuit

**Source:** https://docs.zircuit.com/build/start

---

[Clean markdown content of the documentation page...]
```

---

## Configuration Options

### Scrape All Pages (Default)

```javascript
const result = await gitbookScrapeAll({
  accessToken: 'none',
  url: 'https://docs.zircuit.com/',
  options: {
    maxPages: 100,        // Maximum pages to scrape
    includeMetadata: true,
    concurrency: 3        // Parallel scraping (3-5 recommended)
  }
});
```

### Scrape Specific Section Only

Modify `tests/scrape-and-save-zircuit.js`:

```javascript
// Only scrape "Build" section
const result = await gitbookScrapeMultiple({
  accessToken: 'none',
  urls: [
    'https://docs.zircuit.com/build/start',
    'https://docs.zircuit.com/build/contracts/deploying-contracts',
    'https://docs.zircuit.com/build/contracts/verifying-contracts'
  ]
});
```

### Faster Scraping (More Concurrency)

```javascript
options: {
  concurrency: 5  // Scrape 5 pages simultaneously
}
```

---

## Performance Expectations

Based on testing with Zircuit documentation:

- **Discovery:** ~371ms to find all 52 pages (via sitemap.xml)
- **Single Page:** ~213ms per page
- **Batch (3 pages):** ~1.4 seconds
- **Full Docs (52 pages):** ~22 seconds with concurrency: 3

### Speed Comparison

| Operation | Time | Speed |
|-----------|------|-------|
| Find all pages | 0.4s | ⚡ Very Fast |
| Scrape 1 page | 0.2s | ⚡ Fast |
| Scrape 52 pages | 22s | ⚡ Fast |
| **Average** | **~0.4s/page** | ⚡ **Excellent** |

### Optimization Tips

1. **Increase concurrency** to 5 for faster scraping: `concurrency: 5`
2. **Scrape specific sections** only if you don't need all docs
3. **Cache results** - docs don't change frequently

---

## Troubleshooting

### Error: "No pages found"

- Check that the documentation URL is correct
- Verify the site is publicly accessible
- Check if sitemap.xml exists: https://docs.zircuit.com/sitemap.xml

### Error: "Failed to scrape page"

- Network issue - retry the command
- Page structure may have changed
- Check the specific page URL manually

### Slow Performance

- Reduce concurrency: `concurrency: 2`
- Check internet connection speed
- Some pages may be slower than others

---

## What Gets Extracted

### ✅ Content Included

- Page title
- Full page content (converted to markdown)
- Headings hierarchy (H1-H6)
- Code blocks with syntax
- Lists (ordered and unordered)
- Tables
- Links (preserved in markdown)
- Blockquotes
- Images (as markdown image syntax)

### ❌ Not Included

- Navigation sidebar
- Header/footer
- Search functionality
- Interactive elements
- JavaScript functionality
- Comments/discussions

---

## Re-Running the Scraper

### To Get Latest Documentation

Simply run the scraper again. It will create a new timestamped folder with the latest content.

```bash
cd "C:\Users\oreph\Documents\AgenticLedger\Custom MCP SERVERS\ZeekeeGitbookMCP"
npm run build
node tests/scrape-and-save-zircuit.js
```

### To Track Documentation Changes

Keep multiple scrape folders:

```
zircuit-docs-scraped-20251101-120000/  # First run
zircuit-docs-scraped-20251115-120000/  # Two weeks later
zircuit-docs-scraped-20251201-120000/  # One month later
```

Use `diff` to compare:

```bash
diff -r zircuit-docs-scraped-20251101-120000/ zircuit-docs-scraped-20251115-120000/
```

---

## Using Scraped Content

### Search Across All Documentation

```bash
# Search for keyword in all markdown files
grep -r "smart contract" zircuit-docs-scraped-*/

# Count occurrences
grep -r "zkEVM" zircuit-docs-scraped-*/ | wc -l
```

### Convert to Other Formats

```bash
# Convert to PDF (using pandoc)
pandoc index.md -o zircuit-docs.pdf

# Combine all docs into one file
cat zircuit-docs-scraped-*/*.md > zircuit-complete.md
```

### Import to Documentation Tools

The markdown files are compatible with:
- Obsidian
- Notion (import .md files)
- GitBook (re-import)
- Docusaurus
- MkDocs
- VuePress
- Docsify
- Jekyll/Hugo static sites

### Index for AI/LLM

The scraped markdown is perfect for:
- RAG (Retrieval Augmented Generation) systems
- Vector databases (embeddings)
- AI chatbots trained on documentation
- Semantic search

---

## Target Sites

**Primary Target:** Zircuit Documentation
- URL: https://docs.zircuit.com/
- Type: GitBook
- Pages: 52 (as of Nov 2025)
- Update Frequency: Regular (mainnet updates)

**Should Work With:**
- Any GitBook-powered documentation site
- Sites with sitemap.xml
- Public documentation (no auth required)

**Examples of Compatible Sites:**
- https://docs.zircuit.com/ ✅ (tested)
- https://docs.uniswap.org/ (GitBook)
- https://docs.aave.com/ (GitBook)
- https://docs.optimism.io/ (GitBook)

**May Not Work With:**
- Private/authenticated GitBooks
- Non-GitBook documentation platforms
- Sites without sitemap.xml (will fallback to HTML parsing)

---

## Comparison: GitBook vs Webflow Scraper

| Feature | GitBook Scraper | Webflow Scraper |
|---------|----------------|-----------------|
| **Speed** | ⚡ 0.4s/page | 🐌 10s/page |
| **Method** | HTTP requests | Headless browser |
| **Use Case** | Documentation | Blog posts |
| **Zircuit Docs** | ✅ 52 pages (22s) | N/A |
| **Zircuit Blog** | N/A | ✅ 47 posts (7min) |
| **Best For** | Static content | Dynamic content |

---

## Command Summary

```bash
# Full workflow
cd "C:\Users\oreph\Documents\AgenticLedger\Custom MCP SERVERS\ZeekeeGitbookMCP"
npm install
npm run build
node tests/scrape-and-save-zircuit.js

# Quick re-run (if already installed)
cd "C:\Users\oreph\Documents\AgenticLedger\Custom MCP SERVERS\ZeekeeGitbookMCP"
npm run build && node tests/scrape-and-save-zircuit.js

# Test only (no scraping)
npm run test:zircuit
```

---

## Advanced Usage

### Scrape Multiple GitBook Sites

Create a new script:

```javascript
import { gitbookScrapeAll } from '../dist/tools.js';

const sites = [
  'https://docs.zircuit.com/',
  'https://docs.example1.com/',
  'https://docs.example2.com/'
];

for (const site of sites) {
  const result = await gitbookScrapeAll({
    accessToken: 'none',
    url: site
  });
  // Save results...
}
```

### Monitor Documentation Changes

Set up a cron job to scrape daily:

```bash
# crontab -e
0 2 * * * cd /path/to/ZeekeeGitbookMCP && npm run build && node tests/scrape-and-save-zircuit.js
```

### Search Before Scraping

```javascript
// First, get navigation to see what's available
const nav = await gitbookGetNavigation({
  accessToken: 'none',
  url: 'https://docs.zircuit.com/'
});

console.log('Available pages:', nav.data.navigation.length);

// Then scrape specific pages
const pages = await gitbookScrapeMultiple({
  accessToken: 'none',
  urls: nav.data.navigation.slice(0, 10).map(n => n.href)
});
```

---

## Support

**Issues?** Check:
1. `README.md` - Full documentation
2. `tests/test-zircuit.js` - Example usage
3. GitHub: https://github.com/oregpt/Agenticledger_MCP_ZeekeeGitBook

---

**Last Updated:** November 1, 2025
**Target:** Zircuit Documentation (https://docs.zircuit.com/)
**Status:** Production Ready
**Performance:** ⚡ ~0.4s per page (52 pages in 22s)

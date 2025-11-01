/**
 * Zod Validation Schemas for ZeekeeGitbook MCP Server
 *
 * These schemas define and validate inputs for all GitBook scraping tools.
 * All tools require accessToken parameter (no authentication needed, set to "none" for public docs).
 */

import { z } from 'zod';

/**
 * Tool 1: gitbook_get_navigation
 * Extracts the complete navigation structure from a GitBook site
 */
export const GitbookGetNavigationSchema = z.object({
  accessToken: z.string()
    .describe('Authentication token - use "none" for public GitBook documentation sites. AgenticLedger platform will provide this value.'),
  url: z.string().url()
    .describe('Base URL of the GitBook documentation site (e.g., "https://docs.zircuit.com")'),
  options: z.object({
    timeout: z.number().optional()
      .describe('Request timeout in milliseconds (default: 30000)'),
    userAgent: z.string().optional()
      .describe('Custom User-Agent header for requests (default: "AgenticLedger-Bot/1.0")')
  }).optional()
    .describe('Optional configuration for the navigation extraction request')
});

export type GitbookGetNavigationInput = z.infer<typeof GitbookGetNavigationSchema>;

/**
 * Tool 2: gitbook_scrape_page
 * Scrapes a single page from a GitBook site and returns clean markdown
 */
export const GitbookScrapePageSchema = z.object({
  accessToken: z.string()
    .describe('Authentication token - use "none" for public GitBook documentation sites. AgenticLedger platform will provide this value.'),
  url: z.string().url()
    .describe('Full URL of the specific page to scrape (e.g., "https://docs.zircuit.com/build/start")'),
  options: z.object({
    includeMetadata: z.boolean().optional()
      .describe('Include page metadata (title, description, etc.) in response (default: true)'),
    includeLinks: z.boolean().optional()
      .describe('Extract and return all links found on the page (default: false)'),
    timeout: z.number().optional()
      .describe('Request timeout in milliseconds (default: 30000)'),
    userAgent: z.string().optional()
      .describe('Custom User-Agent header for requests (default: "AgenticLedger-Bot/1.0")')
  }).optional()
    .describe('Optional configuration for the page scraping request')
});

export type GitbookScrapePageInput = z.infer<typeof GitbookScrapePageSchema>;

/**
 * Tool 3: gitbook_scrape_multiple
 * Scrapes multiple pages from a GitBook site in one operation
 */
export const GitbookScrapeMultipleSchema = z.object({
  accessToken: z.string()
    .describe('Authentication token - use "none" for public GitBook documentation sites. AgenticLedger platform will provide this value.'),
  urls: z.array(z.string().url())
    .describe('Array of page URLs to scrape (e.g., ["https://docs.zircuit.com/build/start", "https://docs.zircuit.com/readme"])'),
  options: z.object({
    includeMetadata: z.boolean().optional()
      .describe('Include page metadata for each page (default: true)'),
    includeLinks: z.boolean().optional()
      .describe('Extract and return all links found on each page (default: false)'),
    concurrency: z.number().min(1).max(5).optional()
      .describe('Number of concurrent requests (1-5, default: 3)'),
    timeout: z.number().optional()
      .describe('Request timeout in milliseconds per page (default: 30000)'),
    userAgent: z.string().optional()
      .describe('Custom User-Agent header for requests (default: "AgenticLedger-Bot/1.0")')
  }).optional()
    .describe('Optional configuration for the batch scraping request')
});

export type GitbookScrapeMultipleInput = z.infer<typeof GitbookScrapeMultipleSchema>;

/**
 * Tool 4: gitbook_scrape_all
 * Scrapes the entire GitBook documentation site
 */
export const GitbookScrapeAllSchema = z.object({
  accessToken: z.string()
    .describe('Authentication token - use "none" for public GitBook documentation sites. AgenticLedger platform will provide this value.'),
  url: z.string().url()
    .describe('Base URL of the GitBook documentation site (e.g., "https://docs.zircuit.com")'),
  options: z.object({
    maxPages: z.number().min(1).max(500).optional()
      .describe('Maximum number of pages to scrape (1-500, default: 100). Use this to limit scope.'),
    includeMetadata: z.boolean().optional()
      .describe('Include page metadata for each page (default: true)'),
    includeLinks: z.boolean().optional()
      .describe('Extract and return all links found on each page (default: false)'),
    concurrency: z.number().min(1).max(5).optional()
      .describe('Number of concurrent requests (1-5, default: 3)'),
    timeout: z.number().optional()
      .describe('Request timeout in milliseconds per page (default: 30000)'),
    userAgent: z.string().optional()
      .describe('Custom User-Agent header for requests (default: "AgenticLedger-Bot/1.0")')
  }).optional()
    .describe('Optional configuration for the full site scraping operation')
});

export type GitbookScrapeAllInput = z.infer<typeof GitbookScrapeAllSchema>;

/**
 * Tool 5: gitbook_search
 * Search for content within scraped GitBook pages
 */
export const GitbookSearchSchema = z.object({
  accessToken: z.string()
    .describe('Authentication token - use "none" for public GitBook documentation sites. AgenticLedger platform will provide this value.'),
  url: z.string().url()
    .describe('Base URL of the GitBook documentation site (e.g., "https://docs.zircuit.com")'),
  query: z.string()
    .describe('Search query to find within the documentation (e.g., "smart contract deployment")'),
  options: z.object({
    maxResults: z.number().min(1).max(50).optional()
      .describe('Maximum number of search results to return (1-50, default: 10)'),
    includeSnippets: z.boolean().optional()
      .describe('Include text snippets around matches (default: true)'),
    caseSensitive: z.boolean().optional()
      .describe('Perform case-sensitive search (default: false)'),
    timeout: z.number().optional()
      .describe('Request timeout in milliseconds (default: 30000)'),
    userAgent: z.string().optional()
      .describe('Custom User-Agent header for requests (default: "AgenticLedger-Bot/1.0")')
  }).optional()
    .describe('Optional configuration for the search operation')
});

export type GitbookSearchInput = z.infer<typeof GitbookSearchSchema>;

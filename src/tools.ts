/**
 * ZeekeeGitbook MCP Server Tools
 *
 * Implementation of all GitBook scraping tools following AgenticLedger platform standards.
 */

import {
  GitbookGetNavigationInput,
  GitbookScrapePageInput,
  GitbookScrapeMultipleInput,
  GitbookScrapeAllInput,
  GitbookSearchInput,
  GitbookGetNavigationSchema,
  GitbookScrapePageSchema,
  GitbookScrapeMultipleSchema,
  GitbookScrapeAllSchema,
  GitbookSearchSchema
} from './schemas.js';

import {
  extractNavigation,
  scrapePage,
  scrapeMultiplePages,
  extractPageUrls,
  searchContent,
  NavigationItem,
  ScrapedPage
} from './scraper.js';

/**
 * Standard response format for all tools
 */
export interface ToolResponse {
  success: boolean;
  data?: any;
  error?: string;
}

/**
 * Tool 1: Get Navigation Structure
 * Extracts the complete site navigation/table of contents
 */
export async function gitbookGetNavigation(args: any): Promise<ToolResponse> {
  try {
    const validated = GitbookGetNavigationSchema.parse(args);
    const startTime = Date.now();

    // Note: accessToken validation (we accept "none" for public docs)
    // In production, platform might provide actual tokens for private GitBook sites

    const navigation = await extractNavigation(validated.url, validated.options);

    // Count total pages
    const extractUrls = (items: NavigationItem[]): number => {
      let count = 0;
      for (const item of items) {
        if (item.type === 'page' && item.href) count++;
        if (item.children) count += extractUrls(item.children);
      }
      return count;
    };

    const totalPages = extractUrls(navigation);

    return {
      success: true,
      data: {
        baseUrl: validated.url,
        navigation,
        totalPages,
        metadata: {
          responseTime: Date.now() - startTime,
          timestamp: new Date().toISOString(),
          source: 'ZeekeeGitbook MCP Server'
        }
      }
    };
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return {
        success: false,
        error: `Validation error: ${error.errors.map((e: any) => e.message).join(', ')}`
      };
    }

    return {
      success: false,
      error: `Failed to extract navigation: ${error.message || String(error)}`
    };
  }
}

/**
 * Tool 2: Scrape Single Page
 * Scrapes one page and returns clean markdown
 */
export async function gitbookScrapePage(args: any): Promise<ToolResponse> {
  try {
    const validated = GitbookScrapePageSchema.parse(args);
    const startTime = Date.now();

    const page = await scrapePage(validated.url, {
      timeout: validated.options?.timeout,
      userAgent: validated.options?.userAgent,
      includeLinks: validated.options?.includeLinks
    });

    const response: any = {
      url: page.url,
      markdown: page.markdown
    };

    if (validated.options?.includeMetadata !== false) {
      response.metadata = page.metadata;
    }

    if (validated.options?.includeLinks && page.links) {
      response.links = page.links;
      response.linkCount = page.links.length;
    }

    response.responseMetadata = {
      responseTime: Date.now() - startTime,
      timestamp: new Date().toISOString(),
      characterCount: page.markdown.length,
      source: 'ZeekeeGitbook MCP Server'
    };

    return {
      success: true,
      data: response
    };
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return {
        success: false,
        error: `Validation error: ${error.errors.map((e: any) => e.message).join(', ')}`
      };
    }

    return {
      success: false,
      error: `Failed to scrape page: ${error.message || String(error)}`
    };
  }
}

/**
 * Tool 3: Scrape Multiple Pages
 * Scrapes multiple pages in batch
 */
export async function gitbookScrapeMultiple(args: any): Promise<ToolResponse> {
  try {
    const validated = GitbookScrapeMultipleSchema.parse(args);
    const startTime = Date.now();

    if (validated.urls.length === 0) {
      return {
        success: false,
        error: 'No URLs provided. Please provide at least one URL to scrape.'
      };
    }

    if (validated.urls.length > 50) {
      return {
        success: false,
        error: `Too many URLs (${validated.urls.length}). Maximum is 50 URLs per batch. Use gitbook_scrape_all for larger operations.`
      };
    }

    const pages = await scrapeMultiplePages(validated.urls, {
      timeout: validated.options?.timeout,
      userAgent: validated.options?.userAgent,
      includeLinks: validated.options?.includeLinks,
      concurrency: validated.options?.concurrency
    });

    const results = pages.map(page => {
      const result: any = {
        url: page.url,
        markdown: page.markdown
      };

      if (validated.options?.includeMetadata !== false) {
        result.metadata = page.metadata;
      }

      if (validated.options?.includeLinks && page.links) {
        result.links = page.links;
        result.linkCount = page.links.length;
      }

      return result;
    });

    return {
      success: true,
      data: {
        pages: results,
        totalPages: results.length,
        totalCharacters: results.reduce((sum, p) => sum + p.markdown.length, 0),
        metadata: {
          responseTime: Date.now() - startTime,
          timestamp: new Date().toISOString(),
          requestedUrls: validated.urls.length,
          successfulScrapes: results.length,
          source: 'ZeekeeGitbook MCP Server'
        }
      }
    };
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return {
        success: false,
        error: `Validation error: ${error.errors.map((e: any) => e.message).join(', ')}`
      };
    }

    return {
      success: false,
      error: `Failed to scrape multiple pages: ${error.message || String(error)}`
    };
  }
}

/**
 * Tool 4: Scrape Entire Site
 * Discovers navigation and scrapes all pages
 */
export async function gitbookScrapeAll(args: any): Promise<ToolResponse> {
  try {
    const validated = GitbookScrapeAllSchema.parse(args);
    const startTime = Date.now();

    // Step 1: Get navigation
    const navigation = await extractNavigation(validated.url, {
      timeout: validated.options?.timeout,
      userAgent: validated.options?.userAgent
    });

    // Step 2: Extract all page URLs
    const allUrls = extractPageUrls(navigation);

    if (allUrls.length === 0) {
      return {
        success: false,
        error: 'No pages found in navigation. The site may use a different structure or be empty.'
      };
    }

    // Step 3: Limit pages if necessary
    const maxPages = validated.options?.maxPages || 100;
    const urlsToScrape = allUrls.slice(0, maxPages);

    // Step 4: Scrape all pages
    const pages = await scrapeMultiplePages(urlsToScrape, {
      timeout: validated.options?.timeout,
      userAgent: validated.options?.userAgent,
      includeLinks: validated.options?.includeLinks,
      concurrency: validated.options?.concurrency
    });

    const results = pages.map(page => {
      const result: any = {
        url: page.url,
        markdown: page.markdown
      };

      if (validated.options?.includeMetadata !== false) {
        result.metadata = page.metadata;
      }

      if (validated.options?.includeLinks && page.links) {
        result.links = page.links;
        result.linkCount = page.links.length;
      }

      return result;
    });

    return {
      success: true,
      data: {
        baseUrl: validated.url,
        pages: results,
        totalPages: results.length,
        totalCharacters: results.reduce((sum, p) => sum + p.markdown.length, 0),
        navigation,
        metadata: {
          responseTime: Date.now() - startTime,
          timestamp: new Date().toISOString(),
          discoveredPages: allUrls.length,
          scrapedPages: results.length,
          limitApplied: allUrls.length > maxPages,
          source: 'ZeekeeGitbook MCP Server'
        }
      }
    };
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return {
        success: false,
        error: `Validation error: ${error.errors.map((e: any) => e.message).join(', ')}`
      };
    }

    return {
      success: false,
      error: `Failed to scrape all pages: ${error.message || String(error)}`
    };
  }
}

/**
 * Tool 5: Search Documentation
 * First scrapes the site, then searches within content
 */
export async function gitbookSearch(args: any): Promise<ToolResponse> {
  try {
    const validated = GitbookSearchSchema.parse(args);
    const startTime = Date.now();

    // Step 1: Get navigation
    const navigation = await extractNavigation(validated.url, {
      timeout: validated.options?.timeout,
      userAgent: validated.options?.userAgent
    });

    // Step 2: Extract URLs
    const allUrls = extractPageUrls(navigation);

    if (allUrls.length === 0) {
      return {
        success: false,
        error: 'No pages found to search. The site may use a different structure or be empty.'
      };
    }

    // Step 3: Scrape pages (limit to reasonable number for search)
    const maxPagesToSearch = Math.min(allUrls.length, 100);
    const urlsToScrape = allUrls.slice(0, maxPagesToSearch);

    const pages = await scrapeMultiplePages(urlsToScrape, {
      timeout: validated.options?.timeout,
      userAgent: validated.options?.userAgent,
      concurrency: 3
    });

    // Step 4: Search within scraped content
    const searchResults = searchContent(pages, validated.query, {
      maxResults: validated.options?.maxResults,
      includeSnippets: validated.options?.includeSnippets,
      caseSensitive: validated.options?.caseSensitive
    });

    return {
      success: true,
      data: {
        query: validated.query,
        results: searchResults,
        totalResults: searchResults.length,
        searchedPages: pages.length,
        metadata: {
          responseTime: Date.now() - startTime,
          timestamp: new Date().toISOString(),
          caseSensitive: validated.options?.caseSensitive || false,
          source: 'ZeekeeGitbook MCP Server'
        }
      }
    };
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return {
        success: false,
        error: `Validation error: ${error.errors.map((e: any) => e.message).join(', ')}`
      };
    }

    return {
      success: false,
      error: `Failed to search documentation: ${error.message || String(error)}`
    };
  }
}

/**
 * GitBook Scraping Logic
 *
 * Core functions for extracting navigation and content from GitBook documentation sites.
 */

import axios, { AxiosInstance } from 'axios';
import * as cheerio from 'cheerio';
import TurndownService from 'turndown';

const DEFAULT_USER_AGENT = 'AgenticLedger-Bot/1.0';
const DEFAULT_TIMEOUT = 30000;

export interface ScraperOptions {
  timeout?: number;
  userAgent?: string;
}

export interface NavigationItem {
  title: string;
  href: string | null;
  type: 'page' | 'group';
  children?: NavigationItem[];
}

export interface PageMetadata {
  title: string;
  description?: string;
  url: string;
  lastModified?: string;
}

export interface ScrapedPage {
  url: string;
  markdown: string;
  metadata: PageMetadata;
  links?: string[];
}

/**
 * Create an axios instance with proper configuration
 */
function createAxiosInstance(options?: ScraperOptions): AxiosInstance {
  return axios.create({
    timeout: options?.timeout || DEFAULT_TIMEOUT,
    headers: {
      'User-Agent': options?.userAgent || DEFAULT_USER_AGENT,
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1'
    },
    maxRedirects: 5,
    validateStatus: (status) => status >= 200 && status < 400
  });
}

/**
 * Extract navigation structure from GitBook page
 * Now with sitemap.xml support for complete page discovery
 */
export async function extractNavigation(
  baseUrl: string,
  options?: ScraperOptions
): Promise<NavigationItem[]> {
  const axiosInstance = createAxiosInstance(options);

  try {
    // Strategy 1: Try to get sitemap.xml (most reliable for GitBook)
    let navigation: NavigationItem[] = await extractFromSitemap(baseUrl, axiosInstance);

    // Strategy 2: If sitemap fails, try HTML parsing
    if (navigation.length === 0) {
      const response = await axiosInstance.get(baseUrl);
      const html = response.data;
      const $ = cheerio.load(html);

      // Look for __GITBOOK_DATA__ or similar embedded JSON
      $('script').each((_, element) => {
        const scriptContent = $(element).html();
        if (scriptContent && scriptContent.includes('gitbook')) {
          // Try to extract JSON data
          try {
            // GitBook embeds navigation data in various formats
            // Attempt to parse navigation from script content
            const matches = scriptContent.match(/pages['"]\s*:\s*(\[[\s\S]*?\])/);
            if (matches && matches[1]) {
              const pagesData = JSON.parse(matches[1]);
              navigation = parseGitBookPages(pagesData);
              return false; // Stop iteration
            }
          } catch (e) {
            // Continue searching
          }
        }
      });

      // Fallback: Parse sidebar navigation from HTML
      if (navigation.length === 0) {
        // Try multiple strategies to find navigation

        // Look for aside elements (GitBook often uses this)
        let navLinks = $('aside a[href^="/"]');

        // If no aside, try nav elements
        if (navLinks.length === 0) {
          navLinks = $('nav a[href^="/"]');
        }

        // If still nothing, try all internal links
        if (navLinks.length === 0) {
          navLinks = $('a[href^="/"]');
        }

        // Extract all links
        navLinks.each((_, link) => {
          const $link = $(link);
          const href = $link.attr('href');
          const title = $link.text().trim();

          if (title && href && href !== '/') {
            const fullUrl = normalizeUrl(baseUrl, href);
            // Skip duplicates and non-content links
            if (fullUrl && !fullUrl.includes('#') && !fullUrl.includes('javascript:')) {
              navigation.push({
                title,
                href: fullUrl,
                type: 'page'
              });
            }
          }
        });
      }
    }

    return deduplicateNavigation(navigation);
  } catch (error) {
    throw new Error(`Failed to extract navigation from ${baseUrl}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Extract navigation from sitemap.xml
 */
async function extractFromSitemap(
  baseUrl: string,
  axiosInstance: AxiosInstance
): Promise<NavigationItem[]> {
  const navigation: NavigationItem[] = [];

  try {
    // Try sitemap.xml first
    const sitemapUrl = new URL('/sitemap.xml', baseUrl).toString();
    const response = await axiosInstance.get(sitemapUrl);
    const xml = response.data;

    // Parse XML to find URLs
    // Look for <loc> tags
    const locMatches = xml.match(/<loc>([^<]+)<\/loc>/g);

    if (locMatches && locMatches.length > 0) {
      // Check if this is a sitemap index (points to other sitemaps)
      if (xml.includes('sitemapindex')) {
        // This is a sitemap index, fetch the actual page sitemaps
        const sitemapUrls = locMatches.map((match: string) =>
          match.replace(/<\/?loc>/g, '')
        );

        // Fetch each sitemap
        for (const sitemapUrl of sitemapUrls) {
          try {
            const subResponse = await axiosInstance.get(sitemapUrl);
            const subXml = subResponse.data;
            const subLocMatches = subXml.match(/<loc>([^<]+)<\/loc>/g);

            if (subLocMatches) {
              subLocMatches.forEach((match: string) => {
                const url = match.replace(/<\/?loc>/g, '');
                const title = extractTitleFromUrl(url, baseUrl);
                navigation.push({
                  title,
                  href: url,
                  type: 'page'
                });
              });
            }
          } catch (e) {
            // Skip failed sitemaps
            console.error(`Failed to fetch sitemap ${sitemapUrl}:`, e instanceof Error ? e.message : String(e));
          }
        }
      } else {
        // This is a direct sitemap with URLs
        locMatches.forEach((match: string) => {
          const url = match.replace(/<\/?loc>/g, '');
          const title = extractTitleFromUrl(url, baseUrl);
          navigation.push({
            title,
            href: url,
            type: 'page'
          });
        });
      }
    }
  } catch (error) {
    // Sitemap not found or error, return empty array to try other methods
    console.error('Sitemap extraction failed:', error instanceof Error ? error.message : String(error));
  }

  return navigation;
}

/**
 * Extract a reasonable title from URL path
 */
function extractTitleFromUrl(url: string, baseUrl: string): string {
  try {
    const urlObj = new URL(url);
    const path = urlObj.pathname;

    // Remove base path and trailing slash
    const relativePath = path.replace(/^\/|\/$/g, '');

    if (!relativePath) {
      return 'Home';
    }

    // Get the last segment of the path
    const segments = relativePath.split('/');
    const lastSegment = segments[segments.length - 1];

    // Convert kebab-case or snake_case to Title Case
    const title = lastSegment
      .replace(/[-_]/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');

    return title;
  } catch (e) {
    return url;
  }
}

/**
 * Parse GitBook pages JSON structure
 */
function parseGitBookPages(pagesData: any[]): NavigationItem[] {
  const navigation: NavigationItem[] = [];

  for (const page of pagesData) {
    if (typeof page === 'object' && page !== null) {
      const item: NavigationItem = {
        title: page.title || page.name || 'Untitled',
        href: page.href || page.path || page.url || null,
        type: page.type === 'group' || page.pages ? 'group' : 'page'
      };

      if (page.pages && Array.isArray(page.pages)) {
        item.children = parseGitBookPages(page.pages);
      }

      navigation.push(item);
    }
  }

  return navigation;
}

/**
 * Scrape a single GitBook page
 */
export async function scrapePage(
  url: string,
  options?: ScraperOptions & { includeLinks?: boolean }
): Promise<ScrapedPage> {
  const axiosInstance = createAxiosInstance(options);

  try {
    const response = await axiosInstance.get(url);
    const html = response.data;
    const $ = cheerio.load(html);

    // Extract main content
    let mainContent = $('main, article, .content, [role="main"]').first();

    if (mainContent.length === 0) {
      // Fallback to body if no main content found
      mainContent = $('body');
    }

    // Remove navigation, footer, and other non-content elements
    mainContent.find('nav, header, footer, .sidebar, .navigation, [role="navigation"]').remove();
    mainContent.find('script, style, iframe').remove();

    // Extract metadata
    const metadata: PageMetadata = {
      title: $('title').text() || $('h1').first().text() || 'Untitled',
      description: $('meta[name="description"]').attr('content') || $('meta[property="og:description"]').attr('content'),
      url: url,
      lastModified: $('meta[property="article:modified_time"]').attr('content')
    };

    // Convert HTML to Markdown
    const turndownService = new TurndownService({
      headingStyle: 'atx',
      codeBlockStyle: 'fenced',
      bulletListMarker: '-'
    });

    // Add custom rules for better markdown conversion
    turndownService.addRule('removeEmptyLinks', {
      filter: (node) => {
        return node.nodeName === 'A' && !node.textContent?.trim();
      },
      replacement: () => ''
    });

    const markdown = turndownService.turndown(mainContent.html() || '');

    // Extract links if requested
    const links: string[] = [];
    if (options?.includeLinks) {
      mainContent.find('a').each((_, link) => {
        const href = $(link).attr('href');
        if (href) {
          const fullUrl = normalizeUrl(url, href);
          if (fullUrl && !links.includes(fullUrl)) {
            links.push(fullUrl);
          }
        }
      });
    }

    return {
      url,
      markdown: markdown.trim(),
      metadata,
      links: options?.includeLinks ? links : undefined
    };
  } catch (error) {
    throw new Error(`Failed to scrape page ${url}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Scrape multiple pages with concurrency control
 */
export async function scrapeMultiplePages(
  urls: string[],
  options?: ScraperOptions & { includeLinks?: boolean; concurrency?: number }
): Promise<ScrapedPage[]> {
  const concurrency = Math.min(options?.concurrency || 3, 5);
  const results: ScrapedPage[] = [];
  const errors: Array<{ url: string; error: string }> = [];

  // Process in batches
  for (let i = 0; i < urls.length; i += concurrency) {
    const batch = urls.slice(i, i + concurrency);

    const batchPromises = batch.map(async (url) => {
      try {
        const page = await scrapePage(url, options);
        return { success: true, page };
      } catch (error) {
        return {
          success: false,
          url,
          error: error instanceof Error ? error.message : String(error)
        };
      }
    });

    const batchResults = await Promise.all(batchPromises);

    for (const result of batchResults) {
      if (result.success && 'page' in result && result.page) {
        results.push(result.page);
      } else if (!result.success && 'url' in result && result.url && result.error) {
        errors.push({ url: result.url, error: result.error });
      }
    }

    // Add delay between batches to be respectful
    if (i + concurrency < urls.length) {
      await delay(1000);
    }
  }

  // If there were errors, include them in the last page's metadata
  if (errors.length > 0 && results.length > 0) {
    console.warn(`Failed to scrape ${errors.length} pages:`, errors);
  }

  return results;
}

/**
 * Extract all page URLs from navigation
 */
export function extractPageUrls(navigation: NavigationItem[]): string[] {
  const urls: string[] = [];

  function traverse(items: NavigationItem[]) {
    for (const item of items) {
      if (item.href && item.type === 'page') {
        urls.push(item.href);
      }
      if (item.children) {
        traverse(item.children);
      }
    }
  }

  traverse(navigation);
  return urls;
}

/**
 * Normalize URL (handle relative paths)
 */
function normalizeUrl(baseUrl: string, href: string): string {
  try {
    // If href is already a full URL, return it
    if (href.startsWith('http://') || href.startsWith('https://')) {
      return href;
    }

    // Handle fragment-only URLs
    if (href.startsWith('#')) {
      return '';
    }

    // Create full URL from base and href
    const base = new URL(baseUrl);
    const fullUrl = new URL(href, base.origin);

    return fullUrl.toString();
  } catch {
    return '';
  }
}

/**
 * Remove duplicate navigation items
 */
function deduplicateNavigation(navigation: NavigationItem[]): NavigationItem[] {
  const seen = new Set<string>();
  const result: NavigationItem[] = [];

  for (const item of navigation) {
    const key = item.href || item.title;
    if (!seen.has(key)) {
      seen.add(key);
      result.push(item);
    }
  }

  return result;
}

/**
 * Delay helper
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Search within scraped content
 */
export function searchContent(
  pages: ScrapedPage[],
  query: string,
  options?: {
    maxResults?: number;
    includeSnippets?: boolean;
    caseSensitive?: boolean;
  }
): Array<{
  url: string;
  title: string;
  snippet?: string;
  matchCount: number;
}> {
  const maxResults = options?.maxResults || 10;
  const includeSnippets = options?.includeSnippets !== false;
  const caseSensitive = options?.caseSensitive || false;

  const searchQuery = caseSensitive ? query : query.toLowerCase();
  const results: Array<{
    url: string;
    title: string;
    snippet?: string;
    matchCount: number;
  }> = [];

  for (const page of pages) {
    const content = caseSensitive ? page.markdown : page.markdown.toLowerCase();

    // Count matches
    const matches = content.split(searchQuery).length - 1;

    if (matches > 0) {
      let snippet: string | undefined;

      if (includeSnippets) {
        // Find first occurrence and extract surrounding context
        const index = content.indexOf(searchQuery);
        if (index !== -1) {
          const start = Math.max(0, index - 100);
          const end = Math.min(content.length, index + searchQuery.length + 100);
          snippet = '...' + page.markdown.substring(start, end) + '...';
        }
      }

      results.push({
        url: page.url,
        title: page.metadata.title,
        snippet,
        matchCount: matches
      });
    }
  }

  // Sort by match count (descending)
  results.sort((a, b) => b.matchCount - a.matchCount);

  return results.slice(0, maxResults);
}

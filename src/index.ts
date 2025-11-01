/**
 * ZeekeeGitbook MCP Server
 *
 * MCP server for scraping and extracting content from GitBook documentation sites.
 * Specifically optimized for Zircuit docs (https://docs.zircuit.com/) but works with any GitBook site.
 *
 * Authentication Pattern: None (public documentation)
 * Response Format: { success: boolean, data?: any, error?: string }
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema
} from '@modelcontextprotocol/sdk/types.js';
import { zodToJsonSchema } from 'zod-to-json-schema';

import {
  GitbookGetNavigationSchema,
  GitbookScrapePageSchema,
  GitbookScrapeMultipleSchema,
  GitbookScrapeAllSchema,
  GitbookSearchSchema
} from './schemas.js';

import {
  gitbookGetNavigation,
  gitbookScrapePage,
  gitbookScrapeMultiple,
  gitbookScrapeAll,
  gitbookSearch
} from './tools.js';

/**
 * MCP Server Instance
 */
const server = new Server(
  {
    name: 'zeekee-gitbook-mcp-server',
    version: '1.0.0'
  },
  {
    capabilities: {
      tools: {}
    }
  }
);

/**
 * Convert Zod schema to MCP-compatible JSON schema
 */
function zodToMCPSchema(zodSchema: any): any {
  const jsonSchema = zodToJsonSchema(zodSchema);
  // Remove $schema property as MCP doesn't need it
  const { $schema, ...rest } = jsonSchema as any;
  return rest;
}

/**
 * List all available tools
 */
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'gitbook_get_navigation',
        description: 'Extract the complete navigation structure (table of contents) from a GitBook documentation site. Returns hierarchical page structure with titles and URLs. Perfect for discovering all available pages before scraping.',
        inputSchema: zodToMCPSchema(GitbookGetNavigationSchema)
      },
      {
        name: 'gitbook_scrape_page',
        description: 'Scrape a single page from a GitBook site and convert to clean markdown format. Removes navigation, footers, and other UI elements. Returns page content optimized for AI processing.',
        inputSchema: zodToMCPSchema(GitbookScrapePageSchema)
      },
      {
        name: 'gitbook_scrape_multiple',
        description: 'Scrape multiple pages from a GitBook site in one operation. Supports concurrent requests for faster processing. Ideal when you know specific pages you want to extract.',
        inputSchema: zodToMCPSchema(GitbookScrapeMultipleSchema)
      },
      {
        name: 'gitbook_scrape_all',
        description: 'Automatically discover navigation and scrape entire GitBook documentation site. First extracts all page URLs from navigation, then scrapes each page. Returns complete site content in markdown format.',
        inputSchema: zodToMCPSchema(GitbookScrapeAllSchema)
      },
      {
        name: 'gitbook_search',
        description: 'Search for content within a GitBook documentation site. First scrapes the site, then performs text search across all pages. Returns matching pages with snippets and match counts.',
        inputSchema: zodToMCPSchema(GitbookSearchSchema)
      }
    ]
  };
});

/**
 * Handle tool execution
 */
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  // Validate accessToken is provided (even if it's "none" for public docs)
  if (!args || typeof args !== 'object' || !('accessToken' in args)) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: false,
          error: 'accessToken is required. Use "none" for public GitBook documentation sites.'
        }, null, 2)
      }]
    };
  }

  try {
    let result;

    switch (name) {
      case 'gitbook_get_navigation':
        result = await gitbookGetNavigation(args);
        break;

      case 'gitbook_scrape_page':
        result = await gitbookScrapePage(args);
        break;

      case 'gitbook_scrape_multiple':
        result = await gitbookScrapeMultiple(args);
        break;

      case 'gitbook_scrape_all':
        result = await gitbookScrapeAll(args);
        break;

      case 'gitbook_search':
        result = await gitbookSearch(args);
        break;

      default:
        result = {
          success: false,
          error: `Unknown tool: ${name}. Available tools: gitbook_get_navigation, gitbook_scrape_page, gitbook_scrape_multiple, gitbook_scrape_all, gitbook_search`
        };
    }

    return {
      content: [{
        type: 'text',
        text: JSON.stringify(result, null, 2)
      }]
    };
  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: false,
          error: error instanceof Error ? error.message : String(error)
        }, null, 2)
      }]
    };
  }
});

/**
 * Start the server
 */
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('ZeekeeGitbook MCP Server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error in main():', error);
  process.exit(1);
});

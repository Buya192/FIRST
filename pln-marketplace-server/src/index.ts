#!/usr/bin/env node

/**
 * PLN Marketplace MCP Server
 * Provides browser automation tools for exploring PLN Marketplace
 * Allows manual browser interaction and data extraction
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import puppeteer from 'puppeteer';
import axios from 'axios';

/**
 * Type definitions for PLN Marketplace data
 */
interface MenuInfo {
  name: string;
  url: string;
  accessible: boolean;
  dataAvailable: boolean;
  tableStructure?: {
    headers: string[];
    rowCount: number;
    hasPagination: boolean;
    hasFilters: boolean;
  };
  formElements?: Array<{
    action: string;
    method: string;
    fields: Array<{
      name: string;
      type: string;
      required: boolean;
    }>;
  }>;
}

interface ExplorationResult {
  timestamp: string;
  authenticationSuccess: boolean;
  userRole?: string;
  accessibleMenus: MenuInfo[];
  discoveredApis: string[];
  dataSamples: Record<string, any>;
  screenshots: string[];
  recommendations: string[];
}

/**
 * In-memory storage for exploration results
 */
let explorationResults: ExplorationResult[] = [];
let currentBrowser: any = null;

/**
 * Create MCP server for PLN Marketplace exploration
 */
const server = new Server(
  {
    name: "pln-marketplace-server",
    version: "0.1.0",
  },
  {
    capabilities: {
      resources: {},
      tools: {},
    },
  }
);

/**
 * Handler for listing available exploration results as resources
 */
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  return {
    resources: explorationResults.map((result, index) => ({
      uri: `pln://exploration/${index}`,
      mimeType: "application/json",
      name: `PLN Marketplace Exploration ${index + 1}`,
      description: `Exploration result from ${result.timestamp} - Auth: ${result.authenticationSuccess ? 'Success' : 'Failed'}`
    }))
  };
});

/**
 * Handler for reading specific exploration results
 */
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const url = new URL(request.params.uri);
  const index = parseInt(url.pathname.replace(/^\/exploration\//, ''));
  const result = explorationResults[index];

  if (!result) {
    throw new Error(`Exploration result ${index} not found`);
  }

  return {
    contents: [{
      uri: request.params.uri,
      mimeType: "application/json",
      text: JSON.stringify(result, null, 2)
    }]
  };
});

/**
 * Handler for listing available tools
 */
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "launch_browser",
        description: "Launch browser and navigate to PLN Marketplace",
        inputSchema: {
          type: "object",
          properties: {
            headless: {
              type: "boolean",
              description: "Run browser in headless mode",
              default: false
            }
          }
        }
      },
      {
        name: "navigate_to_url",
        description: "Navigate to a specific URL",
        inputSchema: {
          type: "object",
          properties: {
            url: {
              type: "string",
              description: "URL to navigate to"
            }
          },
          required: ["url"]
        }
      },
      {
        name: "login_marketplace",
        description: "Login to PLN Marketplace with credentials",
        inputSchema: {
          type: "object",
          properties: {
            username: {
              type: "string",
              description: "PLN Marketplace username"
            },
            password: {
              type: "string",
              description: "PLN Marketplace password"
            }
          },
          required: ["username", "password"]
        }
      },
      {
        name: "take_screenshot",
        description: "Take a screenshot of current page",
        inputSchema: {
          type: "object",
          properties: {
            name: {
              type: "string",
              description: "Name for the screenshot file"
            }
          }
        }
      },
      {
        name: "extract_page_data",
        description: "Extract data from current page (tables, forms, menus)",
        inputSchema: {
          type: "object",
          properties: {
            extractType: {
              type: "string",
              enum: ["menus", "tables", "forms", "all"],
              description: "Type of data to extract",
              default: "all"
            }
          }
        }
      },
      {
        name: "click_element",
        description: "Click on an element by selector",
        inputSchema: {
          type: "object",
          properties: {
            selector: {
              type: "string",
              description: "CSS selector for the element to click"
            },
            waitTime: {
              type: "number",
              description: "Time to wait after clicking (ms)",
              default: 2000
            }
          },
          required: ["selector"]
        }
      },
      {
        name: "get_page_info",
        description: "Get current page URL, title, and basic info",
        inputSchema: {
          type: "object",
          properties: {}
        }
      },
      {
        name: "close_browser",
        description: "Close the browser instance",
        inputSchema: {
          type: "object",
          properties: {}
        }
      },
      {
        name: "run_full_exploration",
        description: "Run complete PLN Marketplace exploration",
        inputSchema: {
          type: "object",
          properties: {
            username: {
              type: "string",
              description: "PLN Marketplace username"
            },
            password: {
              type: "string",
              description: "PLN Marketplace password"
            },
            headless: {
              type: "boolean",
              description: "Run browser in headless mode",
              default: false
            }
          },
          required: ["username", "password"]
        }
      }
    ]
  };
});

/**
 * Handler for tool execution
 */
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "launch_browser": {
        const headless = args?.headless || false;
        
        if (currentBrowser) {
          await currentBrowser.close();
        }

        currentBrowser = await puppeteer.launch({
          headless,
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-web-security',
            '--allow-running-insecure-content'
          ]
        });

        const page = await currentBrowser.newPage();
        await page.setViewport({ width: 1920, height: 1080 });
        
        return {
          content: [{
            type: "text",
            text: `Browser launched successfully in ${headless ? 'headless' : 'visible'} mode`
          }]
        };
      }

      case "navigate_to_url": {
        if (!currentBrowser) {
          throw new Error("Browser not launched. Use launch_browser first.");
        }

        const url = String(args?.url);
        const pages = await currentBrowser.pages();
        const page = pages[0];
        
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
        
        return {
          content: [{
            type: "text",
            text: `Navigated to: ${url}`
          }]
        };
      }

      case "login_marketplace": {
        if (!currentBrowser) {
          throw new Error("Browser not launched. Use launch_browser first.");
        }

        const username = String(args?.username);
        const password = String(args?.password);
        const pages = await currentBrowser.pages();
        const page = pages[0];

        // Navigate to marketplace if not already there
        const currentUrl = page.url();
        if (!currentUrl.includes('marketplace.pln.co.id')) {
          await page.goto('https://marketplace.pln.co.id', { waitUntil: 'networkidle2' });
        }

        // Wait for page to load
        await page.waitForTimeout(5000);

        // Try to find and fill login form
        const usernameSelectors = [
          'input[name="username"]',
          'input[name="email"]',
          'input[type="email"]',
          'input[id="username"]',
          'input[id="email"]'
        ];

        let usernameField = null;
        for (const selector of usernameSelectors) {
          try {
            await page.waitForSelector(selector, { timeout: 5000 });
            usernameField = await page.$(selector);
            if (usernameField) break;
          } catch (e) {
            continue;
          }
        }

        if (!usernameField) {
          return {
            content: [{
              type: "text",
              text: "Could not find username field. Please check if you're on the login page."
            }]
          };
        }

        // Fill username
        await page.focus('input[name="username"], input[name="email"], input[type="email"], input[id="username"], input[id="email"]');
        await page.keyboard.type(username);

        // Fill password
        await page.focus('input[name="password"], input[type="password"], input[id="password"]');
        await page.keyboard.type(password);

        // Submit form
        const submitSelectors = [
          'button[type="submit"]',
          'input[type="submit"]',
          '.btn-login',
          '#login-btn'
        ];

        for (const selector of submitSelectors) {
          try {
            const submitBtn = await page.$(selector);
            if (submitBtn) {
              await submitBtn.click();
              break;
            }
          } catch (e) {
            continue;
          }
        }

        // Wait for navigation
        await page.waitForTimeout(3000);

        const newUrl = page.url();
        const loginSuccess = newUrl !== currentUrl && !newUrl.includes('/login');

        return {
          content: [{
            type: "text",
            text: `Login attempt completed. Current URL: ${newUrl}. Success: ${loginSuccess}`
          }]
        };
      }

      case "take_screenshot": {
        if (!currentBrowser) {
          throw new Error("Browser not launched. Use launch_browser first.");
        }

        const name = String(args?.name || 'screenshot');
        const pages = await currentBrowser.pages();
        const page = pages[0];
        
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `${timestamp}_${name}.png`;
        
        await page.screenshot({ path: filename, fullPage: true });
        
        return {
          content: [{
            type: "text",
            text: `Screenshot saved as: ${filename}`
          }]
        };
      }

      case "extract_page_data": {
        if (!currentBrowser) {
          throw new Error("Browser not launched. Use launch_browser first.");
        }

        const extractType = String(args?.extractType || 'all');
        const pages = await currentBrowser.pages();
        const page = pages[0];

        const data = await page.evaluate((type) => {
          const result: any = {};

          if (type === 'menus' || type === 'all') {
            // Extract navigation menus
            const navElements = document.querySelectorAll('nav, .sidebar, .navigation, .menu');
            const menus: any[] = [];
            
            navElements.forEach(nav => {
              const links = nav.querySelectorAll('a');
              links.forEach(link => {
                const href = link.getAttribute('href');
                const text = link.textContent?.trim();
                if (href && text) {
                  menus.push({
                    text,
                    href,
                    visible: link.offsetParent !== null
                  });
                }
              });
            });
            
            result.menus = menus;
          }

          if (type === 'tables' || type === 'all') {
            // Extract table data
            const tables = document.querySelectorAll('table');
            const tableData: any[] = [];
            
            tables.forEach((table, index) => {
              const headers: string[] = [];
              const headerCells = table.querySelectorAll('thead th, thead td, tr:first-child th, tr:first-child td');
              headerCells.forEach(cell => {
                headers.push(cell.textContent?.trim() || '');
              });
              
              const rows = table.querySelectorAll('tbody tr, tr');
              const rowCount = rows.length;
              
              tableData.push({
                index,
                headers,
                rowCount,
                hasPagination: !!document.querySelector('.pagination, .pager'),
                hasFilters: !!document.querySelector('.filter, .search, input[type="search"]')
              });
            });
            
            result.tables = tableData;
          }

          if (type === 'forms' || type === 'all') {
            // Extract form data
            const forms = document.querySelectorAll('form');
            const formData: any[] = [];
            
            forms.forEach((form, index) => {
              const inputs = form.querySelectorAll('input, select, textarea');
              const fields: any[] = [];
              
              inputs.forEach(input => {
                const name = input.getAttribute('name');
                const type = input.getAttribute('type') || input.tagName.toLowerCase();
                const required = input.hasAttribute('required');
                
                if (name) {
                  fields.push({ name, type, required });
                }
              });
              
              formData.push({
                index,
                action: form.getAttribute('action') || '',
                method: form.getAttribute('method') || 'GET',
                fields
              });
            });
            
            result.forms = formData;
          }

          return result;
        }, extractType);

        return {
          content: [{
            type: "text",
            text: JSON.stringify(data, null, 2)
          }]
        };
      }

      case "click_element": {
        if (!currentBrowser) {
          throw new Error("Browser not launched. Use launch_browser first.");
        }

        const selector = String(args?.selector);
        const waitTime = Number(args?.waitTime || 2000);
        const pages = await currentBrowser.pages();
        const page = pages[0];

        try {
          await page.waitForSelector(selector, { timeout: 10000 });
          await page.click(selector);
          await page.waitForTimeout(waitTime);
          
          return {
            content: [{
              type: "text",
              text: `Clicked element: ${selector}`
            }]
          };
        } catch (error) {
          return {
            content: [{
              type: "text",
              text: `Failed to click element: ${selector}. Error: ${error}`
            }]
          };
        }
      }

      case "get_page_info": {
        if (!currentBrowser) {
          throw new Error("Browser not launched. Use launch_browser first.");
        }

        const pages = await currentBrowser.pages();
        const page = pages[0];
        
        const info = await page.evaluate(() => ({
          url: window.location.href,
          title: document.title,
          readyState: document.readyState,
          hasLoginForm: !!document.querySelector('input[type="password"]'),
          hasDataTables: document.querySelectorAll('table').length,
          hasNavigation: !!document.querySelector('nav, .sidebar, .navigation')
        }));

        return {
          content: [{
            type: "text",
            text: JSON.stringify(info, null, 2)
          }]
        };
      }

      case "close_browser": {
        if (currentBrowser) {
          await currentBrowser.close();
          currentBrowser = null;
        }
        
        return {
          content: [{
            type: "text",
            text: "Browser closed successfully"
          }]
        };
      }

      case "run_full_exploration": {
        const username = String(args?.username);
        const password = String(args?.password);
        const headless = args?.headless || false;

        // Start full exploration
        const result: ExplorationResult = {
          timestamp: new Date().toISOString(),
          authenticationSuccess: false,
          accessibleMenus: [],
          discoveredApis: [],
          dataSamples: {},
          screenshots: [],
          recommendations: []
        };

        try {
          // Launch browser
          if (currentBrowser) {
            await currentBrowser.close();
          }

          currentBrowser = await puppeteer.launch({
            headless,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
          });

          const page = await currentBrowser.newPage();
          await page.setViewport({ width: 1920, height: 1080 });

          // Navigate to marketplace
          await page.goto('https://marketplace.pln.co.id', { waitUntil: 'networkidle2' });
          await page.waitForTimeout(5000);

          // Take initial screenshot
          await page.screenshot({ path: 'initial_page.png' });
          result.screenshots.push('initial_page.png');

          // Attempt login
          try {
            await page.focus('input[name="username"], input[name="email"], input[type="email"]');
            await page.keyboard.type(username);
            await page.focus('input[name="password"], input[type="password"]');
            await page.keyboard.type(password);
            
            const submitBtn = await page.$('button[type="submit"], input[type="submit"]');
            if (submitBtn) {
              await submitBtn.click();
              await page.waitForTimeout(3000);
              
              const currentUrl = page.url();
              result.authenticationSuccess = !currentUrl.includes('/login');
              
              if (result.authenticationSuccess) {
                await page.screenshot({ path: 'after_login.png' });
                result.screenshots.push('after_login.png');
                
                // Extract menu structure
                const menuData = await page.evaluate(() => {
                  const menus: any[] = [];
                  const navElements = document.querySelectorAll('nav a, .sidebar a, .menu a');
                  
                  navElements.forEach(link => {
                    const href = link.getAttribute('href');
                    const text = link.textContent?.trim();
                    if (href && text) {
                      menus.push({
                        name: text,
                        url: href,
                        accessible: true,
                        dataAvailable: false
                      });
                    }
                  });
                  
                  return menus;
                });
                
                result.accessibleMenus = menuData;
                result.recommendations.push("✅ Authentication successful");
                result.recommendations.push(`📋 Found ${menuData.length} accessible menu items`);
              }
            }
          } catch (loginError) {
            result.recommendations.push("❌ Login failed - check credentials");
          }

          explorationResults.push(result);

          return {
            content: [{
              type: "text",
              text: JSON.stringify(result, null, 2)
            }]
          };

        } catch (error) {
          result.recommendations.push(`❌ Exploration failed: ${error}`);
          explorationResults.push(result);
          
          return {
            content: [{
              type: "text",
              text: JSON.stringify(result, null, 2)
            }]
          };
        }
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [{
        type: "text",
        text: `Error executing ${name}: ${error}`
      }],
      isError: true
    };
  }
});

/**
 * Start the server using stdio transport
 */
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  
  // Cleanup on exit
  process.on('SIGINT', async () => {
    if (currentBrowser) {
      await currentBrowser.close();
    }
    process.exit(0);
  });
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});

#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import axios, { AxiosResponse } from 'axios';
import * as cron from 'node-cron';

// PLN Marketplace API Configuration
interface PLNConfig {
  baseUrl: string;
  username: string;
  password: string;
  timeout: number;
}

interface PLNOrder {
  id: string;
  unitName: string;
  qty: number;
  qtyPo: number;
  supplierName: string;
  nopo: string;
  submitDate: string;
  eta: string;
  status: string;
  detail: Array<{
    description: string;
    sku: string;
    qty: number;
    qtyTerima: number;
    noBaTug3: string | null;
    noBbaTug4: string | null;
    status: string;
  }>;
}

interface APIHealthStatus {
  isHealthy: boolean;
  responseTime: number;
  lastCheck: string;
  errorCount: number;
  successCount: number;
}

class PLNMarketplaceMCPServer {
  private server: Server;
  private config: PLNConfig;
  private authToken: string | null = null;
  private healthStatus: APIHealthStatus;
  private monitoringEnabled: boolean = false;

  constructor() {
    this.server = new Server(
      {
        name: 'pln-marketplace-mcp-server',
        version: '1.0.0',
      }
    );

    this.config = {
      baseUrl: 'https://apimarketplace.pln.co.id',
      username: 'adrianus.hito',
      password: '@Dhi062025',
      timeout: 30000,
    };

    this.healthStatus = {
      isHealthy: false,
      responseTime: 0,
      lastCheck: new Date().toISOString(),
      errorCount: 0,
      successCount: 0,
    };

    this.setupToolHandlers();
    this.setupErrorHandling();
  }

  private setupToolHandlers(): void {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'pln_authenticate',
            description: 'Authenticate with PLN Marketplace API',
            inputSchema: {
              type: 'object',
              properties: {
                username: {
                  type: 'string',
                  description: 'PLN Marketplace username',
                  default: 'adrianus.hito',
                },
                password: {
                  type: 'string',
                  description: 'PLN Marketplace password',
                },
              },
              required: ['username', 'password'],
            },
          },
          {
            name: 'pln_fetch_orders',
            description: 'Fetch delivery orders from PLN Marketplace',
            inputSchema: {
              type: 'object',
              properties: {
                limit: {
                  type: 'number',
                  description: 'Maximum number of orders to fetch',
                  default: 50,
                },
                status: {
                  type: 'string',
                  description: 'Filter by order status',
                  enum: ['CREATED', 'PROCCESSED', 'DELIVERED', 'COMPLETED'],
                },
              },
            },
          },
          {
            name: 'pln_health_check',
            description: 'Check PLN Marketplace API health and connectivity',
            inputSchema: {
              type: 'object',
              properties: {},
            },
          },
          {
            name: 'pln_get_order_details',
            description: 'Get detailed information for a specific order',
            inputSchema: {
              type: 'object',
              properties: {
                orderId: {
                  type: 'string',
                  description: 'PLN Marketplace order ID',
                },
              },
              required: ['orderId'],
            },
          },
          {
            name: 'pln_monitor_start',
            description: 'Start continuous monitoring of PLN Marketplace API',
            inputSchema: {
              type: 'object',
              properties: {
                interval: {
                  type: 'string',
                  description: 'Cron expression for monitoring interval',
                  default: '*/5 * * * *', // Every 5 minutes
                },
              },
            },
          },
          {
            name: 'pln_monitor_stop',
            description: 'Stop continuous monitoring',
            inputSchema: {
              type: 'object',
              properties: {},
            },
          },
          {
            name: 'pln_get_metrics',
            description: 'Get API performance metrics and statistics',
            inputSchema: {
              type: 'object',
              properties: {},
            },
          },
          {
            name: 'pln_test_endpoint',
            description: 'Test specific API endpoint with custom parameters',
            inputSchema: {
              type: 'object',
              properties: {
                endpoint: {
                  type: 'string',
                  description: 'API endpoint path',
                },
                method: {
                  type: 'string',
                  description: 'HTTP method',
                  enum: ['GET', 'POST', 'PUT', 'DELETE'],
                  default: 'GET',
                },
                data: {
                  type: 'object',
                  description: 'Request payload for POST/PUT requests',
                },
              },
              required: ['endpoint'],
            },
          },
        ],
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'pln_authenticate':
            return await this.authenticate(
              (args as any)?.username || '',
              (args as any)?.password || ''
            );

          case 'pln_fetch_orders':
            return await this.fetchOrders(
              (args as any)?.limit,
              (args as any)?.status
            );

          case 'pln_health_check':
            return await this.healthCheck();

          case 'pln_get_order_details':
            return await this.getOrderDetails((args as any)?.orderId || '');

          case 'pln_monitor_start':
            return await this.startMonitoring((args as any)?.interval);

          case 'pln_monitor_stop':
            return await this.stopMonitoring();

          case 'pln_get_metrics':
            return await this.getMetrics();

          case 'pln_test_endpoint':
            return await this.testEndpoint(
              (args as any)?.endpoint || '',
              (args as any)?.method || 'GET',
              (args as any)?.data
            );

          default:
            throw new McpError(
              ErrorCode.MethodNotFound,
              `Unknown tool: ${name}`
            );
        }
      } catch (error) {
        if (error instanceof McpError) {
          throw error;
        }
        throw new McpError(
          ErrorCode.InternalError,
          `Tool execution failed: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    });
  }

  private async authenticate(username: string, password: string): Promise<any> {
    try {
      const startTime = Date.now();
      
      const response = await axios.post(
        `${this.config.baseUrl}/auth/login`,
        { username, password },
        { timeout: this.config.timeout }
      );

      const responseTime = Date.now() - startTime;

      if (response.status === 200 && response.data.token) {
        this.authToken = response.data.token;
        this.healthStatus.successCount++;
        this.healthStatus.responseTime = responseTime;
        this.healthStatus.isHealthy = true;
        this.healthStatus.lastCheck = new Date().toISOString();

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                message: 'Authentication successful',
                responseTime: `${responseTime}ms`,
                tokenReceived: true,
                timestamp: new Date().toISOString(),
              }, null, 2),
            },
          ],
        };
      } else {
        throw new Error(`Authentication failed: ${response.status}`);
      }
    } catch (error) {
      this.healthStatus.errorCount++;
      this.healthStatus.isHealthy = false;
      this.healthStatus.lastCheck = new Date().toISOString();

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: error instanceof Error ? error.message : String(error),
              timestamp: new Date().toISOString(),
            }, null, 2),
          },
        ],
      };
    }
  }

  private async fetchOrders(limit: number = 50, status?: string): Promise<any> {
    if (!this.authToken) {
      throw new McpError(ErrorCode.InvalidRequest, 'Not authenticated. Call pln_authenticate first.');
    }

    try {
      const startTime = Date.now();
      
      const response = await axios.get(
        `${this.config.baseUrl}/product/sku/get-data-material-sidebar`,
        {
          headers: {
            'Authorization': `Bearer ${this.authToken}`,
            'Content-Type': 'application/json',
          },
          timeout: this.config.timeout,
        }
      );

      const responseTime = Date.now() - startTime;
      this.healthStatus.successCount++;
      this.healthStatus.responseTime = responseTime;
      this.healthStatus.lastCheck = new Date().toISOString();

      let orders = response.data.data?.content || [];
      
      // Filter by status if provided
      if (status) {
        orders = orders.filter((order: PLNOrder) => order.status === status);
      }

      // Limit results
      if (limit > 0) {
        orders = orders.slice(0, limit);
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              totalOrders: orders.length,
              responseTime: `${responseTime}ms`,
              orders: orders,
              timestamp: new Date().toISOString(),
            }, null, 2),
          },
        ],
      };
    } catch (error) {
      this.healthStatus.errorCount++;
      this.healthStatus.isHealthy = false;

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: error instanceof Error ? error.message : String(error),
              timestamp: new Date().toISOString(),
            }, null, 2),
          },
        ],
      };
    }
  }

  private async healthCheck(): Promise<any> {
    try {
      const startTime = Date.now();
      
      // Test basic connectivity
      const response = await axios.get(`${this.config.baseUrl}/health`, {
        timeout: 5000,
      });

      const responseTime = Date.now() - startTime;
      const isHealthy = response.status === 200;

      this.healthStatus = {
        ...this.healthStatus,
        isHealthy,
        responseTime,
        lastCheck: new Date().toISOString(),
      };

      if (isHealthy) {
        this.healthStatus.successCount++;
      } else {
        this.healthStatus.errorCount++;
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              ...this.healthStatus,
              endpoint: `${this.config.baseUrl}/health`,
              status: isHealthy ? 'healthy' : 'unhealthy',
            }, null, 2),
          },
        ],
      };
    } catch (error) {
      this.healthStatus.errorCount++;
      this.healthStatus.isHealthy = false;
      this.healthStatus.lastCheck = new Date().toISOString();

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              ...this.healthStatus,
              error: error instanceof Error ? error.message : String(error),
              status: 'unhealthy',
            }, null, 2),
          },
        ],
      };
    }
  }

  private async getOrderDetails(orderId: string): Promise<any> {
    if (!this.authToken) {
      throw new McpError(ErrorCode.InvalidRequest, 'Not authenticated. Call pln_authenticate first.');
    }

    try {
      const startTime = Date.now();
      
      const response = await axios.get(
        `${this.config.baseUrl}/orders/${orderId}`,
        {
          headers: {
            'Authorization': `Bearer ${this.authToken}`,
            'Content-Type': 'application/json',
          },
          timeout: this.config.timeout,
        }
      );

      const responseTime = Date.now() - startTime;

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              orderId,
              responseTime: `${responseTime}ms`,
              orderDetails: response.data,
              timestamp: new Date().toISOString(),
            }, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              orderId,
              error: error instanceof Error ? error.message : String(error),
              timestamp: new Date().toISOString(),
            }, null, 2),
          },
        ],
      };
    }
  }

  private async startMonitoring(interval: string = '*/5 * * * *'): Promise<any> {
    try {
      if (this.monitoringEnabled) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: false,
                message: 'Monitoring is already running',
                interval,
              }, null, 2),
            },
          ],
        };
      }

      cron.schedule(interval, async () => {
        await this.healthCheck();
        console.log(`[${new Date().toISOString()}] PLN Marketplace health check completed`);
      });

      this.monitoringEnabled = true;

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              message: 'Monitoring started successfully',
              interval,
              nextCheck: 'Every 5 minutes',
              timestamp: new Date().toISOString(),
            }, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: error instanceof Error ? error.message : String(error),
            }, null, 2),
          },
        ],
      };
    }
  }

  private async stopMonitoring(): Promise<any> {
    this.monitoringEnabled = false;
    // Stop all cron tasks
    const tasks = cron.getTasks();
    tasks.forEach(task => {
      if (task && typeof task.stop === 'function') {
        task.stop();
      }
    });

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            message: 'Monitoring stopped successfully',
            timestamp: new Date().toISOString(),
          }, null, 2),
        },
      ],
    };
  }

  private async getMetrics(): Promise<any> {
    const uptime = process.uptime();
    const memoryUsage = process.memoryUsage();

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            apiHealth: this.healthStatus,
            serverMetrics: {
              uptime: `${Math.floor(uptime / 60)} minutes`,
              memoryUsage: {
                rss: `${Math.round(memoryUsage.rss / 1024 / 1024)} MB`,
                heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)} MB`,
                heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)} MB`,
              },
            },
            monitoring: {
              enabled: this.monitoringEnabled,
              authenticated: !!this.authToken,
            },
            timestamp: new Date().toISOString(),
          }, null, 2),
        },
      ],
    };
  }

  private async testEndpoint(endpoint: string, method: string = 'GET', data?: any): Promise<any> {
    try {
      const startTime = Date.now();
      const url = endpoint.startsWith('http') ? endpoint : `${this.config.baseUrl}${endpoint}`;
      
      const config: any = {
        method,
        url,
        timeout: this.config.timeout,
      };

      if (this.authToken) {
        config.headers = {
          'Authorization': `Bearer ${this.authToken}`,
          'Content-Type': 'application/json',
        };
      }

      if (data && (method === 'POST' || method === 'PUT')) {
        config.data = data;
      }

      const response = await axios(config);
      const responseTime = Date.now() - startTime;

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              endpoint: url,
              method,
              statusCode: response.status,
              responseTime: `${responseTime}ms`,
              headers: response.headers,
              data: response.data,
              timestamp: new Date().toISOString(),
            }, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              endpoint,
              method,
              error: error instanceof Error ? error.message : String(error),
              timestamp: new Date().toISOString(),
            }, null, 2),
          },
        ],
      };
    }
  }

  private setupErrorHandling(): void {
    this.server.onerror = (error) => {
      console.error('[MCP Error]', error);
    };

    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('PLN Marketplace MCP Server running on stdio');
  }
}

const server = new PLNMarketplaceMCPServer();
server.run().catch(console.error);

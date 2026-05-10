/**
 * Minimal MCP stdio server helper.
 *
 * Handles the subset of JSON-RPC 2.0 MCP protocol that stub servers need:
 *   - initialize
 *   - tools/list
 *   - tools/call
 *
 * Usage:
 *   import { createServer } from '../_lib/mcp-stdio.js';
 *   createServer({
 *     name: 'shopify',
 *     version: '0.1.0',
 *     tools: {
 *       get_orders: {
 *         description: 'List recent orders',
 *         inputSchema: { type: 'object', properties: { limit: { type: 'number' } } },
 *         handler: async ({ limit = 10 }) => ({ orders: [...] }),
 *       },
 *     },
 *   });
 */

import readline from 'node:readline';

function respond(id, result) {
  process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id, result }) + '\n');
}

function error(id, code, message) {
  process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id, error: { code, message } }) + '\n');
}

export function createServer({ name, version = '0.1.0', tools = {} }) {
  const rl = readline.createInterface({ input: process.stdin, terminal: false });

  rl.on('line', async (line) => {
    let msg;
    try {
      msg = JSON.parse(line);
    } catch {
      return;
    }

    const { id, method, params } = msg;

    try {
      if (method === 'initialize') {
        return respond(id, {
          protocolVersion: '2024-11-05',
          capabilities: { tools: {} },
          serverInfo: { name, version },
        });
      }

      if (method === 'tools/list') {
        return respond(id, {
          tools: Object.entries(tools).map(([toolName, def]) => ({
            name: toolName,
            description: def.description || '',
            inputSchema: def.inputSchema || { type: 'object', properties: {} },
          })),
        });
      }

      if (method === 'tools/call') {
        const toolName = params?.name;
        const args = params?.arguments || {};
        const tool = tools[toolName];
        if (!tool) return error(id, -32601, `Unknown tool: ${toolName}`);
        const result = await tool.handler(args);
        return respond(id, {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        });
      }

      // notifications/initialized and similar — no response needed
      if (id === undefined) return;

      error(id, -32601, `Method not found: ${method}`);
    } catch (e) {
      error(id, -32603, e.message || String(e));
    }
  });

  process.stderr.write(`[mcp-${name}] ready (brand=${process.env.BRAND || 'unknown'})\n`);
}

export function mockRng(seedKey) {
  // Simple deterministic PRNG from string seed
  let h = 2166136261;
  for (let i = 0; i < seedKey.length; i++) {
    h = Math.imul(h ^ seedKey.charCodeAt(i), 16777619);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  };
}

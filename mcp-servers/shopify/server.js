#!/usr/bin/env node
/**
 * Shopify MCP Server — stub.
 *
 * Tools:
 *   - get_orders(limit, since)
 *   - get_products()
 *   - get_inventory()
 *   - get_revenue_summary(date)
 *   - get_subscriptions()
 *
 * TODO: vervang mock met Shopify Admin GraphQL API calls.
 */

import { createServer, mockRng } from '../_lib/mcp-stdio.js';

const BRAND = process.env.BRAND || 'unknown';
const STORE_URL = process.env.SHOPIFY_STORE_URL || '';
const ADMIN_TOKEN = process.env.SHOPIFY_ADMIN_TOKEN || '';
const USE_MOCK = !(STORE_URL && ADMIN_TOKEN);

const ORNEXIS_SKUS = [
  { sku: 'ORN-EMS-01', name: 'EMS Trilvoetplaat V1', price: 149.00 },
  { sku: 'ORN-EMS-02', name: 'EMS Trilvoetplaat Pro', price: 199.00 },
];
const TRYORG_SKUS = [
  { sku: 'TRY-ORE-60', name: 'Oregano Oil 60ct', price: 39.95 },
  { sku: 'TRY-ORE-120', name: 'Oregano Oil 120ct', price: 69.95 },
  { sku: 'TRY-ORE-SUB', name: 'Oregano Monthly Sub', price: 34.95 },
];
const SKUS = BRAND === 'ornexis' ? ORNEXIS_SKUS : TRYORG_SKUS;

createServer({
  name: `shopify-${BRAND}`,
  tools: {
    get_orders: {
      description: 'List recent orders with financial status',
      inputSchema: {
        type: 'object',
        properties: {
          limit: { type: 'number', default: 20 },
          since: { type: 'string', description: 'ISO date' },
        },
      },
      handler: async ({ limit = 20, since = new Date(Date.now() - 86400000).toISOString() }) => {
        if (!USE_MOCK) throw new Error('Live Shopify API niet geïmplementeerd');
        const rng = mockRng(`orders-${since}`);
        const orders = Array.from({ length: Math.min(limit, Math.floor(rng() * 30) + 10) }, (_, i) => {
          const sku = SKUS[Math.floor(rng() * SKUS.length)];
          return {
            id: `gid://shopify/Order/${1000000 + i}`,
            order_number: `#${20000 + i}`,
            email: `customer${i}@example.com`,
            created_at: new Date(Date.now() - rng() * 86400000).toISOString(),
            financial_status: rng() > 0.05 ? 'paid' : 'pending',
            fulfillment_status: rng() > 0.2 ? 'fulfilled' : 'unfulfilled',
            total_price: sku.price,
            currency: 'EUR',
            line_items: [{ sku: sku.sku, quantity: 1, title: sku.name }],
          };
        });
        return { orders, _mock: true };
      },
    },
    get_products: {
      description: 'List all products and SKUs',
      inputSchema: { type: 'object', properties: {} },
      handler: async () => {
        if (!USE_MOCK) throw new Error('Live API niet geïmplementeerd');
        return { products: SKUS, _mock: true };
      },
    },
    get_inventory: {
      description: 'Current inventory levels per SKU',
      inputSchema: { type: 'object', properties: {} },
      handler: async () => {
        if (!USE_MOCK) throw new Error('Live API niet geïmplementeerd');
        const rng = mockRng('inventory');
        return {
          inventory: SKUS.map((s) => ({
            sku: s.sku,
            name: s.name,
            current_qty: Math.floor(rng() * 500) + 50,
            reorder_point: 100,
          })),
          _mock: true,
        };
      },
    },
    get_revenue_summary: {
      description: 'Revenue + orders summary for a specific date',
      inputSchema: {
        type: 'object',
        properties: { date: { type: 'string' } },
        required: ['date'],
      },
      handler: async ({ date }) => {
        if (!USE_MOCK) throw new Error('Live API niet geïmplementeerd');
        const rng = mockRng(`rev-${date}`);
        const orders = Math.floor(rng() * 80) + 40;
        const revenue = orders * (rng() * 40 + 55);
        return {
          date,
          orders_count: orders,
          revenue: Math.round(revenue * 100) / 100,
          transaction_fees: Math.round(revenue * 0.029 * 100) / 100,
          shipping_revenue: Math.round(orders * 5 * 100) / 100,
          refunds: Math.round(revenue * (rng() * 0.05) * 100) / 100,
          _mock: true,
        };
      },
    },
    get_subscriptions: {
      description: 'Active subscription data (TryOrganics especially)',
      inputSchema: { type: 'object', properties: {} },
      handler: async () => {
        if (!USE_MOCK) throw new Error('Live API niet geïmplementeerd');
        const rng = mockRng('subs');
        if (BRAND !== 'tryorganics') return { active: 0, note: 'No subscription model', _mock: true };
        return {
          active: Math.floor(rng() * 800) + 400,
          mrr: Math.round((Math.floor(rng() * 800) + 400) * 34.95 * 100) / 100,
          churn_rate_30d: Math.round(rng() * 0.08 * 1000) / 1000,
          dunning_success_rate: Math.round((0.4 + rng() * 0.4) * 1000) / 1000,
          _mock: true,
        };
      },
    },
  },
});

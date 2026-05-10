#!/usr/bin/env node
/**
 * Klaviyo MCP Server — stub.
 *
 * Tools:
 *   - get_flows()
 *   - get_flow_metrics(flow_id)
 *   - get_campaigns(limit)
 *   - get_campaign_metrics(campaign_id)
 *   - get_list_growth(days)
 *
 * TODO: vervang mock met Klaviyo API v2024-10-15+.
 */

import { createServer, mockRng } from '../_lib/mcp-stdio.js';

const BRAND = process.env.BRAND || 'unknown';
const PRIVATE_KEY = process.env.KLAVIYO_PRIVATE_KEY || '';
const USE_MOCK = !PRIVATE_KEY;

const FLOWS = [
  { id: 'flow_welcome', name: 'Welcome Series', type: 'welcome' },
  { id: 'flow_abandon', name: 'Abandoned Cart', type: 'abandon_cart' },
  { id: 'flow_post_purchase', name: 'Post Purchase', type: 'post_purchase' },
  { id: 'flow_winback', name: 'Win-back', type: 'winback' },
  { id: 'flow_browse', name: 'Browse Abandonment', type: 'browse_abandon' },
];

createServer({
  name: `klaviyo-${BRAND}`,
  tools: {
    get_flows: {
      description: 'List all active flows',
      inputSchema: { type: 'object', properties: {} },
      handler: async () => {
        if (!USE_MOCK) throw new Error('Live Klaviyo API niet geïmplementeerd');
        return { flows: FLOWS, _mock: true };
      },
    },
    get_flow_metrics: {
      description: 'Performance metrics voor een specifieke flow',
      inputSchema: {
        type: 'object',
        properties: { flow_id: { type: 'string' } },
        required: ['flow_id'],
      },
      handler: async ({ flow_id }) => {
        if (!USE_MOCK) throw new Error('Live API niet geïmplementeerd');
        const rng = mockRng(`flow-${flow_id}`);
        return {
          flow_id,
          sends: Math.floor(rng() * 15000) + 2000,
          opens: Math.floor(rng() * 8000) + 800,
          clicks: Math.floor(rng() * 2000) + 150,
          revenue: Math.round((rng() * 20000 + 1000) * 100) / 100,
          open_rate: Math.round((0.25 + rng() * 0.3) * 1000) / 1000,
          click_rate: Math.round((0.02 + rng() * 0.06) * 10000) / 10000,
          unsubscribe_rate: Math.round(rng() * 0.008 * 10000) / 10000,
          _mock: true,
        };
      },
    },
    get_campaigns: {
      description: 'Recent campaign metrics',
      inputSchema: {
        type: 'object',
        properties: { limit: { type: 'number', default: 10 } },
      },
      handler: async ({ limit = 10 }) => {
        if (!USE_MOCK) throw new Error('Live API niet geïmplementeerd');
        const rng = mockRng('campaigns');
        const campaigns = Array.from({ length: Math.min(limit, 8) }, (_, i) => ({
          id: `cmp_${i.toString().padStart(3, '0')}`,
          name: `Campaign ${i + 1}`,
          sent_at: new Date(Date.now() - i * 86400000 * 3).toISOString(),
          recipients: Math.floor(rng() * 20000) + 3000,
          open_rate: Math.round((0.22 + rng() * 0.25) * 1000) / 1000,
          click_rate: Math.round((0.015 + rng() * 0.04) * 10000) / 10000,
          revenue: Math.round(rng() * 8000 * 100) / 100,
        }));
        return { campaigns, _mock: true };
      },
    },
    get_campaign_metrics: {
      description: 'Detailed metrics voor specifieke campaign',
      inputSchema: {
        type: 'object',
        properties: { campaign_id: { type: 'string' } },
        required: ['campaign_id'],
      },
      handler: async ({ campaign_id }) => {
        if (!USE_MOCK) throw new Error('Live API niet geïmplementeerd');
        const rng = mockRng(`metrics-${campaign_id}`);
        return {
          campaign_id,
          recipients: Math.floor(rng() * 15000) + 2000,
          delivered: Math.floor(rng() * 14500) + 1950,
          opens: Math.floor(rng() * 6000) + 500,
          unique_opens: Math.floor(rng() * 5000) + 400,
          clicks: Math.floor(rng() * 1500) + 100,
          revenue: Math.round(rng() * 12000 * 100) / 100,
          unsubscribes: Math.floor(rng() * 50),
          _mock: true,
        };
      },
    },
    get_list_growth: {
      description: 'List subscriber growth over N days',
      inputSchema: {
        type: 'object',
        properties: { days: { type: 'number', default: 30 } },
      },
      handler: async ({ days = 30 }) => {
        if (!USE_MOCK) throw new Error('Live API niet geïmplementeerd');
        const rng = mockRng(`growth-${days}`);
        return {
          days,
          total_subscribers: Math.floor(rng() * 50000) + 10000,
          new_subscribers: Math.floor(rng() * 3000) + 200,
          unsubscribes: Math.floor(rng() * 800) + 50,
          net_growth: Math.floor(rng() * 2500),
          _mock: true,
        };
      },
    },
  },
});

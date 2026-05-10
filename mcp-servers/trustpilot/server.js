#!/usr/bin/env node
/**
 * Trustpilot MCP Server — stub.
 *
 * Tools:
 *   - get_new_reviews(since)
 *   - get_business_stats()
 *   - get_review(review_id)
 *
 * TODO: vervang mock met Trustpilot API v1.
 */

import { createServer, mockRng } from '../_lib/mcp-stdio.js';

const BRAND = process.env.BRAND || 'unknown';
const API_KEY = process.env.TRUSTPILOT_API_KEY || '';
const USE_MOCK = !API_KEY;

const MOCK_REVIEW_BODIES = [
  'Echt een gamechanger! Binnen een week verschil gemerkt.',
  'Product werkte niet voor mij, teleurstellend.',
  'Goede service, snelle levering, product doet wat beloofd.',
  'Kostte even wat tijd maar nu zeer tevreden.',
  'Verwachtte meer voor deze prijs.',
  'Fantastisch! Aanbevolen aan vrienden en familie.',
];

createServer({
  name: `trustpilot-${BRAND}`,
  tools: {
    get_new_reviews: {
      description: 'Reviews sinds een bepaalde datum',
      inputSchema: {
        type: 'object',
        properties: { since: { type: 'string', description: 'ISO date' } },
      },
      handler: async ({ since = new Date(Date.now() - 86400000).toISOString() }) => {
        if (!USE_MOCK) throw new Error('Live Trustpilot API niet geïmplementeerd');
        const rng = mockRng(`reviews-${since}`);
        const reviews = Array.from({ length: Math.floor(rng() * 8) + 2 }, (_, i) => ({
          id: `tp_${Math.floor(rng() * 1000000)}`,
          rating: Math.floor(rng() * 5) + 1,
          title: `Review ${i + 1}`,
          body: MOCK_REVIEW_BODIES[Math.floor(rng() * MOCK_REVIEW_BODIES.length)],
          author: `Customer ${Math.floor(rng() * 1000)}`,
          created_at: new Date(Date.now() - rng() * 86400000 * 3).toISOString(),
          verified: rng() > 0.2,
        }));
        return { reviews, _mock: true };
      },
    },
    get_business_stats: {
      description: 'Aggregated Trustpilot score + volume',
      inputSchema: { type: 'object', properties: {} },
      handler: async () => {
        if (!USE_MOCK) throw new Error('Live API niet geïmplementeerd');
        const rng = mockRng('stats');
        return {
          trust_score: Math.round((4.0 + rng() * 0.9) * 10) / 10,
          total_reviews: Math.floor(rng() * 2000) + 300,
          rating_distribution: {
            5: Math.floor(rng() * 60) + 30,
            4: Math.floor(rng() * 25) + 15,
            3: Math.floor(rng() * 15) + 5,
            2: Math.floor(rng() * 10) + 2,
            1: Math.floor(rng() * 8) + 2,
          },
          _mock: true,
        };
      },
    },
    get_review: {
      description: 'Volledig review detail',
      inputSchema: {
        type: 'object',
        properties: { review_id: { type: 'string' } },
        required: ['review_id'],
      },
      handler: async ({ review_id }) => {
        if (!USE_MOCK) throw new Error('Live API niet geïmplementeerd');
        const rng = mockRng(`r-${review_id}`);
        return {
          id: review_id,
          rating: Math.floor(rng() * 5) + 1,
          body: MOCK_REVIEW_BODIES[Math.floor(rng() * MOCK_REVIEW_BODIES.length)],
          author: `Customer ${Math.floor(rng() * 1000)}`,
          has_response: rng() > 0.5,
          _mock: true,
        };
      },
    },
  },
});

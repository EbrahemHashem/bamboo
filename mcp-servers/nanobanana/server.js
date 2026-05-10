#!/usr/bin/env node
/**
 * NanoBanana (Gemini 3.1 Flash Image) MCP Server — stub.
 *
 * Tools:
 *   - generate_image(prompt, aspect_ratio, style)
 *   - remake_image(reference_url, context_prompt)
 *   - upscale_image(image_url, target_resolution)
 *
 * Important: NOOIT tekst direct in prompt — text-in-image = two-stage
 * (clean image from this server, text overlay via FFmpeg in skill).
 *
 * TODO: integreer met echte NanoBanana API + Gemini 3 Flash Image endpoint.
 */

import { createServer, mockRng } from '../_lib/mcp-stdio.js';

const API_KEY = process.env.NANOBANANA_API_KEY || '';
const USE_MOCK = !API_KEY;

createServer({
  name: 'nanobanana',
  tools: {
    generate_image: {
      description: 'Generate clean image (geen tekst — text komt via overlay in skill)',
      inputSchema: {
        type: 'object',
        properties: {
          prompt: { type: 'string' },
          aspect_ratio: { type: 'string', enum: ['1:1', '4:5', '9:16', '16:9'], default: '1:1' },
          style: { type: 'string', description: 'natural | product | lifestyle | avatar-native' },
          seed: { type: 'number' },
        },
        required: ['prompt'],
      },
      handler: async ({ prompt, aspect_ratio = '1:1', style = 'natural', seed }) => {
        if (!USE_MOCK) throw new Error('Live NanoBanana API niet geïmplementeerd');
        // Warn if prompt contains text instructions (common anti-pattern)
        const textWarnings = [];
        if (/text|write|caption|headline|title/i.test(prompt)) {
          textWarnings.push(
            'WARN: Prompt vraagt om text-in-image. Gebruik two-stage (clean image + FFmpeg overlay) ipv tekst in prompt.'
          );
        }
        const rng = mockRng(prompt + String(seed || ''));
        return {
          image_url: `https://mock.nanobanana.dev/${Math.floor(rng() * 1000000)}.png`,
          width: aspect_ratio === '9:16' ? 1080 : aspect_ratio === '16:9' ? 1920 : 1080,
          height: aspect_ratio === '9:16' ? 1920 : aspect_ratio === '16:9' ? 1080 : 1080,
          style,
          seed: seed || Math.floor(rng() * 1000000),
          warnings: textWarnings,
          _mock: true,
        };
      },
    },
    remake_image: {
      description: 'Remake reference image in new context (voor FFC visual rewrites)',
      inputSchema: {
        type: 'object',
        properties: {
          reference_url: { type: 'string' },
          context_prompt: { type: 'string', description: 'Brand + avatar context om in te remaken' },
          aspect_ratio: { type: 'string', default: '1:1' },
        },
        required: ['reference_url', 'context_prompt'],
      },
      handler: async ({ reference_url, context_prompt, aspect_ratio = '1:1' }) => {
        if (!USE_MOCK) throw new Error('Live API niet geïmplementeerd');
        const rng = mockRng(reference_url + context_prompt);
        return {
          image_url: `https://mock.nanobanana.dev/remake/${Math.floor(rng() * 1000000)}.png`,
          reference: reference_url,
          aspect_ratio,
          _mock: true,
        };
      },
    },
    upscale_image: {
      description: 'Upscale low-res naar target resolution',
      inputSchema: {
        type: 'object',
        properties: {
          image_url: { type: 'string' },
          target_resolution: { type: 'number', default: 2048 },
        },
        required: ['image_url'],
      },
      handler: async ({ image_url, target_resolution = 2048 }) => {
        if (!USE_MOCK) throw new Error('Live API niet geïmplementeerd');
        return {
          image_url: image_url.replace('.png', `_${target_resolution}.png`),
          resolution: target_resolution,
          _mock: true,
        };
      },
    },
  },
});

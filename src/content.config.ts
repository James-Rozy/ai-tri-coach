import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const prompts = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/prompts' }),
  schema: z.object({
    title: z.string(),
    order: z.number(),
    summary: z.string(),
    // "free" ships in the starter kit; "paid" stays behind the membership later.
    tier: z.enum(['free', 'paid']).default('free'),
    useWhen: z.string(),
    // Short filled-in fragments that show the prompt works beyond triathlon.
    examples: z.array(z.string()).default([]),
  }),
});

export const collections = { prompts };

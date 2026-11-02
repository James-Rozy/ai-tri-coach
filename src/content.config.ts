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

// "My Progress" posts: one markdown file per update, newest first on /progress/.
const updates = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/updates' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    phase: z.enum(['Race', 'Off-season', 'Base', 'Build', 'Taper']),
    summary: z.string(),
    // Optional numbers shown as a timing board above the post.
    stats: z.array(z.object({ label: z.string(), value: z.string() })).default([]),
    // A race result: one row per leg, rendered as splits.
    splits: z
      .array(z.object({ leg: z.enum(['Swim', 'T1', 'Bike', 'T2', 'Run']), time: z.string(), note: z.string().default('') }))
      .optional(),
    video: z.string().url().optional(),
  }),
});

export const collections = { prompts, updates };

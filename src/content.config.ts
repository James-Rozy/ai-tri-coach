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

// Weekly training posts on /training/ and in the newsletter: one file per week, named for its Monday.
// `plan` and `review` are drafted by scripts/week-draft.mjs from Intervals.icu; the body is the reasoning.
const sport = z.enum(['Swim', 'Bike', 'Run', 'Strength', 'Polo', 'Rest', 'Travel', 'Other']);
const weeks = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/weeks' }),
  schema: z.object({
    week: z.coerce.date(),
    phase: z.enum(['Off-season', 'Base', 'Build', 'Taper', 'Race']),
    title: z.string(),
    summary: z.string(),
    plan: z.array(
      z.object({
        day: z.enum(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']),
        date: z.coerce.date().optional(),
        sport,
        session: z.string(),
        minutes: z.number().optional(),
        note: z.string().optional(),
      }),
    ),
    // Last week, honestly: every planned session and what happened to it.
    review: z
      .object({
        items: z.array(
          z.object({
            day: z.enum(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']),
            sport,
            session: z.string(),
            minutes: z.number().optional(),
            actualMinutes: z.number().optional(),
            status: z.enum(['done', 'missed', 'swapped', 'extra', 'rest']),
            note: z.string().optional(),
          }),
        ),
        plannedMinutes: z.number(),
        doneMinutes: z.number(),
      })
      .optional(),
    video: z.string().url().optional(),
  }),
});

export const collections = { prompts, updates, weeks };

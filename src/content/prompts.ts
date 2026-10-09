export type Tier = 'free' | 'paid';

export interface Prompt {
  id: string;
  title: string;
  order: number;
  summary: string;
  useWhen: string;
  /** "free" ships in the starter kit; "paid" stays behind the membership later. */
  tier: Tier;
  /** Markdown body: the prompt text itself. */
  body: string;
}

// Each prompt is a markdown file with simple `key: value` frontmatter, bundled at build time.
const files = import.meta.glob<string>('./prompts/*.md', { query: '?raw', import: 'default', eager: true });

function parse(path: string, raw: string): Prompt {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) throw new Error(`Missing frontmatter in ${path}`);
  const [, front, body] = match;
  const data: Record<string, string> = {};
  for (const line of front.split('\n')) {
    const i = line.indexOf(':');
    if (i > 0) data[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  for (const key of ['title', 'order', 'summary', 'useWhen']) {
    if (!data[key]) throw new Error(`${path} is missing "${key}"`);
  }
  return {
    id: path.split('/').pop()!.replace(/\.md$/, ''),
    title: data.title,
    order: Number(data.order),
    summary: data.summary,
    useWhen: data.useWhen,
    tier: data.tier === 'paid' ? 'paid' : 'free',
    body: body.trim(),
  };
}

export const prompts: Prompt[] = Object.entries(files)
  .map(([path, raw]) => parse(path, raw))
  .sort((a, b) => a.order - b.order);

export const freePrompts = prompts.filter((p) => p.tier === 'free');

export function getFreePrompt(id: string | undefined): Prompt | undefined {
  return freePrompts.find((p) => p.id === id);
}

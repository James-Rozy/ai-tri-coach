# ai-tri-coach (React version)

Site for the AI self-coaching prompt library: a free starter kit now, a paid membership later. The repo name is a placeholder until the site has a name.

This branch is the React + TypeScript take on the same site as the Astro draft (PR #1), so the two can be compared side by side. Same pages, same prompt content, same CSS.

## Run it

```sh
npm install
npm run dev      # http://localhost:5173
npm run build    # type-checks, then builds to dist/
npm run preview  # serves the production build
```

## Stack

Vite 8, React 19, React Router 8, TypeScript 7, CSS Modules. Prompt bodies render with `react-markdown`.

## Layout

| Path | What it is |
| --- | --- |
| `src/content/prompts/*.md` | One file per prompt. Frontmatter: `title`, `order`, `summary`, `useWhen`, `tier` (`free` or `paid`). Body is the prompt text. |
| `src/content/prompts.ts` | Bundles the markdown at build time with `import.meta.glob` and parses the frontmatter. |
| `src/main.tsx` | Routes: `/`, `/kit`, `/prompts/:id`, and a 404. |
| `src/pages/` | Home, Kit, PromptPage, NotFound. |
| `src/components/` | Layout, PromptCard, PromptText, CopyButton, Signup, Disclaimer. Each has a `.module.css`. |
| `src/styles/global.css` | Cascade layers, OKLCH tokens with `light-dark()`, swim/bike/run colors. |

Page titles and meta descriptions use React 19's built-in `<title>`/`<meta>` hoisting. Prompt cards morph into their prompt page through `<Link viewTransition>` and a shared `view-transition-name`.

## Differences from the Astro version

- It's a client-rendered single-page app. The HTML is an empty `<div id="root">` until JavaScript runs, so search engines and link previews see less unless we add prerendering later.
- It ships ~139 KB of gzipped JS on every page. The Astro build ships almost none.
- View transitions run through React Router (same-document) instead of the browser's native cross-document transitions.
- Hosting needs a rewrite of every path to `index.html` so deep links like `/prompts/race-debrief` load.

## Open items

- Signup form is disabled until an email provider is picked.
- Stripe, logins and paid prompts wait for the paid tier (planned ~Feb 2027).
- The scroll-driven swim/bike/run course line on the home page (TODO in `src/pages/Home.tsx`).

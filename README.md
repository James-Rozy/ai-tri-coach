# Split Decisions

Site for Split Decisions, the AI self-coaching prompt library: a free starter kit now. The repo name `ai-tri-coach` is left over from before the name was picked.

## Run it

```sh
npm install
npm run dev      # http://localhost:4321
npm run build    # static output in dist/
```

## Layout

| Path | What it is |
| --- | --- |
| `src/content/prompts/*.md` | One file per prompt. Frontmatter: `title`, `order`, `summary`, `useWhen`, `tier` (`free` or `paid`). Body is the prompt text. |
| `src/content.config.ts` | Schema for the prompts collection. |
| `src/pages/index.astro` | Landing page: hero, "where the 23 minutes went", kit cards, signup. |
| `src/pages/kit/index.astro` | The full free starter kit with copy buttons. |
| `src/pages/prompts/[id].astro` | One page per free prompt. Paid prompts get no public page. |
| `src/styles/global.css` | Cascade layers, OKLCH tokens with `light-dark()`, swim/bike/run colors. |

Already wired: native cross-document view transitions (`@view-transition`), with prompt cards morphing into their prompt page through a shared `view-transition-name`, plus reduced-motion handling.

## React components

The React integration (`@astrojs/react`) is on, so interactive pieces can be written as `.tsx` components and used in any `.astro` page. A React component renders to static HTML and ships no JS unless you give it a `client:*` directive (`client:visible`, `client:load`, `client:idle`), so only the interactive islands cost anything.

## Open items

- Signup form is disabled until an email provider is picked.
- Stripe, logins and paid prompts wait for the paid tier (planned ~Feb 2027).
- The scroll-driven swim/bike/run course line on the home page (TODO in `index.astro`).

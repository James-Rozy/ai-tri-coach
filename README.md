# Split Decisions

Site for Split Decisions: a free guide to setting up your own AI coach, my training progress, and custom watch faces. The repo name `ai-tri-coach` is left over from before the name was picked.

## Run it

```sh
npm install
npm run dev      # http://localhost:4321
npm run build    # static output in dist/
```

## Layout

| Path | What it is |
| --- | --- |
| `src/pages/index.astro` | Homepage: hero with the "course map" board of site sections, how it works, guide, progress, watch faces and about teasers, signup. |
| `src/pages/guide/index.astro` | The free guide (four prompts + setup). `/kit/` redirects here. |
| `src/pages/progress/index.astro` | My Progress: season line plus every update, newest first. |
| `src/content/updates/*.md` | One file per progress update. Frontmatter: `title`, `date`, `phase`, `summary`, optional `stats`, `splits`, `video`. |
| `src/pages/about.astro`, `newsletter.astro`, `watch-faces.astro` | About, newsletter signup, watch faces. |
| `src/data/watchFaces.ts` | Every watch face on `/watch-faces/`. Flip `status` to `available` and add `storeUrl` when a store listing goes live. |
| `src/data/season.ts` | The season phases drawn by `SeasonLine.astro`. |
| `src/components/watchface/` | React island: the live SD Digital Tri preview, ported from the watch face mockup's canvas code. |
| `src/components/Logo.astro` | The LCD logo: "SD" in segment digits, same geometry as the watch face. `public/favicon.svg` is the same mark. |
| `src/content/prompts/*.md` | One file per prompt. Frontmatter: `title`, `order`, `summary`, `useWhen`, `tier` (`free` or `paid`). Body is the prompt text. |
| `src/styles/global.css` | Cascade layers, OKLCH tokens, swim/bike/run colors, the shared `.button`. |

Already wired: native cross-document view transitions (`@view-transition`), with prompt cards morphing into their prompt page through a shared `view-transition-name`, plus reduced-motion handling.

## React components

The React integration (`@astrojs/react`) is on, so interactive pieces can be written as `.tsx` components and used in any `.astro` page. A React component renders to static HTML and ships no JS unless you give it a `client:*` directive (`client:visible`, `client:load`, `client:idle`), so only the interactive islands cost anything.

## Open items

- Signup form is disabled until an email provider is picked.
- Stripe, logins and paid prompts wait for the paid tier (planned ~Feb 2027).
- Connect IQ Store link for SD Digital Tri once it's published.

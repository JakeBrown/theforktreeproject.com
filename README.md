# Astro Starter Kit: Minimal

```sh
npm create astro@latest -- --template minimal
```

> 🧑‍🚀 **Seasoned astronaut?** Delete this file. Have fun!

## 🚀 Project Structure

Inside of your Astro project, you'll see the following folders and files:

```text
/
├── public/
├── src/
│   └── pages/
│       └── index.astro
└── package.json
```

Astro looks for `.astro` or `.md` files in the `src/pages/` directory. Each page is exposed as a route based on its file name.

There's nothing special about `src/components/`, but that's where we like to put any Astro/React/Vue/Svelte/Preact components.

Any static assets, like images, can be placed in the `public/` directory.

## 🧞 Commands

All commands are run from the root of the project, from a terminal:

| Command                   | Action                                           |
| :------------------------ | :----------------------------------------------- |
| `npm install`             | Installs dependencies                            |
| `npm run dev`             | Starts local dev server at `localhost:4321`      |
| `npm run build`           | Build your production site to `./dist/`          |
| `npm run preview`         | Preview your build locally, before deploying     |
| `npm run astro ...`       | Run CLI commands like `astro add`, `astro check` |
| `npm run astro -- --help` | Get help using the Astro CLI                     |

## Journal semantic search

The journal search uses Cloudflare Workers AI embeddings plus Vectorize. A daily cron (`17 3 * * *`) reindexes bundled journal markdown into the `forktree-journal` Vectorize index.

One-time Cloudflare setup required before the binding can deploy successfully:

```sh
npx wrangler vectorize create forktree-journal --dimensions=768 --metric=cosine
```

Optional but recommended: add a KV binding named `JOURNAL_SEARCH_KV` in Cloudflare to store the indexed content version and last cron result. Without it, the cron will still upsert the current journal version daily.

Runtime bindings used by search:

- `AI` — Workers AI binding
- `JOURNAL_VECTORIZE` — Vectorize index binding
- `JOURNAL_SEARCH_KV` — optional KV binding for index state

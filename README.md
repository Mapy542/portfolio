# Portfolio (SvelteKit)

A lightweight SvelteKit site that renders a portfolio of projects from Markdown files. Content lives in `src/lib/data`, is loaded at build time with `import.meta.glob(..., { query: '?raw' })`, and metadata is parsed from simple front‑matter style lines.

## Tech stack

- SvelteKit v2 + Vite 7
- Node adapter (`@sveltejs/adapter-node`) for deployment
- TypeScript tooling and `svelte-check`
- ESLint + Prettier
- highlight.js for code blocks

## Content model

Markdown files are organized by category under `src/lib/data/<Category>/<Post>.md`. Metadata is declared using single‑line pragmas at the top of each file and parsed by `src/lib/components/docMetaStripper.js` via `serverReader`:

- `#! title: <Title>`
- `#! date: YYYY-MM-DD` (optional)
- `#! tags: tag1, tag2` (optional)
- `#! author: <Name>` (optional)
- `#! image: /img/...` (optional)
- `#! description: <Short summary>` (optional)

Example link to a post from metadata: the loader builds links like `/Akron/Brandee` from the file path `/src/lib/data/Akron/Brandee.md`.

## Routing overview

- `/` — Homepage. Picks two random posts and shows cards (title, description, image) using metadata.
- `/[category]` — Category page listing posts in that category.
- `/[category]/[post]` — Individual post page (Markdown rendered with custom parsers under `src/lib/components/`).
- `/all-projects` — All posts across all categories.
- `/search` — Search UI and server endpoints under `routes/search/` and `routes/api/search/`.
- `/sitemap.xml` — Static sitemap endpoint.

Components under `src/lib/components` include Markdown parsing helpers (`MarkdownParser.svelte`, `mdBasicParser.svelte`, `mdCodeParser.svelte`, etc.), media helpers (`DynaImage.svelte`, `DynaVideo.svelte`, `DynaGallery.svelte`), and layout (`Header.svelte`, `Footer.svelte`).

## Getting started

Install dependencies and start the dev server:

```powershell
npm install
npm run dev
```

Open the URL printed by Vite (typically http://localhost:5173).

Type checking and linting:

```powershell
npm run check
npm run lint
npm run format
```

## Build and preview

Create a production build and preview it locally:

```powershell
npm run build
npm run preview
```

## Deploy (Node adapter)

This project uses `@sveltejs/adapter-node`. After building, start the server with Node in your target environment:

```powershell
npm run build
node build
```

The output directory is `build/` and includes a self‑contained Node server.

## Project scripts (package.json)

- `dev` — Vite dev server
- `build` — Vite/SvelteKit production build
- `preview` — Preview the production build
- `check` / `check:watch` — `svelte-check` for types and diagnostics
- `lint` — ESLint + Prettier (check only)
- `format` — Prettier write

## Asset tools

Utility scripts help prepare media assets.

- Images: `src/img/0ImgResize.py` — Convert images (jpg/png/jpeg/gif) to WebP in place.
  - Uses Pillow. Walks the script folder and its immediate subfolders.
  - Deletes originals after successful conversion.
  - Run (PowerShell):
    - `python .\src\img\0ImgResize.py`

- Video: `src/vid/0MovToWebM.py` — Convert `.mov` videos to compressed `.webm` (VP9 + Opus).
  - Requires ffmpeg on PATH (Windows builds: https://www.gyan.dev/ffmpeg/builds/). Add `ffmpeg\bin` to PATH.
  - Scans the script folder and its immediate subfolders; replaces spaces in filenames with dashes.
  - Deletes originals after successful conversion (configurable via env var below).
  - Config via environment variables:
    - `WEBM_CRF` — VP9 quality (default `32`, lower is higher quality/larger files)
    - `WEBM_CPU_USED` — Speed/quality tradeoff for VP9 (default `4`, `0` best/slowest → `5` fastest)
    - `WEBM_AUDIO_BITRATE` — Opus bitrate (default `96k`)
    - `WEBM_DELETE_ORIGINALS` — `1` to delete originals (default), `0` to keep
  - Run examples (PowerShell):
    - `python .\src\vid\0MovToWebM.py`
    - `$env:WEBM_CRF=30; python .\src\vid\0MovToWebM.py`
    - `$env:WEBM_DELETE_ORIGINALS=0; python .\src\vid\0MovToWebM.py`

## Notes

- `svelte.config.js` sets permissive prerender error handling and uses `modulepreload` output.
- Fonts and images are under `src/fonts` and `src/img`; additional static assets live in `static/`.

## Licensing

- Code (everything in this repo except the content folders listed below) is licensed under the MIT License. See `LICENSE`.
- Content assets are NOT open-licensed and are All Rights Reserved:
  - `src/lib/data/**` (Markdown posts and textual content)
  - `src/lib/img/**` (images, graphics, diagrams)
  - `src/lib/vid/**` (videos and motion content)

See `CONTENT-LICENSE` for details. Do not copy, redistribute, or reuse the content assets without explicit permission.

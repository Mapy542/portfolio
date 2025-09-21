# create-svelte

Everything you need to build a Svelte project, powered by [`create-svelte`](https://github.com/sveltejs/kit/tree/main/packages/create-svelte).

## Creating a project

If you're seeing this, you've probably already done this step. Congrats!

```bash
# create a new project in the current directory
npm create svelte@latest

# create a new project in my-app
npm create svelte@latest my-app
```

## Developing

Once you've created a project and installed dependencies with `npm install` (or `pnpm install` or `yarn`), start a development server:

```bash
npm run dev

# or start the server and open the app in a new browser tab
npm run dev -- --open
```

## Building

To create a production version of your app:

```bash
npm run build
```

You can preview the production build with `npm run preview`.

> To deploy your app, you may need to install an [adapter](https://kit.svelte.dev/docs/adapters) for your target environment.

## Asset tools

Utility scripts live under `src/lib/img/` to help prepare media assets.

- `0ImgResize.py` — Convert images (jpg/png/jpeg/gif) to WebP in-place.

  - Uses Pillow. Runs through the script folder and its immediate subfolders.
  - Deletes originals after successful conversion.
  - Run:
    - PowerShell: `python .\src\lib\img\0ImgResize.py`

- `0MovToWebM.py` — Convert `.mov` videos to compressed `.webm` (VP9 + Opus).
  - Requires ffmpeg on PATH (Windows builds: https://www.gyan.dev/ffmpeg/builds/). Add `ffmpeg\bin` to PATH.
  - Scans the script folder and its immediate subfolders; replaces spaces in filenames with dashes.
  - Deletes originals after successful conversion (configurable via env var below).
  - Config via environment variables:
    - `WEBM_CRF` — VP9 quality (default `32`, lower is higher quality/larger files)
    - `WEBM_CPU_USED` — Speed/quality tradeoff for VP9 (default `4`, `0` best/slowest → `5` fastest)
    - `WEBM_AUDIO_BITRATE` — Opus bitrate (default `96k`)
    - `WEBM_DELETE_ORIGINALS` — `1` to delete originals (default), `0` to keep
  - Run examples (PowerShell):
    - `python .\src\lib\img\0MovToWebM.py`
    - `$env:WEBM_CRF=30; python .\src\lib\img\0MovToWebM.py`
    - `$env:WEBM_DELETE_ORIGINALS=0; python .\src\lib\img\0MovToWebM.py`

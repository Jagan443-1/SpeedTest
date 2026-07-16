# SpeedTest

A browser-based internet speed test with a digital meter UI, built with React, TypeScript, and Vite.

Measures download speed, upload speed, ping latency, and jitter using a Cloudflare Worker API backend.

## Features

- Digital meter display with 30-segment color-coded bar
- Light/dark/system theme toggle with CSS variables
- 10-second download and upload tests with 8 parallel connections
- 20-sample ping measurement with jitter calculation

## Stack

- **Frontend**: React 19, TypeScript 6, Vite 8
- **Backend**: Cloudflare Worker (download, upload, ping endpoints)
- **Hosting**: Cloudflare Pages (frontend), Cloudflare Workers (API)

## Development

```bash
npm install
npm run dev
```

## Deployment

**Frontend** (Cloudflare Pages):

```bash
npm run build
wrangler pages deploy dist --project-name speedtest
```

**API Worker** (Cloudflare Workers):

```bash
wrangler deploy --config server/wrangler.json
```

> **Note**: Do not use `wrangler deploy` without `--config server/wrangler.json` — the auto-generated `dist/wrangler.json` from Pages deploys will intercept it.

## URLs

- Frontend: https://speedtest-3ws.pages.dev
- API: https://speed-api.livid.workers.dev

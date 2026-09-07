# Whaley Christmas

A shared, no-login family Christmas list built for Cloudflare Workers and D1. The production app is designed to live at `https://corypahl.dev/whaley-christmas`.

## Local development

```sh
npm install
npm run build
npm run db:migrate:local
npx wrangler dev
```

The full local app (including the D1-backed API) is served by Wrangler. Vite's standalone dev server is useful for styling, but does not provide the API.

## Deployment

Pushes to the connected Cloudflare Worker build automatically deploy with `npx wrangler deploy`. Wrangler provisions the D1 database from the binding in `wrangler.jsonc`, and the Worker initializes its schema on the first API request.

For a manual deployment, log in with `npx wrangler login` and run `npm run deploy`.

The configured Worker route is `corypahl.dev/whaley-christmas*`. The `corypahl.dev` zone must be active in the same Cloudflare account and its root DNS record must be proxied through Cloudflare.

## Amazon imports

Public Amazon wishlist links are stored and parsed on a best-effort basis. Amazon does not provide a general public wishlist API and may block automated requests or change its markup. When that happens, the source URL remains saved and manual items continue to work normally.

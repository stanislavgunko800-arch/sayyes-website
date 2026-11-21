# Anonymous feedback for the owner

Visitors write a message in a form on the site («Анонимно владельцу» in the contacts block).
It is stored briefly in Cloudflare KV; **the CRM pulls it and saves it there**, and the owner reads it on an owner-only tab in the CRM. Once the CRM has confirmed a message, it is deleted from Cloudflare.

## What is (not) stored
Stored: message text, topic (idea/service/praise/other), site language, the **date** (no time).
Not stored: IP address, browser, device, cookies, referrer, exact time. The Worker never reads the visitor's IP.
(Cloudflare itself, like any host, sees connections in its own infrastructure; the site never records them.)

## One-time setup (Cloudflare dashboard)
1. **Storage & databases → KV → Create namespace** `sayyes-feedback`. Copy its ID.
2. Put the ID into `wrangler.jsonc` (ask Claude to do it, or add by hand):
   ```jsonc
   "kv_namespaces": [{ "binding": "FEEDBACK", "id": "<namespace id>" }]
   ```
   Until this binding exists the form is hidden on the site.
3. **Workers & Pages → sayyes-website → Settings → Variables and Secrets → Add** a *Secret* named `CRM_TOKEN`.
   Make the value with `openssl rand -hex 32`. Never commit it; the CRM gets the same value in its own `.env`.
4. Push to `main`; Cloudflare deploys the Worker (`worker/index.js`) with the site.

## API for the CRM (Authorization: `Bearer <CRM_TOKEN>`)
Base URL: `https://sayyes-website.stanislavgunko800.workers.dev` (later the real domain).

- `GET /api/feedback?limit=100` → `{"messages":[{"id","date","topic","lang","message"}],"more":false}` (oldest first)
- `POST /api/feedback/ack` with `{"ids":["…"]}` → `{"deleted":N}`; call it **after** saving the messages in the CRM.

`topic` is one of `idea`, `service`, `praise`, `other`; `lang` is `ru`, `en` or `ka`.

## Tests
`npm test` runs `test/feedback.mjs` (in-memory KV): storage shape, validation, bot traps, token checks, ack.

interface Env { DB: D1Database; ASSETS: Fetcher }

const BASE = "/whaley-christmas";
let schemaReady: Promise<void> | undefined;
const PEOPLE = new Set([
  "nana", "papa", "peter-and-brittany", "elizabeth", "cory", "maggie", "hawken", "eddie", "sally", "theresa",
  "paul-and-brooke", "richie", "tommy", "emma", "john-paul", "sophie", "zelie", "adam", "nellie", "kolbe", "frankie", "jude",
]);

const json = (data: unknown, status = 200) => Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
const clean = (value: unknown, max: number) => typeof value === "string" ? value.trim().slice(0, max) || null : null;
const validHttpUrl = (value: string | null) => {
  if (!value) return null;
  try { const url = new URL(value); return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null; } catch { return null; }
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (!url.pathname.startsWith(BASE)) return new Response("Not found", { status: 404 });
    const relative = url.pathname.slice(BASE.length) || "/";
    if (!relative.startsWith("/")) return new Response("Not found", { status: 404 });

    try {
      if (relative.startsWith("/api/")) return await handleApi(request, env, relative);
      if (request.method !== "GET" && request.method !== "HEAD") return new Response("Method not allowed", { status: 405 });
      const assetUrl = new URL(request.url);
      assetUrl.pathname = relative;
      let response = await env.ASSETS.fetch(new Request(assetUrl, request));
      if (response.status === 404 && !relative.includes(".")) {
        assetUrl.pathname = "/";
        response = await env.ASSETS.fetch(new Request(assetUrl, request));
      }
      const headers = new Headers(response.headers);
      headers.set("X-Content-Type-Options", "nosniff");
      headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
      headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
      headers.set("Content-Security-Policy", "default-src 'self'; script-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'");
      return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
    } catch (error) {
      console.error(error);
      return relative.startsWith("/api/") ? json({ error: "The Christmas list hit a snag. Please try again." }, 500) : new Response("Server error", { status: 500 });
    }
  },
} satisfies ExportedHandler<Env>;

async function handleApi(request: Request, env: Env, path: string): Promise<Response> {
  const parts = path.split("/").filter(Boolean);
  if (parts[0] !== "api" || parts[1] !== "lists" || !PEOPLE.has(parts[2])) return json({ error: "List not found" }, 404);
  schemaReady ??= initializeSchema(env.DB);
  await schemaReady;
  const slug = parts[2];

  if (request.method === "GET" && parts.length === 3) {
    const [itemResult, source] = await Promise.all([
      env.DB.prepare("SELECT id, person_slug, title, details, url, price, source, created_at, updated_at FROM items WHERE person_slug = ? ORDER BY position, created_at DESC").bind(slug).all(),
      env.DB.prepare("SELECT url, last_synced_at, last_error FROM amazon_sources WHERE person_slug = ?").bind(slug).first(),
    ]);
    return json({ items: itemResult.results, amazonSource: source });
  }

  if (parts[3] === "items") {
    if (request.method === "POST" && parts.length === 4) return createItem(request, env, slug);
    if (parts[4] && request.method === "PATCH") return updateItem(request, env, slug, parts[4]);
    if (parts[4] && request.method === "DELETE") {
      await env.DB.prepare("DELETE FROM items WHERE id = ? AND person_slug = ?").bind(parts[4], slug).run();
      return json({ ok: true });
    }
  }

  if (parts[3] === "amazon") {
    if (request.method === "POST") return importAmazon(request, env, slug);
    if (request.method === "DELETE") {
      await env.DB.prepare("DELETE FROM amazon_sources WHERE person_slug = ?").bind(slug).run();
      return json({ ok: true });
    }
  }
  return json({ error: "Not found" }, 404);
}

async function initializeSchema(db: D1Database): Promise<void> {
  await db.batch([
    db.prepare("CREATE TABLE IF NOT EXISTS items (id TEXT PRIMARY KEY, person_slug TEXT NOT NULL, title TEXT, details TEXT, url TEXT, price TEXT, source TEXT NOT NULL DEFAULT 'manual', external_id TEXT, position INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)"),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_items_person ON items(person_slug, position, created_at)"),
    db.prepare("CREATE UNIQUE INDEX IF NOT EXISTS idx_items_external ON items(person_slug, source, external_id) WHERE external_id IS NOT NULL"),
    db.prepare("CREATE TABLE IF NOT EXISTS amazon_sources (person_slug TEXT PRIMARY KEY, url TEXT NOT NULL, last_synced_at TEXT, last_error TEXT, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)"),
  ]);
}

async function readItem(request: Request) {
  const body = await request.json<Record<string, unknown>>();
  const urlInput = clean(body.url, 2000);
  const url = validHttpUrl(urlInput);
  if (urlInput && !url) throw new InputError("The item link must start with http:// or https://");
  const item = { title: clean(body.title, 160), details: clean(body.details, 300), url, price: clean(body.price, 40) };
  if (!item.title && !item.details && !item.url && !item.price) throw new InputError("Add at least one detail for this wish");
  return item;
}

async function createItem(request: Request, env: Env, slug: string) {
  try {
    const item = await readItem(request); const id = crypto.randomUUID();
    await env.DB.prepare("INSERT INTO items (id, person_slug, title, details, url, price) VALUES (?, ?, ?, ?, ?, ?)").bind(id, slug, item.title, item.details, item.url, item.price).run();
    const saved = await env.DB.prepare("SELECT id, person_slug, title, details, url, price, source, created_at, updated_at FROM items WHERE id = ?").bind(id).first();
    return json({ item: saved }, 201);
  } catch (error) { if (error instanceof InputError) return json({ error: error.message }, 400); throw error; }
}

async function updateItem(request: Request, env: Env, slug: string, id: string) {
  try {
    const item = await readItem(request);
    const result = await env.DB.prepare("UPDATE items SET title = ?, details = ?, url = ?, price = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND person_slug = ?").bind(item.title, item.details, item.url, item.price, id, slug).run();
    if (!result.meta.changes) return json({ error: "Wish not found" }, 404);
    const saved = await env.DB.prepare("SELECT id, person_slug, title, details, url, price, source, created_at, updated_at FROM items WHERE id = ?").bind(id).first();
    return json({ item: saved });
  } catch (error) { if (error instanceof InputError) return json({ error: error.message }, 400); throw error; }
}

type AmazonItem = { externalId: string; title: string; url: string | null; price: string | null };

async function importAmazon(request: Request, env: Env, slug: string) {
  const body = await request.json<{ url?: unknown }>();
  const value = clean(body.url, 2000);
  if (!value) return json({ error: "Paste an Amazon wish list link" }, 400);
  let listUrl: URL;
  try { listUrl = new URL(value); } catch { return json({ error: "That doesn’t look like a valid link" }, 400); }
  const host = listUrl.hostname.toLowerCase();
  if (!(host === "amazon.com" || host.endsWith(".amazon.com"))) return json({ error: "Please use an amazon.com wish list link" }, 400);
  if (!listUrl.pathname.includes("/wishlist/") && !listUrl.pathname.includes("/registries/")) return json({ error: "Please use a public Amazon wish list link" }, 400);

  await env.DB.prepare("INSERT INTO amazon_sources (person_slug, url, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP) ON CONFLICT(person_slug) DO UPDATE SET url = excluded.url, updated_at = CURRENT_TIMESTAMP").bind(slug, listUrl.toString()).run();

  try {
    const imported = await fetchAmazonItems(listUrl);

    let created = 0; let updated = 0;
    for (const item of imported.slice(0, 250)) {
      const existing = await env.DB.prepare("SELECT id FROM items WHERE person_slug = ? AND source = 'amazon' AND external_id = ?").bind(slug, item.externalId).first<{ id: string }>();
      if (existing) {
        await env.DB.prepare("UPDATE items SET title = ?, url = ?, price = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").bind(item.title, item.url, item.price, existing.id).run(); updated++;
      } else {
        await env.DB.prepare("INSERT INTO items (id, person_slug, title, url, price, source, external_id) VALUES (?, ?, ?, ?, ?, 'amazon', ?)").bind(crypto.randomUUID(), slug, item.title, item.url, item.price, item.externalId).run(); created++;
      }
    }
    await env.DB.prepare("UPDATE amazon_sources SET last_synced_at = CURRENT_TIMESTAMP, last_error = NULL WHERE person_slug = ?").bind(slug).run();
    return json({ imported: created, updated, message: `Added ${created} and refreshed ${updated} Amazon wishes.` });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Amazon import is temporarily unavailable";
    await env.DB.prepare("UPDATE amazon_sources SET last_error = ? WHERE person_slug = ?").bind(message.slice(0, 300), slug).run();
    return json({ imported: 0, updated: 0, warning: `${message}. The Amazon link has been saved so it can still be opened or synced later.` });
  }
}

async function fetchAmazonItems(listUrl: URL): Promise<AmazonItem[]> {
  const candidates = [listUrl];
  const listId = listUrl.pathname.match(/\/(?:ls|guest-view)\/([A-Z0-9]+)/i)?.[1];
  if (listId && listUrl.pathname.includes("/wishlist/")) {
    candidates.push(new URL(`https://www.amazon.com/gp/registry/wishlist/${listId}?ref_=wl_share`));
  }

  let lastError = "Amazon did not make any list items available to import";
  for (const candidate of candidates) {
    try {
      const response = await fetchAmazon(candidate);
      if (!response.ok) {
        lastError = `Amazon returned HTTP ${response.status}`;
        continue;
      }
      const items = await parseAmazonItems(response);
      if (items.length) return items;
    } catch (error) {
      lastError = error instanceof Error ? error.message : lastError;
    }
  }
  throw new Error(lastError);
}

async function fetchAmazon(initialUrl: URL): Promise<Response> {
  let url = initialUrl;
  for (let redirects = 0; redirects < 4; redirects++) {
    const host = url.hostname.toLowerCase();
    if (!(host === "amazon.com" || host.endsWith(".amazon.com"))) throw new Error("Amazon redirected to an unsupported site");
    const response = await fetch(url.toString(), {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Cache-Control": "no-cache",
      },
      redirect: "manual",
    });
    if (![301, 302, 303, 307, 308].includes(response.status)) return response;
    const location = response.headers.get("Location");
    if (!location) return response;
    url = new URL(location, url);
  }
  throw new Error("Amazon redirected too many times");
}

async function parseAmazonItems(response: Response): Promise<AmazonItem[]> {
  const items: AmazonItem[] = []; let current: AmazonItem | null = null;
  const transformed = new HTMLRewriter()
    .on("li[data-itemid]", { element(element) { current = { externalId: element.getAttribute("data-itemid") || crypto.randomUUID(), title: "", url: null, price: null }; element.onEndTag(() => { if (current?.title) items.push(current); current = null; }); } })
    .on('li[data-itemid] a[id^="itemName_"]', { element(element) { if (!current) return; const href = element.getAttribute("href")?.replaceAll("&amp;", "&"); if (href) current.url = validHttpUrl(new URL(href, "https://www.amazon.com").toString()); }, text(text) { if (current) current.title += text.text; } })
    .on('li[data-itemid] span[id^="itemPrice_"]', { text(text) { if (current) current.price = `${current.price || ""}${text.text}`; } });
  await transformed.transform(response).text();
  return items.map((item) => ({ ...item, title: item.title.trim().slice(0, 160), price: item.price?.match(/\$\s?\d[\d,]*(?:\.\d{2})?/)?.[0] || null })).filter((item) => item.title);
}

class InputError extends Error {}

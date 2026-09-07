CREATE TABLE items (
  id TEXT PRIMARY KEY,
  person_slug TEXT NOT NULL,
  title TEXT,
  details TEXT,
  url TEXT,
  price TEXT,
  source TEXT NOT NULL DEFAULT 'manual',
  external_id TEXT,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_items_person ON items(person_slug, position, created_at);
CREATE UNIQUE INDEX idx_items_external
  ON items(person_slug, source, external_id)
  WHERE external_id IS NOT NULL;

CREATE TABLE amazon_sources (
  person_slug TEXT PRIMARY KEY,
  url TEXT NOT NULL,
  last_synced_at TEXT,
  last_error TEXT,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

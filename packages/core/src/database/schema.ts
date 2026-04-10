import type Database from 'better-sqlite3';

export function createTables(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS articles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      url TEXT NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      content_html TEXT NOT NULL,
      source_domain TEXT NOT NULL,
      published_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS lookups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      article_id INTEGER NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
      selected_text TEXT NOT NULL,
      context_before TEXT NOT NULL DEFAULT '',
      context_after TEXT NOT NULL DEFAULT '',
      lookup_type TEXT NOT NULL CHECK(lookup_type IN ('word', 'phrase', 'sentence')),
      ai_response TEXT NOT NULL,
      mastery_status TEXT NOT NULL DEFAULT 'new' CHECK(mastery_status IN ('new', 'reviewing', 'mastered', 'needs_work')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS cards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lookup_id INTEGER NOT NULL REFERENCES lookups(id) ON DELETE CASCADE,
      front TEXT NOT NULL,
      back TEXT NOT NULL,
      tags TEXT NOT NULL DEFAULT '',
      next_review_at TEXT NOT NULL DEFAULT (datetime('now', '+1 day')),
      interval INTEGER NOT NULL DEFAULT 1,
      repetitions INTEGER NOT NULL DEFAULT 0,
      ease_factor REAL NOT NULL DEFAULT 2.5,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_lookups_article_id ON lookups(article_id);
    CREATE INDEX IF NOT EXISTS idx_lookups_mastery_status ON lookups(mastery_status);
    CREATE INDEX IF NOT EXISTS idx_cards_lookup_id ON cards(lookup_id);
    CREATE INDEX IF NOT EXISTS idx_cards_next_review_at ON cards(next_review_at);

    CREATE TABLE IF NOT EXISTS ingestion_sources (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      url TEXT NOT NULL UNIQUE,
      label TEXT NOT NULL,
      source_type TEXT NOT NULL CHECK (source_type IN ('feed', 'watch')),
      status TEXT NOT NULL DEFAULT 'enabled' CHECK (status IN ('enabled', 'paused')),
      english_only INTEGER NOT NULL DEFAULT 1 CHECK (english_only IN (0, 1)),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      last_success_at TEXT,
      last_error TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_ingestion_sources_status ON ingestion_sources(status);
  `);
}

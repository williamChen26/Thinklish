/**
 * A syndication endpoint discovered from a pasted page URL (link rel or heuristics).
 * Used for F7 feed discovery assistance; never implies subscription until the user confirms.
 */
export interface DiscoveredFeed {
  url: string;
  type: 'rss' | 'atom';
  /** Human-readable name from `<link title>` or feed document when available */
  title?: string;
  /** Short line for disambiguation when multiple feeds exist (e.g. “Comments”, “Posts”) */
  description?: string;
}

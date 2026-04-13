export interface IngestionErrorRemediation {
  /** Short heading for the error panel */
  summary: string;
  /** Plain-language steps */
  bullets: string[];
  /** Single-line technical detail safe for UI (stack traces collapsed) */
  sanitizedTechnical: string;
}

function firstMeaningfulLine(raw: string): string {
  const lines = raw.split(/\n/).map((l) => l.trim()).filter(Boolean);
  for (const line of lines) {
    if (/^\s*at\s+/.test(line) || line.includes('    at ')) {
      break;
    }
    if (line.length > 0) {
      return line.length > 280 ? `${line.slice(0, 277)}…` : line;
    }
  }
  const head = raw.trim().split('\n')[0]?.trim() ?? raw.trim();
  return head.length > 280 ? `${head.slice(0, 277)}…` : head;
}

function looksLikeStackTrace(raw: string): boolean {
  return /\n\s*at\s+/.test(raw) || raw.includes('\n    at ');
}

/**
 * Maps raw ingestion/network errors to learner-friendly remediation (no stack dumps in UI).
 */
export function remediateIngestionError(raw: string | null | undefined): IngestionErrorRemediation | null {
  if (raw === null || raw === undefined) {
    return null;
  }
  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }

  const technical = looksLikeStackTrace(trimmed) ? firstMeaningfulLine(trimmed) : trimmed;
  const lower = technical.toLowerCase();

  if (lower.includes('404') || lower.includes('not found')) {
    return {
      summary: 'Address not found',
      bullets: [
        'Confirm the feed URL in a browser — it should download or show RSS/Atom XML.',
        'Some sites move feeds; try the site’s “RSS” or “Subscribe” link from the footer or blog index.'
      ],
      sanitizedTechnical: technical
    };
  }

  if (
    lower.includes('enotfound') ||
    lower.includes('getaddrinfo') ||
    lower.includes('name not resolved') ||
    lower.includes('dns')
  ) {
    return {
      summary: 'Could not reach the host',
      bullets: [
        'Check your internet connection and VPN.',
        'Verify the domain name has no typos.',
        'Corporate or school networks sometimes block RSS hosts — try another network if possible.'
      ],
      sanitizedTechnical: technical
    };
  }

  if (lower.includes('401') || lower.includes('403') || lower.includes('forbidden') || lower.includes('unauthorized')) {
    return {
      summary: 'Access was blocked',
      bullets: [
        'The server may require login or block automated requests; Thinklish does not support authenticated feeds yet.',
        'Try a public feed URL, or paste individual article URLs instead.'
      ],
      sanitizedTechnical: technical
    };
  }

  if (lower.includes('429') || lower.includes('rate limit')) {
    return {
      summary: 'Too many requests',
      bullets: [
        'Wait a while, then use Refresh on this source.',
        'Set Global refresh to Relaxed or Manual to reduce how often we fetch.'
      ],
      sanitizedTechnical: technical
    };
  }

  if (lower.includes('timeout') || lower.includes('timed out') || lower.includes('etimedout')) {
    return {
      summary: 'The request timed out',
      bullets: [
        'The site may be slow or overloaded — try again later.',
        'If this keeps happening, the feed may be too heavy; consider Manual refresh only.'
      ],
      sanitizedTechnical: technical
    };
  }

  if (
    lower.includes('certificate') ||
    lower.includes('cert ') ||
    lower.includes('ssl') ||
    lower.includes('tls')
  ) {
    return {
      summary: 'Secure connection problem',
      bullets: [
        'The site’s HTTPS certificate may be invalid or intercepted by a proxy.',
        'Try opening the same URL in a browser; if it warns about security, the feed may be unreliable.'
      ],
      sanitizedTechnical: technical
    };
  }

  if (
    lower.includes('parse') ||
    lower.includes('xml') ||
    lower.includes('not a feed') ||
    lower.includes('invalid feed')
  ) {
    return {
      summary: 'This does not look like a valid RSS/Atom feed',
      bullets: [
        'Open the URL — you should see tags like <rss>, <feed>, or <channel>.',
        'If you see HTML only, paste the page URL in “Watch” mode (listing page) or find the site’s real feed link.'
      ],
      sanitizedTechnical: technical
    };
  }

  if (lower.includes('network') || lower.includes('fetch failed') || lower.includes('econnrefused')) {
    return {
      summary: 'Network error',
      bullets: [
        'Check connectivity and try Refresh.',
        'Firewalls and proxies can block desktop apps — try again on a different network if it persists.'
      ],
      sanitizedTechnical: technical
    };
  }

  return {
    summary: 'Something went wrong while fetching',
    bullets: [
      'Try Refresh after a short wait.',
      'Confirm the URL still works in a browser.',
      'If the problem continues, pause this source and paste article URLs manually for now.'
    ],
    sanitizedTechnical: technical
  };
}

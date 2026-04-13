import { describe, expect, it } from 'vitest';
import { remediateIngestionError } from '@thinklish/shared';

describe('remediateIngestionError', () => {
  it('returns null for empty input', () => {
    expect(remediateIngestionError(null)).toBeNull();
    expect(remediateIngestionError('')).toBeNull();
    expect(remediateIngestionError('   ')).toBeNull();
  });

  it('maps 404 to feed URL guidance', () => {
    const r = remediateIngestionError('HTTP 404 Not Found');
    expect(r?.summary).toContain('found');
    expect(r?.bullets.length).toBeGreaterThan(0);
  });

  it('collapses stack traces in sanitized output', () => {
    const raw = `TypeError: boom
    at fetchSomething (app.js:1:1)
    at main (app.js:2:1)`;
    const r = remediateIngestionError(raw);
    expect(r?.sanitizedTechnical).not.toContain('at fetchSomething');
    expect(r?.bullets.length).toBeGreaterThan(0);
  });

  it('maps DNS-style errors', () => {
    const r = remediateIngestionError('getaddrinfo ENOTFOUND example.invalid');
    expect(r?.summary.toLowerCase()).toMatch(/host|reach/);
  });
});

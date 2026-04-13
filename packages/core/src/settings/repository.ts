import { getDatabase } from '../database/connection';
import type { RefreshPosture } from '@thinklish/shared';

const KEY_GLOBAL_REFRESH_POSTURE = 'global_refresh_posture';

export function getSetting(key: string): string | null {
  const db = getDatabase();
  const row = db.prepare('SELECT value FROM app_settings WHERE key = ?').get(key) as { value: string } | undefined;
  return row?.value ?? null;
}

export function setSetting(key: string, value: string): void {
  const db = getDatabase();
  db.prepare(
    `
    INSERT INTO app_settings (key, value) VALUES (@key, @value)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `
  ).run({ key, value });
}

function isRefreshPosture(value: string): value is RefreshPosture {
  return value === 'manual' || value === 'relaxed' || value === 'normal';
}

export function getGlobalRefreshPosture(): RefreshPosture {
  const raw = getSetting(KEY_GLOBAL_REFRESH_POSTURE);
  if (raw && isRefreshPosture(raw)) {
    return raw;
  }
  return 'normal';
}

export function setGlobalRefreshPosture(posture: RefreshPosture): void {
  setSetting(KEY_GLOBAL_REFRESH_POSTURE, posture);
}

import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import path from 'node:path';
import type { SSOTokenStatus } from '../types.js';

function getCacheFilePath(sessionName?: string, startUrl?: string): string {
  const key = sessionName ?? startUrl;
  if (!key) return '';
  const hash = createHash('sha1').update(key).digest('hex');
  return path.join(homedir(), '.aws', 'sso', 'cache', `${hash}.json`);
}

export async function getTokenStatus(
  sessionName?: string,
  startUrl?: string,
): Promise<SSOTokenStatus> {
  if (!sessionName && !startUrl) {
    return { is_valid: false, status: 'not_sso' };
  }

  const cacheFile = getCacheFilePath(sessionName, startUrl);
  const REFRESH_WINDOW_MS = 15 * 60 * 1000; // 15 minutes (matches botocore)

  try {
    const raw = await readFile(cacheFile, 'utf8');
    const token = JSON.parse(raw) as { expiresAt?: string; [key: string]: unknown };
    if (!token.expiresAt) {
      return { is_valid: false, status: 'not_logged_in' };
    }
    const expiresAt = new Date(token.expiresAt);
    const now = new Date();
    const remainingMs = expiresAt.getTime() - now.getTime();

    if (remainingMs <= 0) {
      return { is_valid: false, expiresAt, remainingMs, status: 'expired' };
    }
    if (remainingMs < REFRESH_WINDOW_MS) {
      return { is_valid: true, expiresAt, remainingMs, status: 'expiring_soon' };
    }
    return { is_valid: true, expiresAt, remainingMs, status: 'valid' };
  } catch {
    return { is_valid: false, status: 'not_logged_in' };
  }
}

export function formatTokenStatus(status: SSOTokenStatus): string {
  switch (status.status) {
    case 'valid': {
      const hours = Math.floor((status.remainingMs ?? 0) / 3600000);
      const minutes = Math.floor(((status.remainingMs ?? 0) % 3600000) / 60000);
      return `✅ Valid (${hours}h ${minutes}m remaining)`;
    }
    case 'expiring_soon': {
      const minutes = Math.floor((status.remainingMs ?? 0) / 60000);
      return `⚠️  Expiring soon (${minutes}m)`;
    }
    case 'expired':
      return '❌ Expired';
    case 'not_logged_in':
      return '❌ Not logged in';
    case 'not_sso':
      return '—';
  }
}

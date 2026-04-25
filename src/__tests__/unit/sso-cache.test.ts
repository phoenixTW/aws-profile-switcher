import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createHash } from 'node:crypto';
import { copyFileSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getTokenStatus } from '../../lib/sso-cache.js';

const originalHome = process.env['HOME'];
const validFixture = fileURLToPath(
  new URL('../fixtures/sso-cache-valid.json', import.meta.url),
);

describe('getTokenStatus', () => {
  let tempHome: string;

  beforeEach(() => {
    tempHome = mkdtempSync(join(tmpdir(), 'awsps-home-'));
    process.env['HOME'] = tempHome;
    mkdirSync(join(tempHome, '.aws', 'sso', 'cache'), { recursive: true });
  });

  afterEach(() => {
    process.env['HOME'] = originalHome;
    rmSync(tempHome, { recursive: true, force: true });
  });

  it('should return not_sso when no session info provided', async () => {
    const status = await getTokenStatus();
    expect(status.status).toBe('not_sso');
    expect(status.is_valid).toBe(false);
  });

  it('should return not_logged_in for non-existent cache file', async () => {
    const status = await getTokenStatus('nonexistent-session');
    expect(status.status).toBe('not_logged_in');
    expect(status.is_valid).toBe(false);
  });

  it('should return valid for a future-dated cache file', async () => {
    const sessionName = 'my-org';
    const hash = createHash('sha1').update(sessionName).digest('hex');
    copyFileSync(
      validFixture,
      join(tempHome, '.aws', 'sso', 'cache', `${hash}.json`),
    );

    const status = await getTokenStatus(sessionName);
    expect(status.status).toBe('valid');
    expect(status.is_valid).toBe(true);
    expect(status.expiresAt).toBeInstanceOf(Date);
  });
});

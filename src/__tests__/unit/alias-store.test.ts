import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  loadAliasStore,
  upsertAlias,
  getProfileForAlias,
  getAliasForProfile,
} from '../../lib/alias-store.js';

const originalEnv = process.env['AWSPS_CONFIG'];

describe('alias-store', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'awsps-test-'));
    process.env['AWSPS_CONFIG'] = tempDir;
  });

  afterEach(() => {
    process.env['AWSPS_CONFIG'] = originalEnv;
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('should return default store when no config exists', async () => {
    const store = await loadAliasStore();
    expect(store.version).toBe(1);
    expect(Object.keys(store.aliases)).toHaveLength(0);
  });

  it('should upsert and retrieve aliases', async () => {
    await upsertAlias('mantacares-prod', 'mprod');

    const profile = await getProfileForAlias('mprod');
    expect(profile).toBe('mantacares-prod');

    const alias = await getAliasForProfile('mantacares-prod');
    expect(alias).toBe('mprod');
  });

  it('should persist aliases across loads', async () => {
    await upsertAlias('mantacares-prod', 'mprod');

    const store = await loadAliasStore();
    expect(store.aliases['mprod']?.profileName).toBe('mantacares-prod');
  });
});

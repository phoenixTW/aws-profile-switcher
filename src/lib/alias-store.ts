import lockfile from 'proper-lockfile';
import writeFileAtomic from 'write-file-atomic';
import { readFile } from 'node:fs/promises';
import { getConfigDir, getConfigPath } from './config.js';
import type { AliasStore } from '../types.js';

const CURRENT_VERSION = 1;

function getDefaultStore(): AliasStore {
  return { version: CURRENT_VERSION, aliases: {} };
}

export async function loadAliasStore(): Promise<AliasStore> {
  const configPath = getConfigPath();
  try {
    const raw = await readFile(configPath, 'utf8');
    const store = JSON.parse(raw) as AliasStore;
    if (!store.version || !store.aliases) {
      return getDefaultStore();
    }
    return store;
  } catch {
    return getDefaultStore();
  }
}

export async function withConfigLock(
  fn: (store: AliasStore) => Promise<AliasStore>,
): Promise<AliasStore> {
  const configDir = getConfigDir();
  const configPath = getConfigPath();

  // Ensure the lockfile target exists
  const release = await lockfile.lock(configDir, {
    stale: 30000,   // 30s stale threshold
    retries: {
      retries: 5,
      minTimeout: 500,
      maxTimeout: 5000,
      factor: 2,
    },
  });

  try {
    let current: AliasStore;
    try {
      const raw = await readFile(configPath, 'utf8');
      current = JSON.parse(raw) as AliasStore;
    } catch {
      current = getDefaultStore();
    }

    const updated = await fn(current);
    await writeFileAtomic(
      configPath,
      JSON.stringify(updated, null, 2) + '\n',
    );
    return updated;
  } finally {
    await release();
  }
}

export async function saveAliasStore(store: AliasStore): Promise<void> {
  await withConfigLock(async () => store);
}

export async function getAliasForProfile(
  profileName: string,
): Promise<string | undefined> {
  const store = await loadAliasStore();
  for (const entry of Object.values(store.aliases)) {
    if (entry.profileName === profileName) {
      return entry.alias;
    }
  }
  return undefined;
}

export async function getProfileForAlias(
  alias: string,
): Promise<string | undefined> {
  const store = await loadAliasStore();
  return store.aliases[alias]?.profileName;
}

export async function upsertAlias(
  profileName: string,
  alias: string,
): Promise<AliasStore> {
  return withConfigLock(async (store) => {
    const now = new Date().toISOString();
    store.aliases[alias] = {
      alias,
      profileName,
      createdAt: store.aliases[alias]?.createdAt ?? now,
    };
    return store;
  });
}

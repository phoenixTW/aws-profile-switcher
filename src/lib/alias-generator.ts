import type { AliasEntry, AliasStore } from '../types.js';

const COMMON_ABBREVS: Record<string, string> = {
  production: 'prod',
  development: 'dev',
  staging: 'stg',
  testing: 'tst',
  admin: 'adm',
  administrator: 'adm',
  management: 'mgmt',
  application: 'app',
  service: 'svc',
  environment: 'env',
  infrastructure: 'infra',
  security: 'sec',
  network: 'net',
  database: 'db',
  cluster: 'cls',
  project: 'prj',
  organization: 'org',
  company: 'co',
  system: 'sys',
  resource: 'res',
  account: 'acct',
  provider: 'prov',
};

export function generateAlias(profileName: string): string {
  // 1. Normalize: camelCase → kebab-case, lowercase
  const normalized = profileName
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .toLowerCase();

  // 2. Split by hyphens, underscores, dots
  const segments = normalized.split(/[-_.]+/).filter(Boolean);

  // 3. Single segment: use common abbrev or keep as-is
  if (segments.length === 1) {
    const segment = segments[0]!;
    return COMMON_ABBREVS[segment] ?? segment;
  }

  // 4. Multi-segment: first letter of leading segments + last segment
  const leadingCount = Math.min(segments.length - 1, 3);
  let prefix = '';
  for (let i = 0; i < leadingCount; i++) {
    const seg = segments[i]!;
    // Preserve leading numbers (e.g., "1" → "1")
    prefix += /^\d/.test(seg) ? seg.substring(0, 2) : seg[0];
  }

  const lastSegment = segments[segments.length - 1]!;
  const suffix = COMMON_ABBREVS[lastSegment] ?? lastSegment;

  return prefix + suffix;
}

export function resolveCollisions(
  profiles: string[],
  existingAliases: Record<string, AliasEntry>,
): Map<string, string> {
  const result = new Map<string, string>();
  const usedAliases = new Set(Object.keys(existingAliases));

  for (const profile of profiles) {
    // Skip if alias already assigned to this profile
    const existing = Object.values(existingAliases).find(
      (e) => e.profileName === profile,
    );
    if (existing) {
      result.set(profile, existing.alias);
      continue;
    }

    let alias = generateAlias(profile);

    // Handle collision: append numeric suffix
    if (usedAliases.has(alias)) {
      let suffix = 2;
      while (usedAliases.has(`${alias}${suffix}`)) suffix++;
      alias = `${alias}${suffix}`;
    }

    usedAliases.add(alias);
    result.set(profile, alias);
  }

  return result;
}

export function garbageCollectAliases(
  store: AliasStore,
  activeProfiles: Set<string>,
): AliasStore {
  const now = new Date();
  const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

  const cleaned: Record<string, AliasEntry> = {};

  for (const [alias, entry] of Object.entries(store.aliases)) {
    const isActive = activeProfiles.has(entry.profileName);

    if (isActive) {
      // Profile still exists — keep alias, clear orphaned flag
      cleaned[alias] = { ...entry, orphanedAt: undefined };
    } else if (entry.orphanedAt) {
      // Already orphaned — check if > 30 days
      const orphanDate = new Date(entry.orphanedAt);
      if (now.getTime() - orphanDate.getTime() > THIRTY_DAYS_MS) {
        // Stale orphan — remove
        continue;
      }
      // Recent orphan — keep
      cleaned[alias] = entry;
    } else {
      // New orphan — mark with timestamp
      cleaned[alias] = { ...entry, orphanedAt: now.toISOString() };
    }
  }

  return { ...store, aliases: cleaned };
}

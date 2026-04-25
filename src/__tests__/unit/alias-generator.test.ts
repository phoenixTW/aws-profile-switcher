import { describe, it, expect } from 'vitest';
import {
  generateAlias,
  resolveCollisions,
  garbageCollectAliases,
} from '../../lib/alias-generator.js';
import type { AliasEntry, AliasStore } from '../../types.js';

describe('generateAlias', () => {
  it('should generate correct aliases for all test cases', () => {
    const cases: Array<[string, string]> = [
      ['mantacares-prod', 'mprod'],
      ['mantacares-root', 'mroot'],
      ['production-admin', 'padm'],
      ['dev', 'dev'],
      ['staging', 'stg'],
      ['my-company-staging', 'mcstg'],
      ['team-1-prod', 't1prod'],
      ['MyCompanyProd', 'mcprod'],
      ['very-long-profile-name-testing', 'vlptst'],
      ['production', 'prod'],
      ['x', 'x'],
      ['a-b-c-d-e', 'abce'],
    ];

    for (const [input, expected] of cases) {
      expect(generateAlias(input), `generateAlias("${input}")`).toBe(expected);
    }
  });
});

describe('resolveCollisions', () => {
  it('should handle collisions with numeric suffix', () => {
    const existing: Record<string, AliasEntry> = {
      mprod: {
        alias: 'mprod',
        profileName: 'other-prod',
        createdAt: '2024-01-01',
      },
    };
    const result = resolveCollisions(['mantacares-prod'], existing);
    expect(result.get('mantacares-prod')).toBe('mprod2');
  });

  it('should preserve existing aliases for same profile', () => {
    const existing: Record<string, AliasEntry> = {
      mprod: {
        alias: 'mprod',
        profileName: 'mantacares-prod',
        createdAt: '2024-01-01',
      },
    };
    const result = resolveCollisions(['mantacares-prod'], existing);
    expect(result.get('mantacares-prod')).toBe('mprod');
  });
});

describe('garbageCollectAliases', () => {
  it('should mark new orphans', () => {
    const store: AliasStore = {
      version: 1,
      aliases: {
        mprod: {
          alias: 'mprod',
          profileName: 'missing-profile',
          createdAt: '2024-01-01',
        },
      },
    };
    const result = garbageCollectAliases(store, new Set());
    expect(result.aliases['mprod']?.orphanedAt).toBeDefined();
  });

  it('should remove orphans older than 30 days', () => {
    const oldDate = new Date(
      Date.now() - 31 * 24 * 60 * 60 * 1000,
    ).toISOString();
    const store: AliasStore = {
      version: 1,
      aliases: {
        mprod: {
          alias: 'mprod',
          profileName: 'missing-profile',
          createdAt: '2024-01-01',
          orphanedAt: oldDate,
        },
      },
    };
    const result = garbageCollectAliases(store, new Set());
    expect(result.aliases['mprod']).toBeUndefined();
  });

  it('should keep active profiles and clear orphanedAt', () => {
    const store: AliasStore = {
      version: 1,
      aliases: {
        mprod: {
          alias: 'mprod',
          profileName: 'mantacares-prod',
          createdAt: '2024-01-01',
          orphanedAt: '2024-06-01',
        },
      },
    };
    const result = garbageCollectAliases(store, new Set(['mantacares-prod']));
    expect(result.aliases['mprod']).toBeDefined();
    expect(result.aliases['mprod']?.orphanedAt).toBeUndefined();
  });
});

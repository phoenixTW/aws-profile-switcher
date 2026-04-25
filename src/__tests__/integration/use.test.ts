import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ProfileNotFoundError } from '../../lib/errors.js';

const mocks = vi.hoisted(() => ({
  loadAwsConfig: vi.fn(),
  loadAliasStore: vi.fn(),
  generateExport: vi.fn((profile: string) => `export AWS_PROFILE=${profile}`),
}));

vi.mock('../../lib/aws-config.js', () => ({
  loadAwsConfig: mocks.loadAwsConfig,
}));

vi.mock('../../lib/alias-store.js', () => ({
  loadAliasStore: mocks.loadAliasStore,
}));

vi.mock('../../lib/shell-escape.js', () => ({
  generateExport: mocks.generateExport,
}));

import { useCommand } from '../../commands/use.js';

describe('use command integration', () => {
  const originalAwsProfile = process.env['AWS_PROFILE'];
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    mocks.loadAwsConfig.mockReset();
    mocks.loadAliasStore.mockReset();
    mocks.generateExport.mockClear();
    mocks.generateExport.mockImplementation(
      (profile: string) => `export AWS_PROFILE=${profile}`,
    );
  });

  afterEach(() => {
    process.env['AWS_PROFILE'] = originalAwsProfile;
    consoleSpy.mockRestore();
  });

  it('should show current profile when no arg given', async () => {
    process.env['AWS_PROFILE'] = 'test-profile';

    await useCommand();

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('test-profile'),
    );
  });

  it('should resolve aliases and print a shell export', async () => {
    mocks.loadAwsConfig.mockResolvedValue(
      new Map([['test-profile', { name: 'test-profile', isSSO: false }]]),
    );
    mocks.loadAliasStore.mockResolvedValue({
      version: 1,
      aliases: {
        tp: {
          alias: 'tp',
          profileName: 'test-profile',
          createdAt: '2024-01-01',
        },
      },
    });

    await useCommand('tp');

    expect(mocks.generateExport).toHaveBeenCalledWith('test-profile');
    expect(consoleSpy).toHaveBeenCalledWith('export AWS_PROFILE=test-profile');
  });

  it('should throw when the resolved profile does not exist', async () => {
    mocks.loadAwsConfig.mockResolvedValue(new Map());
    mocks.loadAliasStore.mockResolvedValue({ version: 1, aliases: {} });

    await expect(useCommand('missing')).rejects.toBeInstanceOf(
      ProfileNotFoundError,
    );
  });
});

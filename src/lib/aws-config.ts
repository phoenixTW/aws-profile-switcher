import { loadSharedConfigFiles } from '@smithy/shared-ini-file-loader';
import { AwsCliNotFoundError, ConfigNotFoundError } from './errors.js';
import type { AwsProfile } from '../types.js';
import { execa } from 'execa';
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';

let cachedProfiles: Map<string, AwsProfile> | null = null;

async function checkAwsCli(): Promise<void> {
  try {
    await execa('aws', ['--version']);
  } catch {
    throw new AwsCliNotFoundError();
  }
}

function parseProfileEntry(
  name: string,
  entries: Record<string, string | undefined>,
): AwsProfile {
  const ssoSession = entries['sso_session'];
  const ssoStartUrl = entries['sso_start_url'];
  const isSSO = !!(ssoSession || ssoStartUrl);

  return {
    name,
    region: entries['region'],
    output: entries['output'],
    ssoSession,
    ssoStartUrl,
    ssoRegion: entries['sso_region'],
    ssoAccountId: entries['sso_account_id'],
    ssoRoleName: entries['sso_role_name'],
    isSSO,
    ...Object.fromEntries(
      Object.entries(entries).filter(([, v]) => v !== undefined),
    ),
  } as AwsProfile;
}

export async function loadAwsConfig(options?: {
  ignoreCache?: boolean;
}): Promise<Map<string, AwsProfile>> {
  if (cachedProfiles && !options?.ignoreCache) {
    return cachedProfiles;
  }

  const configPath = path.join(homedir(), '.aws', 'config');
  if (!existsSync(configPath)) {
    throw new ConfigNotFoundError(configPath);
  }

  await checkAwsCli();

  const { configFile } = await loadSharedConfigFiles({
    ignoreCache: options?.ignoreCache ?? false,
  });

  const profiles = new Map<string, AwsProfile>();

  // configFile contains profile entries keyed as "profile name" for named profiles
  // and "default" for the default profile (profiles key may also exist)
  for (const [key, entries] of Object.entries(configFile)) {
    // Smithy may prefix with "profile " or not
    const profileName = key.startsWith('profile ') ? key.slice('profile '.length) : key;
    // Skip sso-session sections — they are referenced by profiles
    if (key.startsWith('sso-session ')) continue;
    profiles.set(profileName, parseProfileEntry(profileName, entries));
  }

  cachedProfiles = options?.ignoreCache ? null : profiles;
  return profiles;
}

export function clearConfigCache(): void {
  cachedProfiles = null;
}

export async function getAwsConfigPath(): Promise<string> {
  const configPath = path.join(homedir(), '.aws', 'config');
  if (!existsSync(configPath)) {
    throw new ConfigNotFoundError(configPath);
  }
  return configPath;
}

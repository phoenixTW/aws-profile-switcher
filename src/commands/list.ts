import pc from 'picocolors';
import { garbageCollectAliases, resolveCollisions } from '../lib/alias-generator.js';
import { loadAliasStore, saveAliasStore } from '../lib/alias-store.js';
import { loadAwsConfig } from '../lib/aws-config.js';
import { formatTokenStatus, getTokenStatus } from '../lib/sso-cache.js';

export async function listCommand(): Promise<void> {
  console.log(pc.cyan('\n📋 AWS Profiles\n'));

  const [profiles, store] = await Promise.all([loadAwsConfig(), loadAliasStore()]);

  if (profiles.size === 0) {
    console.log(pc.yellow('No AWS profiles found. Run `awsps configure sso` to create one.'));
    return;
  }

  const activeProfiles = new Set(profiles.keys());
  const gcStore = garbageCollectAliases(store, activeProfiles);
  const currentProfile = process.env['AWS_PROFILE'];
  const rows: Array<{
    profile: string;
    alias: string;
    ssoType: string;
    tokenStatus: string;
    isCurrent: boolean;
  }> = [];

  for (const [name, profile] of profiles) {
    const aliasEntry = Object.values(gcStore.aliases).find((entry) => entry.profileName === name);
    const alias = aliasEntry?.alias ?? '—';

    let ssoType = '—';
    if (profile.ssoSession) {
      ssoType = profile.ssoSession;
    } else if (profile.isSSO) {
      ssoType = '(inline)';
    }

    let tokenStatus = '—';
    if (profile.isSSO) {
      const status = await getTokenStatus(profile.ssoSession, profile.ssoStartUrl);
      tokenStatus = formatTokenStatus(status);
    }

    rows.push({
      profile: name,
      alias,
      ssoType,
      tokenStatus,
      isCurrent: name === currentProfile,
    });
  }

  const profilesNeedingAliases = Array.from(profiles.keys()).filter(
    (name) => !Object.values(gcStore.aliases).find((entry) => entry.profileName === name),
  );

  if (profilesNeedingAliases.length > 0) {
    const newAliases = resolveCollisions(profilesNeedingAliases, gcStore.aliases);
    for (const [profileName, alias] of newAliases) {
      gcStore.aliases[alias] = {
        alias,
        profileName,
        createdAt: new Date().toISOString(),
      };
    }
    await saveAliasStore(gcStore);
  } else if (Object.keys(gcStore.aliases).length !== Object.keys(store.aliases).length) {
    await saveAliasStore(gcStore);
  }

  const maxProfile = Math.max(...rows.map((row) => row.profile.length), 'Profile'.length);
  const maxAlias = Math.max(...rows.map((row) => row.alias.length), 'Alias'.length);
  const maxSsoType = Math.max(...rows.map((row) => row.ssoType.length), 'SSO Session'.length);

  const header = `  ${'Profile'.padEnd(maxProfile)}  ${'Alias'.padEnd(maxAlias)}  ${'SSO Session'.padEnd(maxSsoType)}  Token Status`;
  console.log(header);
  console.log(`  ${'─'.repeat(header.length - 2)}`);

  for (const row of rows) {
    const currentMarker = row.isCurrent ? pc.green(' ← current') : '';
    console.log(
      `  ${row.profile.padEnd(maxProfile)}  ${row.alias.padEnd(maxAlias)}  ${row.ssoType.padEnd(maxSsoType)}  ${row.tokenStatus}${currentMarker}`,
    );
  }

  console.log();
}

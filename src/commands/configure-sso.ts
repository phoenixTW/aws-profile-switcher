import pc from 'picocolors';
import { resolveCollisions } from '../lib/alias-generator.js';
import { loadAliasStore, withConfigLock } from '../lib/alias-store.js';
import { clearConfigCache, loadAwsConfig } from '../lib/aws-config.js';
import { configureSso } from '../lib/aws-cli.js';
import type { AwsProfile } from '../types.js';

export interface ConfigureSsoOptions {
  profile?: string;
}

export async function configureSsoCommand(options: ConfigureSsoOptions = {}): Promise<void> {
  console.log(pc.cyan('\n⚙️  AWS SSO Configuration\n'));

  let existingProfiles: Set<string>;
  try {
    const currentProfiles = await loadAwsConfig();
    existingProfiles = new Set(currentProfiles.keys());
  } catch {
    existingProfiles = new Set();
  }

  try {
    await configureSso(options.profile);
  } catch (error) {
    console.log(pc.red(`Configuration failed: ${(error as Error).message}`));
    return;
  }

  clearConfigCache();

  let newProfiles: Map<string, AwsProfile>;
  try {
    newProfiles = await loadAwsConfig({ ignoreCache: true });
  } catch {
    console.log(pc.yellow('Could not read updated config.'));
    return;
  }

  const addedProfiles = Array.from(newProfiles.keys()).filter((name) => !existingProfiles.has(name));

  if (addedProfiles.length === 0) {
    console.log(pc.dim('No new profiles created.'));
    return;
  }

  const store = await loadAliasStore();
  const newAliases = resolveCollisions(addedProfiles, store.aliases);

  await withConfigLock(async (currentStore) => {
    for (const [profileName, alias] of newAliases) {
      currentStore.aliases[alias] = {
        alias,
        profileName,
        createdAt: new Date().toISOString(),
      };
    }

    return currentStore;
  });

  console.log(pc.green('\n✅ Profile(s) created:\n'));
  for (const name of addedProfiles) {
    const alias = newAliases.get(name);
    console.log(`  ${name}${alias ? pc.dim(` → ${alias}`) : ''}`);
  }
  console.log();
}

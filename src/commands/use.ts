import pc from 'picocolors';
import { loadAwsConfig } from '../lib/aws-config.js';
import { loadAliasStore } from '../lib/alias-store.js';
import { ProfileNotFoundError } from '../lib/errors.js';
import { generateExport } from '../lib/shell-escape.js';

export interface UseOptions {
  profile?: string;
}

export async function useCommand(
  profileOrAlias?: string,
  _options: UseOptions = {},
): Promise<void> {
  if (!profileOrAlias) {
    const current = process.env['AWS_PROFILE'];
    if (current) {
      console.log(pc.cyan(`Current profile: ${current}`));
    } else {
      console.log(pc.dim('No profile set. Use: awsps use <profile-or-alias>'));
    }
    return;
  }

  const [profiles, store] = await Promise.all([loadAwsConfig(), loadAliasStore()]);

  const aliasEntry = store.aliases[profileOrAlias];
  const resolvedProfile = aliasEntry?.profileName ?? profileOrAlias;

  if (!profiles.has(resolvedProfile)) {
    throw new ProfileNotFoundError(profileOrAlias);
  }

  console.log(generateExport(resolvedProfile));
}

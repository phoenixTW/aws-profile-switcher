import * as p from '@clack/prompts';
import Fuse from 'fuse.js';
import pc from 'picocolors';
import { loadAliasStore } from '../lib/alias-store.js';
import { loadAwsConfig } from '../lib/aws-config.js';
import { generateExport } from '../lib/shell-escape.js';
import { formatTokenStatus, getTokenStatus } from '../lib/sso-cache.js';

export async function switchCommand(): Promise<void> {
  console.log(pc.cyan('\n🔀 AWS Profile Switch\n'));

  const [profiles, store] = await Promise.all([loadAwsConfig(), loadAliasStore()]);

  if (profiles.size === 0) {
    console.log(pc.yellow('No AWS profiles found. Run `awsps configure sso` to create one.'));
    return;
  }

  const currentProfile = process.env['AWS_PROFILE'];

  const options: Array<{
    value: string;
    label: string;
    hint?: string;
  }> = [];

  for (const [name, profile] of profiles) {
    const alias = Object.values(store.aliases).find((entry) => entry.profileName === name);
    const isCurrent = name === currentProfile;

    let tokenHint = '';
    if (profile.isSSO) {
      const tokenStatus = await getTokenStatus(profile.ssoSession, profile.ssoStartUrl);
      tokenHint = formatTokenStatus(tokenStatus);
    }

    const label = `${name}${alias ? pc.dim(` (${alias.alias})`) : ''}${isCurrent ? pc.green(' ← current') : ''}`;

    options.push({
      value: name,
      label,
      hint: tokenHint || undefined,
    });
  }

  new Fuse(options, {
    keys: ['value', 'label'],
    threshold: 0.4,
  });

  const selected = await p.select({
    message: 'Select a profile',
    options,
    initialValue: currentProfile,
  });

  if (p.isCancel(selected)) {
    console.log(pc.dim('Cancelled.'));
    return;
  }

  console.log(generateExport(selected as string));
}

import * as p from '@clack/prompts';
import pc from 'picocolors';
import { clearConfigCache, loadAwsConfig } from '../lib/aws-config.js';
import { loadAliasStore, withConfigLock } from '../lib/alias-store.js';
import { resolveCollisions } from '../lib/alias-generator.js';
import { ssoLogin, stsVerify } from '../lib/aws-cli.js';
import { formatTokenStatus, getTokenStatus } from '../lib/sso-cache.js';
import { groupProfilesBySession } from '../lib/sso-dedup.js';
import type { AwsProfile } from '../types.js';

export interface LoginOptions {
  force?: boolean;
  profile?: string;
}

export async function loginCommand(options: LoginOptions = {}): Promise<void> {
  console.log(pc.cyan('\n🔐 AWS SSO Login\n'));

  const spinner = p.spinner();

  let profiles: Map<string, AwsProfile>;
  try {
    profiles = await loadAwsConfig();
  } catch {
    console.log(pc.yellow('No AWS profiles found. Create one?'));
    const shouldCreate = await p.confirm({ message: 'Run aws configure sso?' });
    if (p.isCancel(shouldCreate) || !shouldCreate) {
      return;
    }

    const { configureSsoCommand } = await import('./configure-sso.js');
    await configureSsoCommand();
    clearConfigCache();
    profiles = await loadAwsConfig();
  }

  const ssoProfiles = Array.from(profiles.values()).filter((profile) => profile.isSSO);

  if (ssoProfiles.length === 0) {
    if (profiles.size === 0) {
      console.log(pc.yellow('No AWS profiles found. Run `awsps configure sso` to create one.'));
      return;
    }

    console.log(pc.yellow(`Found ${profiles.size} profiles, none with SSO configuration.`));
    console.log(pc.dim('Run `awsps configure sso` to add SSO to a profile.'));
    return;
  }

  const store = await loadAliasStore();
  const profileOptions: Array<{
    value: string;
    label: string;
    hint: string;
    preselected: boolean;
  }> = [];

  for (const profile of ssoProfiles) {
    const tokenStatus = await getTokenStatus(profile.ssoSession, profile.ssoStartUrl);
    const alias = Object.values(store.aliases).find((entry) => entry.profileName === profile.name);
    const needsLogin = tokenStatus.status !== 'valid' || options.force === true;

    profileOptions.push({
      value: profile.name,
      label: `${profile.name}${alias ? pc.dim(` (${alias.alias})`) : ''}`,
      hint: formatTokenStatus(tokenStatus),
      preselected: needsLogin,
    });
  }

  if (options.profile) {
    const directAliasTarget = store.aliases[options.profile]?.profileName;
    const found = ssoProfiles.find(
      (profile) => profile.name === options.profile || directAliasTarget === profile.name,
    );

    if (!found) {
      console.log(pc.red(`Profile "${options.profile}" not found or is not an SSO profile.`));
      return;
    }

    await loginProfiles([found.name], ssoProfiles, spinner, options.force === true);
    return;
  }

  if (!options.force) {
    const validCount = profileOptions.filter((option) => !option.preselected).length;
    if (validCount > 0) {
      console.log(pc.dim(`Skipping ${validCount} profile(s) with valid tokens. Use --force to re-login.`));
    }
  }

  const selectedProfiles = await p.multiselect({
    message: 'Select profiles to login',
    options: profileOptions.map((option) => ({
      value: option.value,
      label: option.label,
      hint: option.hint,
    })),
    initialValues: profileOptions.filter((option) => option.preselected).map((option) => option.value),
  });

  if (p.isCancel(selectedProfiles) || selectedProfiles.length === 0) {
    console.log(pc.dim('No profiles selected.'));
    return;
  }

  await loginProfiles(selectedProfiles, ssoProfiles, spinner, options.force === true);
}

async function loginProfiles(
  selectedNames: string[],
  ssoProfiles: AwsProfile[],
  spinner: ReturnType<typeof p.spinner>,
  force: boolean,
): Promise<void> {
  const selectedProfiles = ssoProfiles.filter((profile) => selectedNames.includes(profile.name));
  const groups = groupProfilesBySession(selectedProfiles);

  console.log(pc.dim(`\nFound ${selectedProfiles.length} SSO profiles across ${groups.length} session(s).\n`));

  for (const group of groups) {
    const sessionLabel = group.sessionName ?? group.startUrl;
    const representativeProfile = ssoProfiles.find((profile) => profile.name === group.representative);

    if (!representativeProfile) {
      continue;
    }

    const tokenStatus = await getTokenStatus(
      representativeProfile.ssoSession,
      representativeProfile.ssoStartUrl,
    );
    if (!force && tokenStatus.remainingMs !== undefined && tokenStatus.remainingMs > 15 * 60 * 1000) {
      console.log(pc.dim(`Skipping ${sessionLabel}; token already valid.`));
      continue;
    }

    spinner.start(`Logging in to ${sessionLabel}...`);
    try {
      await ssoLogin(group.representative);
      spinner.stop(`Logged in to ${sessionLabel} ✅`);
    } catch (error) {
      spinner.stop(`Failed to login to ${sessionLabel} ❌`);
      console.log(pc.red((error as Error).message));
    }
  }

  console.log(pc.cyan('\nVerification Results:\n'));
  for (const name of selectedNames) {
    spinner.start(`Verifying ${name}...`);
    const result = await stsVerify(name);

    if (result.success) {
      spinner.stop(`${pc.green('✅')} ${name}  Account: ${result.account}  ARN: ${result.arn}`);
    } else {
      spinner.stop(`${pc.red('❌')} ${name}  Error: ${result.error}`);
    }
  }

  const store = await loadAliasStore();
  const aliases = resolveCollisions(selectedNames, store.aliases);
  const newAliasNames: string[] = [];

  for (const [profileName, alias] of aliases) {
    if (!Object.values(store.aliases).find((entry) => entry.profileName === profileName)) {
      newAliasNames.push(alias);
    }
  }

  if (newAliasNames.length === 0) {
    return;
  }

  await withConfigLock(async (currentStore) => {
    for (const [profileName, alias] of aliases) {
      if (!currentStore.aliases[alias]) {
        currentStore.aliases[alias] = {
          alias,
          profileName,
          createdAt: new Date().toISOString(),
        };
      }
    }

    return currentStore;
  });

  console.log(pc.dim(`\nAliases generated: ${newAliasNames.join(', ')}`));
}

import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { appendFile, readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import path from 'node:path';
import * as p from '@clack/prompts';
import pc from 'picocolors';
import { getAwsCliVersion } from '../lib/aws-cli.js';
import { loadAwsConfig } from '../lib/aws-config.js';
import { loadAliasStore } from '../lib/alias-store.js';
import { getConfigDir, getConfigPath } from '../lib/config.js';
import { detectShell, getRcPath, getShellHook } from './shell-hook.js';
import type { DoctorCheck } from '../types.js';

export async function doctorCommand(): Promise<void> {
  console.log(pc.cyan('\n🏥 AWS Profile Switcher Doctor\n'));

  const checks: DoctorCheck[] = [
    {
      name: 'Node.js version',
      status: 'pass',
      message: `Node.js ${process.version} (>= 20)`,
    },
  ];

  const nodeVersion = parseInt(process.version.slice(1).split('.')[0] ?? '0', 10);
  if (nodeVersion < 20) {
    checks[0]!.status = 'fail';
    checks[0]!.message = `Node.js ${process.version} is below minimum (>= 20). Please upgrade.`;
  }

  const cliVersion = await getAwsCliVersion();
  if (cliVersion === 'not found') {
    checks.push({
      name: 'AWS CLI',
      status: 'fail',
      message: 'AWS CLI not found on PATH.',
    });
  } else {
    const majorVersion = parseInt(cliVersion.split('.')[0] ?? '0', 10);
    if (majorVersion < 2) {
      checks.push({
        name: 'AWS CLI version',
        status: 'warn',
        message: `AWS CLI v${cliVersion} — v2.x recommended.`,
      });
    } else {
      checks.push({
        name: 'AWS CLI version',
        status: 'pass',
        message: `AWS CLI v${cliVersion}`,
      });
    }
  }

  const awsConfigPath = path.join(homedir(), '.aws', 'config');
  if (!existsSync(awsConfigPath)) {
    checks.push({
      name: 'AWS config',
      status: 'fail',
      message: `AWS config not found at ${awsConfigPath}`,
      fix: async () => {
        const shouldCreate = await p.confirm({ message: 'Create a minimal AWS config?' });
        if (p.isCancel(shouldCreate) || !shouldCreate) {
          return false;
        }

        mkdirSync(path.dirname(awsConfigPath), { recursive: true });
        writeFileSync(awsConfigPath, '# AWS Config\n');
        return true;
      },
    });
  } else {
    try {
      const profiles = await loadAwsConfig();
      checks.push({
        name: 'AWS config',
        status: 'pass',
        message: `AWS config readable (${profiles.size} profiles)`,
      });

      if (profiles.size === 0) {
        checks.push({
          name: 'AWS profiles',
          status: 'warn',
          message: 'No profiles found in AWS config.',
        });
      }
    } catch (error) {
      checks.push({
        name: 'AWS config',
        status: 'fail',
        message: `AWS config parse error: ${(error as Error).message}`,
      });
    }
  }

  const shell = detectShell();
  if (shell !== 'unknown') {
    const rcPath = getRcPath(shell);
    try {
      const rcContent = await readFile(rcPath, 'utf8');
      if (rcContent.includes('awsps') && rcContent.includes('eval "$output"')) {
        checks.push({
          name: 'Shell hook',
          status: 'pass',
          message: `Shell hook detected in ${rcPath}`,
        });
      } else {
        checks.push({
          name: 'Shell hook',
          status: 'warn',
          message: `No shell hook detected in ${rcPath}`,
          fix: async () => {
            const shouldInstall = await p.confirm({ message: `Install shell hook to ${rcPath}?` });
            if (p.isCancel(shouldInstall) || !shouldInstall) {
              return false;
            }

            const hook = getShellHook(shell);
            await appendFile(rcPath, `\n# awsps shell hook\n${hook}\n`);
            return true;
          },
        });
      }
    } catch {
      checks.push({
        name: 'Shell hook',
        status: 'warn',
        message: `Could not read ${rcPath}`,
        fix: async () => {
          const shouldInstall = await p.confirm({ message: `Create ${rcPath} with shell hook?` });
          if (p.isCancel(shouldInstall) || !shouldInstall) {
            return false;
          }

          const hook = getShellHook(shell);
          writeFileSync(rcPath, `# awsps shell hook\n${hook}\n`);
          return true;
        },
      });
    }
  } else {
    checks.push({
      name: 'Shell hook',
      status: 'warn',
      message: 'Could not detect shell type.',
    });
  }

  try {
    const store = await loadAliasStore();
    const aliasCount = Object.keys(store.aliases).length;
    checks.push({
      name: 'Alias store',
      status: 'pass',
      message: `Alias store healthy (${aliasCount} aliases)`,
    });
  } catch {
    checks.push({
      name: 'Alias store',
      status: 'warn',
      message: 'Alias store corrupted or missing.',
      fix: async () => {
        const shouldFix = await p.confirm({ message: 'Recreate alias store?' });
        if (p.isCancel(shouldFix) || !shouldFix) {
          return false;
        }

        const configFilePath = getConfigPath();
        writeFileSync(configFilePath, JSON.stringify({ version: 1, aliases: {} }, null, 2) + '\n');
        console.log(pc.green(`  Recreated alias store at ${configFilePath}`));
        return true;
      },
    });
  }

  const configDir = getConfigDir();
  try {
    mkdirSync(configDir, { recursive: true });
    const testFile = path.join(configDir, '.write-test');
    writeFileSync(testFile, 'test');
    const { unlinkSync } = await import('node:fs');
    unlinkSync(testFile);
    checks.push({
      name: 'Config directory',
      status: 'pass',
      message: `Config directory writable (${configDir})`,
    });
  } catch {
    checks.push({
      name: 'Config directory',
      status: 'fail',
      message: `Config directory not writable: ${configDir}`,
      fix: async () => {
        try {
          mkdirSync(configDir, { recursive: true });
          return true;
        } catch {
          return false;
        }
      },
    });
  }

  for (const check of checks) {
    if ((check.status === 'fail' || check.status === 'warn') && check.fix) {
      const shouldFix = await p.confirm({ message: `${check.message} → Fix?` });
      if (p.isCancel(shouldFix) || !shouldFix) {
        continue;
      }

      check.status = 'fixing';
      const fixed = await check.fix();
      check.status = fixed ? 'fixed' : check.status;
      if (fixed) {
        check.message = `${check.name} → Fixed ✅`;
      }
    }
  }

  console.log();
  for (const check of checks) {
    const icon =
      check.status === 'pass' || check.status === 'fixed'
        ? pc.green('✅')
        : check.status === 'warn'
          ? pc.yellow('⚠️ ')
          : pc.red('❌');
    console.log(`  ${icon} ${check.message}`);
  }

  const passing = checks.filter((check) => check.status === 'pass' || check.status === 'fixed').length;
  console.log(pc.dim(`\n  ${passing}/${checks.length} checks passing.\n`));
}

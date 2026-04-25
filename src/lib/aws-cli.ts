import { execa } from 'execa';
import { AwsCliError, LoginFailedError } from './errors.js';
import type { LoginResult } from '../types.js';

export async function ssoLogin(profile: string): Promise<void> {
  try {
    await execa('aws', ['sso', 'login', '--profile', profile], {
      stdio: 'inherit',
      cleanup: true,
    });
  } catch (error) {
    if (error instanceof Error && 'stderr' in error) {
      const execError = error as { stderr?: string; stdout?: string };
      throw new LoginFailedError(
        profile,
        execError.stderr || execError.stdout || error.message,
      );
    }
    throw new LoginFailedError(profile, (error as Error).message);
  }
}

export async function stsVerify(profile: string): Promise<LoginResult> {
  try {
    const { stdout } = await execa(
      'aws',
      ['sts', 'get-caller-identity', '--profile', profile, '--output', 'json'],
      { timeout: 30000 },
    );

    const identity = JSON.parse(stdout) as {
      Account?: string;
      Arn?: string;
      UserId?: string;
    };

    return {
      profile,
      success: true,
      account: identity['Account'],
      arn: identity['Arn'],
      userId: identity['UserId'],
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown error';
    return {
      profile,
      success: false,
      error: message,
    };
  }
}

export async function configureSso(profileName?: string): Promise<void> {
  const args = ['configure', 'sso'];
  if (profileName) {
    args.push('--profile', profileName);
  }

  try {
    await execa('aws', args, {
      stdio: 'inherit',
      cleanup: true,
    });
  } catch (error) {
    if (error instanceof Error && 'stderr' in error) {
      const execError = error as { stderr?: string; stdout?: string };
      throw new AwsCliError(
        `configure sso${profileName ? ` --profile ${profileName}` : ''}`,
        execError.stdout || '',
        execError.stderr || '',
      );
    }
    throw error;
  }
}

export async function getAwsCliVersion(): Promise<string> {
  try {
    const { stdout } = await execa('aws', ['--version']);
    const match = stdout.match(/aws-cli\/(\S+)/);
    return match?.[1] ?? 'unknown';
  } catch {
    return 'not found';
  }
}

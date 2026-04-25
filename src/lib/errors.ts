export class AwspsError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly hint?: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = 'AwspsError';
  }
}

export class ConfigNotFoundError extends AwspsError {
  constructor(path: string) {
    super(
      'CONFIG_NOT_FOUND',
      `AWS config not found at ${path}`,
      'Run `awsps configure sso` to create your first profile.',
    );
  }
}

export class ProfileNotFoundError extends AwspsError {
  constructor(name: string) {
    super(
      'PROFILE_NOT_FOUND',
      `Profile "${name}" not found.`,
      'Run `awsps list` to see available profiles.',
    );
  }
}

export class AwsCliNotFoundError extends AwspsError {
  constructor() {
    super(
      'AWS_CLI_NOT_FOUND',
      'AWS CLI not found on PATH.',
      'Install AWS CLI v2: https://docs.aws.amazon.com/cli/latest/userguide/install-cliv2.html',
    );
  }
}

export class ShellHookNotFoundError extends AwspsError {
  constructor(shell: string) {
    super(
      'SHELL_HOOK_NOT_FOUND',
      `Shell hook not detected for ${shell}.`,
      'Run `awsps init` to install the shell hook.',
    );
  }
}

export class AwsCliError extends AwspsError {
  constructor(command: string, stdout: string, stderr: string) {
    super('AWS_CLI_ERROR', `AWS CLI command failed: ${command}`, stderr || stdout);
  }
}

export class LoginFailedError extends AwspsError {
  constructor(profile: string, reason: string) {
    super(
      'LOGIN_FAILED',
      `SSO login failed for ${profile}: ${reason}`,
      'Check your AWS SSO configuration and try again.',
    );
  }
}

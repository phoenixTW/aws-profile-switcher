import { describe, it, expect } from 'vitest';
import {
  AwspsError,
  ConfigNotFoundError,
  ProfileNotFoundError,
  AwsCliNotFoundError,
  ShellHookNotFoundError,
  AwsCliError,
  LoginFailedError,
} from '../../lib/errors.js';

describe('AwspsError', () => {
  it('should have correct properties', () => {
    const error = new AwspsError('TEST_CODE', 'test message', 'test hint');
    expect(error.code).toBe('TEST_CODE');
    expect(error.message).toBe('test message');
    expect(error.hint).toBe('test hint');
    expect(error.name).toBe('AwspsError');
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(AwspsError);
  });
});

describe('ConfigNotFoundError', () => {
  it('should have CONFIG_NOT_FOUND code and helpful hint', () => {
    const error = new ConfigNotFoundError('/path/to/config');
    expect(error.code).toBe('CONFIG_NOT_FOUND');
    expect(error.hint).toContain('awsps configure sso');
    expect(error).toBeInstanceOf(AwspsError);
  });
});

describe('ProfileNotFoundError', () => {
  it('should have PROFILE_NOT_FOUND code and mention list command', () => {
    const error = new ProfileNotFoundError('my-profile');
    expect(error.code).toBe('PROFILE_NOT_FOUND');
    expect(error.message).toContain('my-profile');
    expect(error.hint).toContain('awsps list');
  });
});

describe('AwsCliNotFoundError', () => {
  it('should have AWS_CLI_NOT_FOUND code', () => {
    const error = new AwsCliNotFoundError();
    expect(error.code).toBe('AWS_CLI_NOT_FOUND');
  });
});

describe('ShellHookNotFoundError', () => {
  it('should have SHELL_HOOK_NOT_FOUND code', () => {
    const error = new ShellHookNotFoundError('zsh');
    expect(error.code).toBe('SHELL_HOOK_NOT_FOUND');
    expect(error.hint).toContain('awsps init');
  });
});

describe('AwsCliError', () => {
  it('should have AWS_CLI_ERROR code', () => {
    const error = new AwsCliError('sso login', '', 'error details');
    expect(error.code).toBe('AWS_CLI_ERROR');
    expect(error.hint).toBe('error details');
  });
});

describe('LoginFailedError', () => {
  it('should have LOGIN_FAILED code', () => {
    const error = new LoginFailedError('my-profile', 'timeout');
    expect(error.code).toBe('LOGIN_FAILED');
    expect(error.message).toContain('my-profile');
  });
});

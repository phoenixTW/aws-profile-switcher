import { describe, it, expect } from 'vitest';
import { groupProfilesBySession } from '../../lib/sso-dedup.js';
import type { AwsProfile } from '../../types.js';

describe('groupProfilesBySession', () => {
  it('should group profiles by sso_session name', () => {
    const profiles: AwsProfile[] = [
      {
        name: 'prod',
        ssoSession: 'my-org',
        ssoStartUrl: 'https://my-org.awsapps.com/start',
        isSSO: true,
      },
      {
        name: 'staging',
        ssoSession: 'my-org',
        ssoStartUrl: 'https://my-org.awsapps.com/start',
        isSSO: true,
      },
    ];

    const groups = groupProfilesBySession(profiles);
    expect(groups).toHaveLength(1);
    expect(groups[0]!.profiles).toEqual(['prod', 'staging']);
    expect(groups[0]!.sessionName).toBe('my-org');
    expect(groups[0]!.representative).toBe('prod');
  });

  it('should group legacy profiles by start URL', () => {
    const profiles: AwsProfile[] = [
      {
        name: 'legacy1',
        ssoStartUrl: 'https://legacy.awsapps.com/start',
        isSSO: true,
      },
      {
        name: 'legacy2',
        ssoStartUrl: 'https://legacy.awsapps.com/start',
        isSSO: true,
      },
    ];

    const groups = groupProfilesBySession(profiles);
    expect(groups).toHaveLength(1);
    expect(groups[0]!.sessionKey).toBe(
      'legacy:https://legacy.awsapps.com/start',
    );
  });

  it('should separate different sessions', () => {
    const profiles: AwsProfile[] = [
      {
        name: 'p1',
        ssoSession: 'org-a',
        ssoStartUrl: 'https://a.awsapps.com/start',
        isSSO: true,
      },
      {
        name: 'p2',
        ssoSession: 'org-b',
        ssoStartUrl: 'https://b.awsapps.com/start',
        isSSO: true,
      },
    ];

    const groups = groupProfilesBySession(profiles);
    expect(groups).toHaveLength(2);
  });

  it('should skip non-SSO profiles', () => {
    const profiles: AwsProfile[] = [
      { name: 'static', region: 'us-east-1', isSSO: false },
    ];

    const groups = groupProfilesBySession(profiles);
    expect(groups).toHaveLength(0);
  });
});

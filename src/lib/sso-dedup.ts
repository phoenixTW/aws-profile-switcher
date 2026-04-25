import type { AwsProfile } from '../types.js';

export interface SSOSessionGroup {
  sessionKey: string;          // "session:my-org" or "legacy:<start_url>"
  sessionName?: string;        // sso_session value (modern)
  startUrl: string;
  profiles: string[];          // Profile names in this group
  representative: string;      // First profile (used for login)
}

export function groupProfilesBySession(
  profiles: AwsProfile[],
): SSOSessionGroup[] {
  const groups = new Map<string, SSOSessionGroup>();

  for (const profile of profiles) {
    if (!profile.isSSO) continue;

    let key: string;
    let sessionName: string | undefined;
    let startUrl: string;

    if (profile.ssoSession) {
      // Modern format: shared sso-session
      key = `session:${profile.ssoSession}`;
      sessionName = profile.ssoSession;
      startUrl = profile.ssoStartUrl ?? '';
    } else if (profile.ssoStartUrl) {
      // Legacy format: inline SSO config
      key = `legacy:${profile.ssoStartUrl}`;
      startUrl = profile.ssoStartUrl;
    } else {
      continue;
    }

    if (!groups.has(key)) {
      groups.set(key, {
        sessionKey: key,
        sessionName,
        startUrl,
        profiles: [],
        representative: profile.name,
      });
    }
    groups.get(key)!.profiles.push(profile.name);
  }

  return Array.from(groups.values());
}

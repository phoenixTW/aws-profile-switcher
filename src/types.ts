export interface AwsProfile {
  name: string;
  region?: string;
  output?: string;
  ssoSession?: string; // Modern: references [sso-session X]
  ssoStartUrl?: string; // Legacy: inline SSO config
  ssoRegion?: string;
  ssoAccountId?: string;
  ssoRoleName?: string;
  isSSO: boolean; // Computed: has sso_session or sso_start_url
  [key: string]: string | boolean | undefined;
}

export interface AliasEntry {
  alias: string;
  profileName: string;
  createdAt: string;
  orphanedAt?: string; // Set when profile disappears from AWS config
}

export interface AliasStore {
  version: number;
  aliases: Record<string, AliasEntry>; // alias → entry
}

export interface SSOTokenStatus {
  is_valid: boolean;
  expiresAt?: Date;
  remainingMs?: number;
  status: 'valid' | 'expired' | 'expiring_soon' | 'not_logged_in' | 'not_sso';
}

export interface LoginResult {
  profile: string;
  success: boolean;
  account?: string;
  arn?: string;
  userId?: string;
  error?: string;
}

export interface DoctorCheck {
  name: string;
  status: 'pass' | 'fail' | 'warn' | 'fixing' | 'fixed';
  message: string;
  fix?: () => Promise<boolean>; // Auto-fix function
}

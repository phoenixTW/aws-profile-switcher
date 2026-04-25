import { Shescape } from 'shescape';

const shescape = new Shescape({ flagProtection: true });

export function generateExport(profile: string): string {
  return `export AWS_PROFILE=${shescape.quote(profile)}`;
}

export function quoteForShell(value: string): string {
  return shescape.quote(value);
}

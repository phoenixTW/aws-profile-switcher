import { mkdirSync } from 'node:fs';
import path from 'node:path';

import envPaths from 'env-paths';

const paths = envPaths('aws-profile-switcher', { suffix: '' });

export function getConfigDir(): string {
  const override = process.env['AWSPS_CONFIG'];
  const dir = override ?? paths.config;
  mkdirSync(dir, { recursive: true });
  return dir;
}

export function getConfigPath(): string {
  return path.join(getConfigDir(), 'config.json');
}

export function getAliasStorePath(): string {
  return path.join(getConfigDir(), 'aliases.json');
}

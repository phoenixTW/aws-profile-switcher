import { execa } from 'execa';
import pc from 'picocolors';

interface NpmVersion {
  latest: string;
}

export async function checkForUpdate(currentVersion: string): Promise<void> {
  try {
    const { stdout } = await execa('npm', ['view', '@phoenixtw/awsps', 'version'], {
      timeout: 5000,
    });
    const latest = stdout.trim();

    if (latest && latest !== currentVersion) {
      console.log(pc.yellow(`\n⚠ Update available: ${currentVersion} → ${latest}`));
      console.log(pc.dim('  Run: npm install -g @phoenixtw/awsps@latest\n'));
    }
  } catch {
    // Silently fail — update check is non-critical
  }
}

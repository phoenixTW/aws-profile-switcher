import { appendFile, readFile } from 'node:fs/promises';
import pc from 'picocolors';
import { detectShell, getShellHook, getRcPath } from './shell-hook.js';

export interface InitOptions {
  shell?: 'zsh' | 'bash';
}

export async function initCommand(options: InitOptions = {}): Promise<void> {
  const shell = options.shell ?? detectShell();

  if (shell === 'unknown') {
    console.log(pc.red('Could not detect your shell. Please specify with --shell zsh or --shell bash.'));
    process.exit(1);
  }

  const hook = getShellHook(shell);
  const rcPath = getRcPath(shell);

  console.log(pc.cyan(`\n🔧 Shell Hook Installation (${shell})\n`));

  try {
    const rcContent = await readFile(rcPath, 'utf8');
    if (rcContent.includes('awsps') && rcContent.includes('eval "$output"')) {
      console.log(pc.green(`✅ Shell hook already installed in ${rcPath}`));
      return;
    }
  } catch {
    // RC file doesn't exist yet — that's fine
  }

  const hookBlock = `\n# awsps shell hook\n${hook}\n`;

  try {
    await appendFile(rcPath, hookBlock);
    console.log(pc.green(`✅ Shell hook added to ${rcPath}`));
    console.log(pc.dim(`\n  Run: source ${rcPath}\n`));
  } catch (error) {
    console.log(pc.red(`Failed to write to ${rcPath}: ${(error as Error).message}`));
    console.log(pc.dim('Try running with sudo or add the hook manually.'));
    process.exit(1);
  }
}

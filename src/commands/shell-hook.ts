import pc from 'picocolors';

export function getShellHook(shell: 'zsh' | 'bash'): string {
  if (shell === 'zsh') {
    return `awsps() {
  local output
  output=$(command awsps use "$@" 2>&1)
  if [ $? -eq 0 ]; then
    eval "$output"
  else
    echo "$output"
    return 1
  fi
}`;
  }

  return `awsps() {
  local output
  output=$(command awsps use "$@" 2>&1)
  if [ $? -eq 0 ]; then
    eval "$output"
  else
    echo "$output"
    return 1
  fi
}`;
}

export function detectShell(): 'zsh' | 'bash' | 'unknown' {
  const shell = process.env['SHELL'] ?? '';
  if (shell.includes('zsh')) return 'zsh';
  if (shell.includes('bash')) return 'bash';
  return 'unknown';
}

export function getRcPath(shell: 'zsh' | 'bash'): string {
  const home = process.env['HOME'] ?? '~';
  if (shell === 'zsh') return `${home}/.zshrc`;
  return `${home}/.bashrc`;
}

export function displayHookInstructions(shell: 'zsh' | 'bash'): void {
  const hook = getShellHook(shell);
  const rcPath = getRcPath(shell);

  console.log(pc.cyan('\nAdd the following to your shell configuration:'));
  console.log(pc.dim(`\n  # ${rcPath}\n`));
  console.log(`  ${hook.split('\n').join('\n  ')}`);
  console.log(pc.dim(`\nThen run: source ${rcPath}\n`));
}

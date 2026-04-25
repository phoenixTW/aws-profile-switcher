import { Command } from 'commander';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function getVersion(): string {
  try {
    const pkgPath = join(__dirname, '..', 'package.json');
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
    return pkg.version ?? '0.0.0';
  } catch {
    return '0.0.0';
  }
}

const program = new Command();

program
  .name('awsps')
  .description('Interactive AWS profile switcher with SSO login, alias shortcuts, and shell hooks')
  .version(getVersion());

program
  .command('login')
  .description('Login to AWS SSO profiles')
  .option('-p, --profile <profile>', 'Login to a specific profile')
  .option('-f, --force', 'Force re-login even if token is valid')
  .action(async (options: { profile?: string; force?: boolean }) => {
    const { loginCommand } = await import('./commands/login.js');
    await loginCommand({
      profile: options.profile,
      force: options.force ?? false,
    });
  });

program
  .command('switch')
  .description('Interactively switch AWS profile')
  .action(async () => {
    const { switchCommand } = await import('./commands/switch.js');
    await switchCommand();
  });

program
  .command('use')
  .description('Switch to a profile by name or alias')
  .argument('[profile-or-alias]', 'Profile name or alias')
  .action(async (profileOrAlias?: string) => {
    const { useCommand } = await import('./commands/use.js');
    await useCommand(profileOrAlias);
  });

const configureProgram = program.command('configure').description('Configure AWS SSO');

configureProgram
  .argument('[profile]', 'Profile name to configure')
  .action(async (profile?: string) => {
    const { configureSsoCommand } = await import('./commands/configure-sso.js');
    await configureSsoCommand({ profile });
  });

configureProgram
  .command('sso')
  .description('Configure AWS SSO')
  .argument('[profile]', 'Profile name to configure')
  .action(async (profile?: string) => {
    const { configureSsoCommand } = await import('./commands/configure-sso.js');
    await configureSsoCommand({ profile });
  });

program
  .command('list')
  .description('List all AWS profiles with status')
  .action(async () => {
    const { listCommand } = await import('./commands/list.js');
    await listCommand();
  });

program
  .command('doctor')
  .description('Run health checks and auto-fix issues')
  .action(async () => {
    const { doctorCommand } = await import('./commands/doctor.js');
    await doctorCommand();
  });

program
  .command('init')
  .description('Install shell hook for profile switching')
  .option('-s, --shell <shell>', 'Shell type (zsh or bash)')
  .action(async (options: { shell?: 'zsh' | 'bash' }) => {
    const { initCommand } = await import('./commands/init.js');
    await initCommand({ shell: options.shell });
  });

program.parse();

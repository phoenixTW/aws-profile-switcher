# awsps

> Interactive AWS profile switcher with SSO login, alias shortcuts, and shell hooks

[![npm version](https://img.shields.io/npm/v/@phoenixtw/awsps.svg)](https://www.npmjs.com/package/@phoenixtw/awsps)
[![license](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](https://github.com/phoenixTW/aws-profile-switcher/blob/main/LICENSE)
[![node version](https://img.shields.io/node/v/@phoenixtw/awsps.svg)](https://nodejs.org)

## Why awsps?

Managing multiple AWS profiles is tedious, especially when using AWS SSO which requires browser authentication per session. There is no easy way to switch profiles and have the change persist in your current terminal session without manually exporting environment variables. `awsps` solves this by providing an interactive interface, automatic alias generation, and shell hooks to make switching profiles seamless.

## Features

- Interactive SSO login with session deduplication — login once per SSO session, not per profile
- Automatic abbreviation aliases — `awsps use mprod` instead of typing full profile names
- Fuzzy profile search with `awsps switch`
- Shell hooks for zsh and bash — profile changes apply in current terminal
- STS verification after login — confirm your credentials work
- Token expiry detection — know which profiles need re-login
- Health checks with `awsps doctor` — diagnose and auto-fix setup issues

## Installation

### Global install (recommended)

```bash
pnpm install -g @phoenixtw/awsps
```

Alternatively, using npm or yarn:

```bash
npm install -g @phoenixtw/awsps
# or
yarn global add @phoenixtw/awsps
```

### Shell hook setup

To enable profile switching in your current terminal, you need to install the shell hook:

```bash
awsps init
source ~/.zshrc  # or ~/.bashrc
```

## Quick Start

1. **Install and init**:
   ```bash
   pnpm install -g @phoenixtw/awsps
   awsps init
   source ~/.zshrc
   ```

2. **Configure SSO** (if you haven't already):
   ```bash
   awsps configure sso my-profile
   ```

3. **Login**:
   ```bash
   awsps login
   ```
   *Output:*
   ```
   🔐 AWS SSO Login

   Found 2 SSO profiles across 1 session(s).

   Logging in to my-org...
   Logged in to my-org ✅

   Verification Results:

   ✅ mantacares-prod  Account: 111122223333  ARN: arn:aws:sts::111122223333:assumed-role/Admin/user
   ✅ mantacares-root  Account: 111122223333  ARN: arn:aws:sts::111122223333:assumed-role/Admin/user

   Aliases generated: mprod, mroot
   ```

4. **Switch profiles**:
   ```bash
   awsps switch
   ```
   *Interactive fuzzy search opens. Select a profile.*
   ```
   export AWS_PROFILE='mantacares-prod'
   ```

## Commands

### `awsps login`

Login to AWS SSO profiles. It groups profiles by SSO session to minimize browser authentication prompts.

**Options:**
- `-p, --profile <profile>`: Login to a specific profile or alias
- `-f, --force`: Force re-login even if token is valid

**Example:**
```bash
awsps login --profile mprod
```

### `awsps switch`

Interactively switch AWS profile using fuzzy search.

**Example:**
```bash
awsps switch
```

### `awsps use <profile-or-alias>`

Switch to a profile by name or alias. This command is typically called by the shell hook.

**Example:**
```bash
awsps use mprod
# Output: export AWS_PROFILE='mantacares-prod'
```

### `awsps list`

List all AWS profiles with their aliases, SSO session, and token status.

**Example:**
```bash
awsps list
```
*Output:*
```
📋 AWS Profiles

  Profile              Alias  SSO Session  Token Status
  ─────────────────────────────────────────────────────
  mantacares-prod      mprod  my-org       ✅ Valid (4h 23m) ← current
  mantacares-root      mroot  my-org       ✅ Valid (4h 23m)
  mantacares-staging   mstg   my-org       ⚠️  Expiring soon (12m)
  static-creds         —      —            —
```

### `awsps configure [profile]` / `awsps configure sso [profile]`

Wraps `aws configure sso` to set up a new profile and automatically generates an alias for it.

**Example:**
```bash
awsps configure sso new-profile
```

### `awsps doctor`

Run health checks to ensure your environment is correctly configured and offer auto-fixes for common issues.

**Example:**
```bash
awsps doctor
```
*Output:*
```
🏥 AWS Profile Switcher Doctor

  ✅ Node.js v22.1.0 (>= 20)
  ✅ AWS CLI v2.18.0
  ✅ AWS config readable (4 profiles)
  ⚠️  No shell hook detected in /Users/user/.zshrc
  ✅ Shell hook → Fixed ✅
  ✅ Alias store healthy (4 aliases)
  ✅ Config directory writable

  7/7 checks passing.
```

### `awsps init [--shell zsh|bash]`

Install the shell hook for profile switching.

**Options:**
- `-s, --shell <shell>`: Specify shell type (zsh or bash)

## How It Works

### Alias Generation

`awsps` uses a heuristic to generate short, intuitive aliases for your profiles:
- `mantacares-prod` → `mprod`
- `mantacares-root` → `mroot`
- `staging` → `stg`
- `MyCompanyProd` → `mcp`

### SSO Session Deduplication

Profiles sharing the same `sso_session` (or `sso_start_url` in legacy configs) are grouped together. When you login, `awsps` only triggers one browser authentication per unique session.

### Token Cache

`awsps` reads the AWS SSO token cache in `~/.aws/sso/cache/` to detect token expiry. It uses a 15-minute refresh window, matching the behavior of the AWS CLI.

## Configuration

### Environment Variables

- `AWS_PROFILE`: Set by the shell hook after switching profiles.
- `AWSPS_CONFIG`: Override the default configuration directory.

### Config Location

By default, `awsps` stores its configuration (like aliases) in:
- macOS/Linux: `~/.config/aws-profile-switcher/config.json` (XDG compliant)

## Requirements

- Node.js >= 20
- AWS CLI v2+
- zsh or bash

## Development

```bash
pnpm install
pnpm run build
pnpm test
```

## Contributing

Contributions are welcome! Check out the [Contributing Guide](CONTRIBUTING.md) for detailed instructions on:

- Development setup and available scripts
- Code style and formatting conventions
- Commit message format (Conventional Commits)
- Pull request process and guidelines
- Reporting bugs and requesting features

## License

[Apache License 2.0](LICENSE) — see [LICENSE](LICENSE) for full text.

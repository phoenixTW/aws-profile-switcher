# Contributing to awsps

Thank you for your interest in contributing to `awsps`! This document provides guidelines and instructions for contributing.

## Development Setup

### Prerequisites

- Node.js >= 20
- pnpm (install via `corepack enable` or `npm install -g pnpm`)
- AWS CLI v2+ (for integration testing)

### Getting Started

```bash
git clone https://github.com/phoenixTW/aws-profile-switcher.git
cd aws-profile-switcher
pnpm install
```

### Available Scripts

| Command | Description |
|---------|-------------|
| `pnpm run build` | Build the CLI (ESM + CJS via tsup) |
| `pnpm run dev` | Watch mode build |
| `pnpm run typecheck` | Run TypeScript type checking |
| `pnpm run lint` | Lint source files with ESLint |
| `pnpm test` | Run all tests |
| `pnpm run test:watch` | Run tests in watch mode |
| `pnpm run test:coverage` | Run tests with coverage report |

## Project Structure

- `src/commands/` — CLI command handlers
- `src/lib/` — Core library modules
- `src/types.ts` — Shared TypeScript interfaces
- `src/__tests__/unit/` — Unit tests
- `src/__tests__/integration/` — Integration tests
- `src/__tests__/fixtures/` — Test fixtures

## Code Style

- TypeScript strict mode is enabled
- ESM-first with `.js` import extensions
- Follow existing patterns in the codebase
- Run `pnpm run lint` and `pnpm run typecheck` before submitting

### Formatting

Prettier is configured with:
- Single quotes
- Trailing commas
- 100 character line width
- 2 space indentation

## Commit Messages

This project uses [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` — New features
- `fix:` — Bug fixes
- `docs:` — Documentation changes
- `refactor:` — Code refactoring
- `test:` — Adding or updating tests
- `chore:` — Build, CI, or tooling changes
- `perf:` — Performance improvements

Commits are used to generate the changelog via release-please.

## Pull Requests

1. Fork the repository
2. Create a feature branch (`git checkout -b feat/my-feature`)
3. Make your changes
4. Ensure all checks pass:
   ```bash
   pnpm run typecheck
   pnpm run lint
   pnpm test
   pnpm run build
   ```
5. Commit with conventional commit messages
6. Push and open a Pull Request against `main`

### PR Guidelines

- Keep PRs focused on a single concern
- Include tests for new functionality
- Update documentation if needed
- Reference any related issues

## Testing

### Unit Tests

Unit tests go in `src/__tests__/unit/`. They test individual functions and modules in isolation.

```typescript
import { describe, it, expect } from 'vitest';
import { myFunction } from '../../lib/my-module.js';

describe('myFunction', () => {
  it('should do something', () => {
    expect(myFunction('input')).toBe('expected');
  });
});
```

### Integration Tests

Integration tests go in `src/__tests__/integration/`. They test command flows with mocked external dependencies.

### Test Fixtures

Test fixtures (AWS config files, SSO cache entries) go in `src/__tests__/fixtures/`.

### Running Specific Tests

```bash
pnpm test                    # All tests
pnpm vitest run src/__tests__/unit/alias-generator.test.ts  # Specific file
pnpm run test:watch          # Watch mode
```

## Reporting Issues

When reporting bugs, please include:

1. `awsps` version (`awsps --version`)
2. Node.js version (`node --version`)
3. OS and shell (zsh/bash)
4. Steps to reproduce
5. Expected vs actual behavior
6. Output of `awsps doctor` if applicable

## Feature Requests

Feature requests are welcome. Please:

1. Check existing issues first
2. Describe the use case, not just the solution
3. Explain why existing functionality doesn't meet your needs

## License

By contributing to this project, you agree that your contributions will be licensed under the [Apache License 2.0](LICENSE).

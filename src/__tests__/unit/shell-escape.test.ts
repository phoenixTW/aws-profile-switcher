import { describe, it, expect, vi } from 'vitest';

vi.mock('shescape', () => {
  class Shescape {
    quote(value: string): string {
      const escaped = value.replace(/[^A-Za-z0-9_/-]/g, (char) => `\\${char}`);
      return `'${escaped}'`;
    }
  }

  return { Shescape };
});

import { generateExport, quoteForShell } from '../../lib/shell-escape.js';

describe('generateExport', () => {
  it('should generate safe export for simple profile name', () => {
    const result = generateExport('my-profile');
    expect(result).toContain('export AWS_PROFILE=');
    expect(result).toContain('my-profile');
  });

  it('should handle profile names with spaces', () => {
    const result = generateExport('my profile');
    expect(result).toContain('export AWS_PROFILE=');
    expect(result).not.toBe('export AWS_PROFILE=my profile');
  });

  it('should escape special characters', () => {
    const result = generateExport('$(whoami)');
    expect(result).not.toContain('$(whoami)');
  });
});

describe('quoteForShell', () => {
  it('should quote strings safely', () => {
    const result = quoteForShell('simple');
    expect(result).toBe("'simple'");
  });
});

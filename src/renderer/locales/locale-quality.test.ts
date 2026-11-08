import { execFileSync } from 'child_process';
import path from 'path';
import { describe, expect, it } from 'vitest';

describe('locale translation files', () => {
  it('passes check:i18n (keys, no CAT/XML artifacts, placeholder parity vs English)', () => {
    const projectRoot = path.resolve(import.meta.dirname ?? __dirname, '..', '..', '..');
    const output = execFileSync('node', [path.join(projectRoot, 'scripts', 'check-i18n.mjs')], {
      encoding: 'utf8',
      stdio: 'pipe',
      cwd: projectRoot,
    });
    expect(output).toContain('check:i18n passed');
    // Spawns the full check (every key in 15 locales); 5s is too tight while the pre-commit
    // hook or a parallel suite is running alongside it.
  }, 30_000);
});

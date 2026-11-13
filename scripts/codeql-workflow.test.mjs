// @vitest-environment node
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { load } from 'js-yaml';
import { describe, expect, it } from 'vitest';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const workflow = load(fs.readFileSync(path.join(root, '.github/workflows/codeql.yaml'), 'utf8'));
const job = workflow.jobs.analyze;
const scope = workflow.jobs.scope;
const filter = scope.steps[0];
const filters = load(filter.with.filters);
const swiftInputs = filters.swift;
const selected = "matrix.language != 'swift' || needs.scope.outputs.swift == 'true'";

/** Run the scope job's matrix step and parse the matrix it writes to GITHUB_OUTPUT. */
function matrixFromStep(script, swift) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'codeql-matrix-'));
  const githubOutput = path.join(dir, 'output');
  const result = spawnSync('bash', ['-c', script], {
    env: { ...process.env, SWIFT: swift, GITHUB_OUTPUT: githubOutput },
    encoding: 'utf8',
  });
  expect(result.status, result.stderr).toBe(0);
  const line = fs
    .readFileSync(githubOutput, 'utf8')
    .split('\n')
    .find((entry) => entry.startsWith('matrix='));
  expect(line).toBeTruthy();
  return JSON.parse(line.slice('matrix='.length));
}

/** Small, portable glob syntax shared by the workflow filter and Node's matcher. */
function selectsSwift(file) {
  return swiftInputs.some((pattern) => path.matchesGlob(file, pattern));
}

describe('CodeQL advanced workflow', () => {

  it('limits only unchanged PR Swift inputs and fails closed on detector errors', () => {
    expect(job.needs).toBe('scope');
    expect(scope.outputs.swift).toBe(
      "${{ github.event_name != 'pull_request' || steps.filter.outcome != 'success' || " +
        "steps.filter.outputs.all_count == '' || steps.filter.outputs.all_count >= 3000 || " +
        "steps.filter.outputs.swift != 'false' }}",
    );
    expect(filter.if).toBe("github.event_name == 'pull_request'");
    expect(filter['continue-on-error']).toBe(true);
    expect(filter.uses).toMatch(/^dorny\/paths-filter@[a-f0-9]{40}$/);
    expect(scope.permissions).toEqual({ contents: 'read', 'pull-requests': 'read' });
    expect(scope.steps).toHaveLength(2);
    expect(scope.outputs.matrix).toBe('${{ steps.matrix.outputs.matrix }}');
    expect(filters.all).toEqual(['**']);
    for (const file of ['README.md', 'native/ai/apple/main.swift']) {
      expect(path.matchesGlob(file, filters.all[0])).toBe(true);
    }
    for (const step of job.steps.filter(
      (step) =>
        step.uses && !step.uses.includes('/autobuild@') && !step.uses.includes('upload-artifact@'),
    )) {
      expect(step.if).toBe(selected);
    }
    expect(job.steps.find((step) => step.name === 'Record unchanged Swift inputs').if).toBe(
      "matrix.language == 'swift' && needs.scope.outputs.swift != 'true'",
    );
  });

  it.each([
    'Package.swift',
    'native/ai/apple/main.swift',
    'native/ai/apple/deleted.swift',
    'native/ai/apple/future/new.swift',
    'other/new.swift',
    'native/ai/apple/Package.resolved',
    'scripts/build-ai-helper.mjs',
    'scripts/codeql-workflow.test.mjs',
    '.github/workflows/codeql.yaml',
    '.github/codeql/codeql-config.yml',
    'package.json',
    'pnpm-lock.yaml',
    'pnpm-workspace.yaml',
  ])('scans Swift when its source, build or analysis input changes: %s', (file) => {
    expect(selectsSwift(file)).toBe(true);
  });

  it.each(['README.md', 'docs/ci-cd.md', 'src/renderer/App.tsx', 'src/main/database.ts'])(
    'avoids a redundant Swift PR build for %s',
    (file) => {
      expect(selectsSwift(file)).toBe(false);
    },
  );

  it('validates PRs and dispatches without uploading until the explicit migration switch', () => {
    const enabled =
      "github.event_name == 'pull_request' || github.event_name == 'workflow_dispatch' || " +
      "vars.CODEQL_ADVANCED_ENABLED == 'true'";
    expect(job.if).toBe(enabled);
    expect(scope.if).toBe(enabled);
    const analyze = job.steps.find((step) => step.name === 'Perform CodeQL Analysis');
    expect(analyze.with.upload).toBe(
      "${{ vars.CODEQL_ADVANCED_ENABLED == 'true' && 'always' || 'never' }}",
    );
    expect(analyze.with.category).toBe('/language:${{ matrix.language }}');
    expect(job.permissions).toEqual({ contents: 'read', 'security-events': 'write' });
    expect(workflow.permissions).toEqual({ contents: 'read' });
    expect(job.steps[0].with['persist-credentials']).toBe(false);
  });

  it('scans protected events and retains independent per-language SARIF artifacts', () => {
    expect(workflow.on).toEqual({
      push: { branches: ['main'] },
      pull_request: { branches: ['main'] },
      merge_group: null,
      schedule: [{ cron: '23 7 * * 1' }],
      workflow_dispatch: null,
    });
    expect(workflow.concurrency['cancel-in-progress']).toBe(true);
    expect(workflow.concurrency.group).toContain('github.event.pull_request.number || github.ref');
    const artifact = job.steps.find((step) => step.name === 'Upload analysis results');
    expect(artifact.if).toBe(`always() && (${selected})`);
    expect(artifact.with.name).toBe('codeql-sarif-${{ matrix.language }}');
    expect(artifact.with.path).toBe('${{ runner.temp }}/codeql-results');
    expect(artifact.with['retention-days']).toBe(7);
  });
});

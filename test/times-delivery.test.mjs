import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

import {
  classifyDelivery,
  installDelivery,
  validateStaging,
} from '../scripts/times-delivery.mjs';

const SOURCE_SHA = '0123456789abcdef0123456789abcdef01234567';

async function writeJson(root, path, value) {
  const file = join(root, path);
  await mkdir(join(file, '..'), { recursive: true });
  await writeFile(file, `${JSON.stringify(value)}\n`, 'utf8');
}

async function makeArtifact({ runId = '100', sha = SOURCE_SHA, publishedAt = '2026-08-17T08:00:00Z' } = {}) {
  const root = await mkdtemp(join(tmpdir(), 'times-artifact-'));
  await writeJson(root, 'delivery-manifest.json', {
    schemaVersion: 1,
    sourceRepository: 'yzrswork/yzrs-times',
    sourceSha: sha,
    sourceRunId: runId,
    edition: 'morning',
    publishedAt,
  });
  await writeJson(root, 'data/latest.json', { schemaVersion: 1, edition: 'morning' });
  await writeJson(root, 'data/graph.json', { nodes: [] });
  await writeJson(root, 'data/index-manifest.json', { schemaVersion: 1, months: ['2026-08'] });
  await writeJson(root, 'data/issues-index-2026-08.json', { issues: [] });
  await writeJson(root, 'data/issues/2026-08-17-morning.json', { schemaVersion: 1 });
  return root;
}

async function makeState(root, state) {
  const path = join(root, 'times-sync-state.json');
  await writeJson(root, 'times-sync-state.json', state);
  return path;
}

const inputsFor = (runId = '100', sha = SOURCE_SHA) => ({
  sourceRunId: runId,
  sourceSha: sha,
});

test('A: normal artifact is accepted', async () => {
  const artifact = await makeArtifact();
  const stateRoot = await mkdtemp(join(tmpdir(), 'times-state-'));
  const result = await validateStaging(artifact, inputsFor(), join(stateRoot, 'times-sync-state.json'));
  assert.equal(result.status, 'ACCEPT');

  const siteRoot = await mkdtemp(join(tmpdir(), 'times-site-'));
  const destination = join(siteRoot, 'public', 'data');
  const installed = await installDelivery(
    artifact,
    inputsFor(),
    destination,
    join(destination, 'times-sync-state.json'),
  );
  assert.equal(installed.status, 'ACCEPT');
  assert.match(await readFile(join(destination, 'times-sync-state.json'), 'utf8'), /"lastSourceRunId": "100"/);
});

test('B: same run is a no-op', () => {
  const manifest = {
    sourceRunId: '100',
    sourceSha: SOURCE_SHA,
    publishedAt: '2026-08-17T08:00:00Z',
    edition: 'morning',
  };
  const state = {
    lastSourceRunId: '100',
    lastSourceSha: SOURCE_SHA,
    lastPublishedAt: '2026-08-17T08:00:00Z',
    lastEdition: 'morning',
  };
  assert.equal(classifyDelivery(manifest, state).status, 'NO-OP');
});

test('C: older delivery is rejected without replacement', () => {
  const manifest = {
    sourceRunId: '99',
    sourceSha: SOURCE_SHA,
    publishedAt: '2026-08-17T07:59:59Z',
    edition: 'morning',
  };
  const state = {
    lastSourceRunId: '100',
    lastSourceSha: SOURCE_SHA,
    lastPublishedAt: '2026-08-17T08:00:00Z',
    lastEdition: 'morning',
  };
  assert.equal(classifyDelivery(manifest, state).status, 'REJECT');
});

test('D: HTML or another unexpected file is rejected', async () => {
  const artifact = await makeArtifact();
  await writeFile(join(artifact, 'public.html'), '<!doctype html>\n', 'utf8');
  const stateRoot = await mkdtemp(join(tmpdir(), 'times-state-'));
  await assert.rejects(
    validateStaging(artifact, inputsFor(), join(stateRoot, 'times-sync-state.json')),
    /unexpected artifact path or type/,
  );
});

test('E: malformed JSON is rejected', async () => {
  const artifact = await makeArtifact();
  await writeFile(join(artifact, 'data/latest.json'), '{not json\n', 'utf8');
  const stateRoot = await mkdtemp(join(tmpdir(), 'times-state-'));
  await assert.rejects(
    validateStaging(artifact, inputsFor(), join(stateRoot, 'times-sync-state.json')),
    /invalid JSON at data\/latest\.json/,
  );
});

test('F: manifest and workflow input mismatch is rejected', async () => {
  const artifact = await makeArtifact();
  const stateRoot = await mkdtemp(join(tmpdir(), 'times-state-'));
  await assert.rejects(
    validateStaging(artifact, inputsFor('101'), join(stateRoot, 'times-sync-state.json')),
    /source_run_id does not match/,
  );
});

test('G: failed validation leaves the accepted data unchanged', async () => {
  const artifact = await makeArtifact();
  await writeFile(join(artifact, 'data/bad.html'), '<p>no</p>\n', 'utf8');
  const siteRoot = await mkdtemp(join(tmpdir(), 'times-site-'));
  const destination = join(siteRoot, 'public', 'data');
  const statePath = await makeState(join(siteRoot, 'public', 'data'), {
    schemaVersion: 1,
    lastSourceRunId: '90',
    lastSourceSha: SOURCE_SHA,
    lastPublishedAt: '2026-08-17T07:00:00Z',
    lastEdition: 'morning',
  });
  await writeJson(siteRoot, 'public/data/latest.json', { accepted: true });
  const before = await readFile(join(destination, 'latest.json'), 'utf8');
  await assert.rejects(
    installDelivery(artifact, inputsFor(), destination, statePath),
    /unexpected artifact path or type/,
  );
  assert.equal(await readFile(join(destination, 'latest.json'), 'utf8'), before);
});

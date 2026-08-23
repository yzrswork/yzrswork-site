import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

import {
  classifyDelivery,
  digestDirectory,
  installDelivery,
  validateStaging,
  verifySourceRunProvenance,
} from '../scripts/times-delivery.mjs';

const SOURCE_SHA = '0123456789abcdef0123456789abcdef01234567';
const RUN_HEAD_SHA = 'fedcba9876543210fedcba9876543210fedcba98';
const OTHER_SHA = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const PUBLISHED_AT = '2026-08-17T08:00:00.000Z';
const NEXT_PUBLISHED_AT = '2026-08-18T08:00:00.000Z';

async function writeJson(root, path, value) {
  const file = join(root, path);
  await mkdir(join(file, '..'), { recursive: true });
  await writeFile(file, `${JSON.stringify(value)}\n`, 'utf8');
}

async function makeArtifact({
  runId = '100',
  sha = SOURCE_SHA,
  publishedAt = PUBLISHED_AT,
  edition = 'morning',
  issues,
} = {}) {
  const root = await mkdtemp(join(tmpdir(), 'times-artifact-'));
  const issueList = issues ?? [{
    schemaVersion: 1,
    issueNo: 1,
    edition,
    date: '2026-08-17',
    generatedAt: publishedAt,
  }];
  const latest = issueList.at(-1);
  await writeJson(root, 'delivery-manifest.json', {
    schemaVersion: 1,
    sourceRepository: 'yzrswork/yzrs-times',
    sourceSha: sha,
    sourceRunId: runId,
    edition,
    publishedAt,
  });
  await writeJson(root, 'data/latest.json', latest);
  await writeJson(root, 'data/graph.json', { schemaVersion: 2, issues: [], articles: [] });
  const byMonth = new Map();
  for (const issue of issueList) {
    const month = issue.date.slice(0, 7);
    if (!byMonth.has(month)) byMonth.set(month, []);
    byMonth.get(month).push({
      issueNo: issue.issueNo,
      date: issue.date,
      edition: issue.edition,
      path: `issues/${issue.date}-${issue.edition}.json`,
    });
    await writeJson(root, `data/issues/${issue.date}-${issue.edition}.json`, issue);
  }
  await writeJson(root, 'data/index-manifest.json', {
    schemaVersion: 1,
    months: [...byMonth.keys()].sort(),
  });
  for (const [month, monthIssues] of byMonth) {
    await writeJson(root, `data/issues-index-${month}.json`, {
      schemaVersion: 1,
      month,
      issues: monthIssues,
    });
  }
  return root;
}

async function makeState(root, state) {
  const path = join(root, 'times-sync-state.json');
  await writeJson(root, 'times-sync-state.json', state);
  return path;
}

const inputsFor = (runId = '100', sha = SOURCE_SHA, edition = '', publishedAt = PUBLISHED_AT) => ({
  sourceRunId: runId,
  sourceSha: sha,
  edition,
  publishedAt: edition ? publishedAt : '',
});

function archiveIssues(dates, latestGeneratedAt) {
  return dates.map((date, index) => ({
    schemaVersion: 1,
    issueNo: index + 1,
    edition: 'morning',
    date,
    generatedAt: index === dates.length - 1
      ? latestGeneratedAt
      : `${date}T08:00:00.000Z`,
  }));
}

async function installAcceptedArchive(dates, publishedAt = PUBLISHED_AT) {
  const artifact = await makeArtifact({
    runId: '90',
    publishedAt,
    issues: archiveIssues(dates, publishedAt),
  });
  const siteRoot = await mkdtemp(join(tmpdir(), 'times-site-'));
  const destination = join(siteRoot, 'public', 'data');
  const statePath = join(destination, 'times-sync-state.json');
  await installDelivery(
    artifact,
    inputsFor('90', SOURCE_SHA, 'morning', publishedAt),
    destination,
    statePath,
  );
  return { destination, statePath };
}

function sourceRun(overrides = {}) {
  return {
    id: 100,
    repository: { full_name: 'yzrswork/yzrs-times' },
    head_repository: { full_name: 'yzrswork/yzrs-times' },
    head_branch: 'main',
    ref: null,
    path: '.github/workflows/publish.yml',
    event: 'schedule',
    status: 'completed',
    conclusion: 'success',
    head_sha: RUN_HEAD_SHA,
    ...overrides,
  };
}

function publicationCommit(overrides = {}) {
  return {
    sha: SOURCE_SHA,
    html_url: `https://github.com/yzrswork/yzrs-times/commit/${SOURCE_SHA}`,
    parents: [{ sha: RUN_HEAD_SHA }],
    ...overrides,
  };
}

test('A: legitimate current snapshot is accepted and installed', async () => {
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

test('B: a short source SHA is rejected', async () => {
  const artifact = await makeArtifact({ sha: SOURCE_SHA.slice(0, 7) });
  const stateRoot = await mkdtemp(join(tmpdir(), 'times-state-'));
  await assert.rejects(
    validateStaging(artifact, inputsFor('100', SOURCE_SHA.slice(0, 7)), join(stateRoot, 'times-sync-state.json')),
    /full 40-character hexadecimal Git SHA/,
  );
});

test('C: manifest and latest edition mismatch is rejected', async () => {
  const artifact = await makeArtifact();
  await writeJson(artifact, 'data/latest.json', {
    schemaVersion: 1,
    issueNo: 1,
    edition: 'midday',
    date: '2026-08-17',
    generatedAt: PUBLISHED_AT,
  });
  const stateRoot = await mkdtemp(join(tmpdir(), 'times-state-'));
  await assert.rejects(
    validateStaging(artifact, inputsFor(), join(stateRoot, 'times-sync-state.json')),
    /edition does not match delivery manifest/,
  );
});

test('D: manifest and latest generatedAt mismatch is rejected', async () => {
  const artifact = await makeArtifact();
  await writeJson(artifact, 'data/latest.json', {
    schemaVersion: 1,
    issueNo: 1,
    edition: 'morning',
    date: '2026-08-17',
    generatedAt: '2026-08-17T08:00:01.000Z',
  });
  const stateRoot = await mkdtemp(join(tmpdir(), 'times-state-'));
  await assert.rejects(
    validateStaging(artifact, inputsFor(), join(stateRoot, 'times-state.json')),
    /generatedAt does not match delivery manifest/,
  );
});

test('E: missing canonical issue file is rejected', async () => {
  const artifact = await makeArtifact();
  await rm(join(artifact, 'data/issues/2026-08-17-morning.json'));
  const stateRoot = await mkdtemp(join(tmpdir(), 'times-state-'));
  await assert.rejects(
    validateStaging(artifact, inputsFor(), join(stateRoot, 'times-sync-state.json')),
    /canonical latest issue entry|2026-08-17-morning\.json is required/,
  );
});

test('F: canonical issue identity mismatch is rejected', async () => {
  const artifact = await makeArtifact();
  await writeJson(artifact, 'data/issues/2026-08-17-morning.json', {
    schemaVersion: 1,
    issueNo: 2,
    edition: 'morning',
    date: '2026-08-17',
    generatedAt: PUBLISHED_AT,
  });
  const stateRoot = await mkdtemp(join(tmpdir(), 'times-state-'));
  await assert.rejects(
    validateStaging(artifact, inputsFor(), join(stateRoot, 'times-sync-state.json')),
    /issueNo does not match data\/latest\.json/,
  );
});

test('G: latest month index without the canonical entry is rejected', async () => {
  const artifact = await makeArtifact();
  await writeJson(artifact, 'data/issues-index-2026-08.json', {
    schemaVersion: 1,
    month: '2026-08',
    issues: [],
  });
  const stateRoot = await mkdtemp(join(tmpdir(), 'times-state-'));
  await assert.rejects(
    validateStaging(artifact, inputsFor(), join(stateRoot, 'times-sync-state.json')),
    /missing the canonical latest issue entry/,
  );
});

test('H: invalid graph structure is rejected', async () => {
  const artifact = await makeArtifact();
  await writeJson(artifact, 'data/graph.json', { schemaVersion: 2, issues: [] });
  const stateRoot = await mkdtemp(join(tmpdir(), 'times-state-'));
  await assert.rejects(
    validateStaging(artifact, inputsFor(), join(stateRoot, 'times-sync-state.json')),
    /graph\.json articles must be an array/,
  );
});

test('I: unexpected extra JSON path is rejected', async () => {
  const artifact = await makeArtifact();
  await writeJson(artifact, 'data/unexpected.json', {});
  const stateRoot = await mkdtemp(join(tmpdir(), 'times-state-'));
  await assert.rejects(
    validateStaging(artifact, inputsFor(), join(stateRoot, 'times-sync-state.json')),
    /unexpected artifact path or type/,
  );
});

test('J: same run is a no-op', () => {
  const manifest = {
    sourceRunId: '100',
    sourceSha: SOURCE_SHA,
    publishedAt: PUBLISHED_AT,
    edition: 'morning',
  };
  const state = {
    lastSourceRunId: '100',
    lastSourceSha: SOURCE_SHA,
    lastPublishedAt: PUBLISHED_AT,
    lastEdition: 'morning',
  };
  assert.equal(classifyDelivery(manifest, state).status, 'NO-OP');
});

test('K: older delivery is rejected', () => {
  const manifest = {
    sourceRunId: '99',
    sourceSha: SOURCE_SHA,
    publishedAt: '2026-08-17T07:59:59.000Z',
    edition: 'morning',
  };
  const state = {
    lastSourceRunId: '100',
    lastSourceSha: SOURCE_SHA,
    lastPublishedAt: PUBLISHED_AT,
    lastEdition: 'morning',
  };
  assert.equal(classifyDelivery(manifest, state).status, 'REJECT');
});

test('L: failed semantic validation leaves accepted Site data unchanged', async () => {
  const artifact = await makeArtifact();
  await writeJson(artifact, 'data/graph.json', { schemaVersion: 2, issues: [] });
  const siteRoot = await mkdtemp(join(tmpdir(), 'times-site-'));
  const destination = join(siteRoot, 'public', 'data');
  const statePath = await makeState(destination, {
    schemaVersion: 1,
    lastSourceRunId: '90',
    lastSourceSha: SOURCE_SHA,
    lastPublishedAt: '2026-08-17T07:00:00.000Z',
    lastEdition: 'morning',
  });
  await writeJson(siteRoot, 'public/data/latest.json', { accepted: true });
  const before = await readFile(join(destination, 'latest.json'), 'utf8');
  await assert.rejects(
    installDelivery(artifact, inputsFor(), destination, statePath),
    /graph\.json articles must be an array/,
  );
  assert.equal(await readFile(join(destination, 'latest.json'), 'utf8'), before);
});

test('M: correct publish workflow and edition provenance is accepted', () => {
  assert.deepEqual(verifySourceRunProvenance({
    run: sourceRun(),
    publicationCommit: publicationCommit(),
    sourceRunId: '100',
    sourceSha: SOURCE_SHA,
    edition: 'morning',
  }), {
    sourceRunId: '100',
    sourceSha: SOURCE_SHA,
    edition: 'morning',
    workflow: '.github/workflows/publish.yml',
  });
});

test('N: wrong workflow provenance is rejected', () => {
  assert.throws(() => verifySourceRunProvenance({
    run: sourceRun({ path: '.github/workflows/publish-midday.yml' }),
    publicationCommit: publicationCommit(),
    sourceRunId: '100',
    sourceSha: SOURCE_SHA,
    edition: 'morning',
  }), /workflow does not match/);
});

test('O: wrong branch provenance is rejected', () => {
  assert.throws(() => verifySourceRunProvenance({
    run: sourceRun({ head_branch: 'feature/test' }),
    publicationCommit: publicationCommit(),
    sourceRunId: '100',
    sourceSha: SOURCE_SHA,
    edition: 'morning',
  }), /not for main/);
});

test('P: publication commit parent mismatch is rejected', () => {
  assert.throws(() => verifySourceRunProvenance({
    run: sourceRun(),
    publicationCommit: publicationCommit({ parents: [{ sha: OTHER_SHA }] }),
    sourceRunId: '100',
    sourceSha: SOURCE_SHA,
    edition: 'morning',
  }), /not created from the source run head/);
});

test('Q: append-only archive transition is accepted', async () => {
  const currentDates = ['2026-08-14', '2026-08-15', '2026-08-16'];
  const { statePath } = await installAcceptedArchive(currentDates);
  const incoming = await makeArtifact({
    runId: '100',
    sha: OTHER_SHA,
    publishedAt: NEXT_PUBLISHED_AT,
    issues: archiveIssues([...currentDates, '2026-08-17'], NEXT_PUBLISHED_AT),
  });

  const result = await validateStaging(
    incoming,
    inputsFor('100', OTHER_SHA, 'morning', NEXT_PUBLISHED_AT),
    statePath,
  );
  assert.equal(result.status, 'ACCEPT');
});

test('R: identical archive set is accepted for a newer valid delivery', async () => {
  const currentDates = ['2026-08-14', '2026-08-15', '2026-08-16'];
  const { statePath } = await installAcceptedArchive(currentDates);
  const incoming = await makeArtifact({
    runId: '100',
    sha: OTHER_SHA,
    publishedAt: NEXT_PUBLISHED_AT,
    issues: archiveIssues(currentDates, NEXT_PUBLISHED_AT),
  });

  const result = await validateStaging(
    incoming,
    inputsFor('100', OTHER_SHA, 'morning', NEXT_PUBLISHED_AT),
    statePath,
  );
  assert.equal(result.status, 'ACCEPT');
});

test('S: historical issue removal is rejected without changing accepted data', async () => {
  const currentDates = ['2026-08-14', '2026-08-15', '2026-08-16'];
  const { destination, statePath } = await installAcceptedArchive(currentDates);
  const incoming = await makeArtifact({
    runId: '100',
    sha: OTHER_SHA,
    publishedAt: NEXT_PUBLISHED_AT,
    issues: archiveIssues(currentDates.slice(1), NEXT_PUBLISHED_AT),
  });
  const before = await digestDirectory(destination);

  await assert.rejects(
    installDelivery(
      incoming,
      inputsFor('100', OTHER_SHA, 'morning', NEXT_PUBLISHED_AT),
      destination,
      statePath,
    ),
    /removes previously accepted issue file: issues\/2026-08-14-morning\.json/,
  );
  assert.equal(await digestDirectory(destination), before);
});

test('T: deletion from the middle of accepted history is rejected', async () => {
  const currentDates = ['2026-08-14', '2026-08-15', '2026-08-16', '2026-08-17'];
  const { statePath } = await installAcceptedArchive(currentDates);
  const incomingDates = ['2026-08-14', '2026-08-15', '2026-08-17'];
  const incoming = await makeArtifact({
    runId: '100',
    sha: OTHER_SHA,
    publishedAt: NEXT_PUBLISHED_AT,
    issues: archiveIssues(incomingDates, NEXT_PUBLISHED_AT),
  });

  await assert.rejects(
    validateStaging(
      incoming,
      inputsFor('100', OTHER_SHA, 'morning', NEXT_PUBLISHED_AT),
      statePath,
    ),
    /removes previously accepted issue file: issues\/2026-08-16-morning\.json/,
  );
});

test('U: a month index cannot silently drop an accepted historical issue', async () => {
  const currentDates = ['2026-08-14', '2026-08-15', '2026-08-16'];
  const { statePath } = await installAcceptedArchive(currentDates);
  const incomingIssues = archiveIssues(currentDates, NEXT_PUBLISHED_AT);
  const incoming = await makeArtifact({
    runId: '100',
    sha: OTHER_SHA,
    publishedAt: NEXT_PUBLISHED_AT,
    issues: incomingIssues,
  });
  await writeJson(incoming, 'data/issues-index-2026-08.json', {
    schemaVersion: 1,
    month: '2026-08',
    issues: [incomingIssues[0], incomingIssues[2]].map((issue) => ({
      issueNo: issue.issueNo,
      date: issue.date,
      edition: issue.edition,
      path: `issues/${issue.date}-${issue.edition}.json`,
    })),
  });

  await assert.rejects(
    validateStaging(
      incoming,
      inputsFor('100', OTHER_SHA, 'morning', NEXT_PUBLISHED_AT),
      statePath,
    ),
    /removes previously accepted issue from issues-index-2026-08\.json: issues\/2026-08-15-morning\.json/,
  );
});

test('V: index manifest cannot silently hide a previously accepted month', async () => {
  const currentDates = ['2026-07-31', '2026-08-01'];
  const { statePath } = await installAcceptedArchive(currentDates);
  const incoming = await makeArtifact({
    runId: '100',
    sha: OTHER_SHA,
    publishedAt: NEXT_PUBLISHED_AT,
    issues: archiveIssues(currentDates, NEXT_PUBLISHED_AT),
  });
  await writeJson(incoming, 'data/index-manifest.json', {
    schemaVersion: 1,
    months: ['2026-08'],
  });

  await assert.rejects(
    validateStaging(
      incoming,
      inputsFor('100', OTHER_SHA, 'morning', NEXT_PUBLISHED_AT),
      statePath,
    ),
    /removes previously accepted month from index-manifest\.json: 2026-07/,
  );
});

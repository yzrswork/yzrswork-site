import { createHash } from 'node:crypto';
import {
  access,
  copyFile,
  lstat,
  mkdtemp,
  mkdir,
  readFile,
  readdir,
  rename,
  rm,
  writeFile,
} from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const DELIVERY_SCHEMA_VERSION = 1;
export const SOURCE_REPOSITORY = 'yzrswork/yzrs-times';
export const DELIVERY_MANIFEST = 'delivery-manifest.json';
export const TIMES_STATE_FILE = 'times-sync-state.json';
export const SUPPORTED_EDITIONS = Object.freeze(['morning', 'midday']);
export const PUBLISH_WORKFLOW_BY_EDITION = Object.freeze({
  morning: '.github/workflows/publish.yml',
  midday: '.github/workflows/publish-midday.yml',
});

const REQUIRED_DATA_FILES = [
  'data/latest.json',
  'data/graph.json',
  'data/index-manifest.json',
];
const ALLOWED_EVENTS = new Set(['schedule', 'workflow_dispatch']);
const ISSUE_PATH_PATTERN = /^data\/issues\/\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])-(?:morning|midday)\.json$/;
const MONTH_INDEX_PATH_PATTERN = /^data\/issues-index-\d{4}-(?:0[1-9]|1[0-2])\.json$/;

export class DeliveryError extends Error {
  constructor(message) {
    super(message);
    this.name = 'DeliveryError';
  }
}

function fail(message) {
  throw new DeliveryError(message);
}

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function normalizeRunId(value, label = 'sourceRunId') {
  const text = String(value ?? '').trim();
  if (!/^\d+$/.test(text) || BigInt(text) <= 0n) {
    fail(`${label} must be a positive integer`);
  }
  return text;
}

export function normalizeSha(value, label = 'sourceSha') {
  const text = String(value ?? '').trim().toLowerCase();
  if (!/^[0-9a-f]{40}$/.test(text)) {
    fail(`${label} must be a full 40-character hexadecimal Git SHA`);
  }
  return text;
}

export function normalizeEdition(value) {
  const text = String(value ?? '').trim();
  if (!SUPPORTED_EDITIONS.includes(text)) {
    fail(`unsupported edition: ${text || '(empty)'}`);
  }
  return text;
}

export function normalizePublishedAt(value, label = 'publishedAt') {
  const text = String(value ?? '').trim();
  if (!text || !Number.isFinite(Date.parse(text)) || new Date(text).toISOString() !== text) {
    fail(`${label} must be canonical UTC ISO-8601`);
  }
  return text;
}

export function normalizeIssueDate(value, label = 'date') {
  const text = String(value ?? '').trim();
  if (!/^\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])$/.test(text)) {
    fail(`${label} must be YYYY-MM-DD`);
  }
  const parsed = new Date(`${text}T00:00:00.000Z`);
  if (parsed.toISOString().slice(0, 10) !== text) {
    fail(`${label} must be a valid calendar date`);
  }
  return text;
}

export function normalizeIssueNo(value, label = 'issueNo') {
  if (!Number.isSafeInteger(value) || value <= 0) {
    fail(`${label} must be a positive integer`);
  }
  return value;
}

export function normalizeManifest(raw) {
  if (!isRecord(raw)) fail('delivery-manifest.json must contain a JSON object');
  if (raw.schemaVersion !== DELIVERY_SCHEMA_VERSION) {
    fail(`unsupported delivery manifest schemaVersion: ${String(raw.schemaVersion)}`);
  }
  if (raw.sourceRepository !== SOURCE_REPOSITORY) {
    fail(`sourceRepository must be ${SOURCE_REPOSITORY}`);
  }

  return {
    schemaVersion: DELIVERY_SCHEMA_VERSION,
    sourceRepository: SOURCE_REPOSITORY,
    sourceSha: normalizeSha(raw.sourceSha),
    sourceRunId: normalizeRunId(raw.sourceRunId),
    edition: normalizeEdition(raw.edition),
    publishedAt: normalizePublishedAt(raw.publishedAt),
  };
}

export function validateInputs(manifest, inputs) {
  const sourceRunId = normalizeRunId(inputs.sourceRunId, 'workflow source_run_id');
  const sourceSha = normalizeSha(inputs.sourceSha, 'workflow source_sha');
  if (manifest.sourceRunId !== sourceRunId) {
    fail('workflow source_run_id does not match delivery manifest');
  }
  if (manifest.sourceSha !== sourceSha) {
    fail('workflow source_sha does not match delivery manifest');
  }

  if (inputs.edition) {
    const edition = normalizeEdition(inputs.edition);
    if (manifest.edition !== edition) fail('workflow edition does not match delivery manifest');
  }
  if (inputs.publishedAt) {
    const publishedAt = normalizePublishedAt(inputs.publishedAt, 'workflow published_at');
    if (manifest.publishedAt !== publishedAt) {
      fail('workflow published_at does not match delivery manifest');
    }
  }
}

function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (isRecord(value)) {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function validateLatestSnapshot(latest, manifest) {
  if (!isRecord(latest)) fail('data/latest.json must contain a JSON object');
  if (latest.schemaVersion !== 1) fail('data/latest.json schemaVersion must be 1');
  const issueNo = normalizeIssueNo(latest.issueNo, 'data/latest.json issueNo');
  const date = normalizeIssueDate(latest.date, 'data/latest.json date');
  const edition = normalizeEdition(latest.edition);
  const generatedAt = normalizePublishedAt(latest.generatedAt, 'data/latest.json generatedAt');
  if (edition !== manifest.edition) fail('data/latest.json edition does not match delivery manifest');
  if (generatedAt !== manifest.publishedAt) fail('data/latest.json generatedAt does not match delivery manifest');
  return { issueNo, date, edition, generatedAt };
}

function validateGraph(graph) {
  if (!isRecord(graph)) fail('data/graph.json must contain a JSON object');
  if (graph.schemaVersion !== 2) fail('data/graph.json schemaVersion must be 2');
  if (!Array.isArray(graph.issues)) fail('data/graph.json issues must be an array');
  if (!Array.isArray(graph.articles)) fail('data/graph.json articles must be an array');
}

function validateIndexManifest(indexManifest, fileMap) {
  if (!isRecord(indexManifest)) fail('data/index-manifest.json must contain a JSON object');
  if (indexManifest.schemaVersion !== 1) fail('data/index-manifest.json schemaVersion must be 1');
  if (!Array.isArray(indexManifest.months)) fail('data/index-manifest.json must contain a months array');
  for (const month of indexManifest.months) {
    if (typeof month !== 'string' || !/^\d{4}-(?:0[1-9]|1[0-2])$/.test(month)) {
      fail(`invalid issue index month: ${String(month)}`);
    }
    const issueIndexPath = `data/issues-index-${month}.json`;
    const issueIndex = fileMap.get(issueIndexPath);
    if (!issueIndex) fail(`${issueIndexPath} is required by data/index-manifest.json`);
    if (!isRecord(issueIndex.value)
      || issueIndex.value.schemaVersion !== 1
      || issueIndex.value.month !== month
      || !Array.isArray(issueIndex.value.issues)) {
      fail(`${issueIndexPath} has an invalid monthly index structure`);
    }
  }
}

function validateCanonicalIssue(latest, identity, fileMap) {
  const issuePath = `data/issues/${identity.date}-${identity.edition}.json`;
  const issueFile = fileMap.get(issuePath);
  if (!issueFile) fail(`${issuePath} is required for data/latest.json`);
  const issue = issueFile.value;
  if (!isRecord(issue)) fail(`${issuePath} must contain a JSON object`);
  for (const field of ['schemaVersion', 'issueNo', 'date', 'edition', 'generatedAt']) {
    if (issue[field] !== latest[field]) fail(`${issuePath} ${field} does not match data/latest.json`);
  }
  if (canonicalJson(issue) !== canonicalJson(latest)) {
    fail(`${issuePath} does not match data/latest.json`);
  }
  return issuePath;
}

function validateLatestMonthIndex(identity, fileMap, issuePath) {
  const month = identity.date.slice(0, 7);
  const indexPath = `data/issues-index-${month}.json`;
  const indexFile = fileMap.get(indexPath);
  if (!indexFile) fail(`${indexPath} is required for data/latest.json`);
  const index = indexFile.value;
  if (!isRecord(index)) fail(`${indexPath} must contain a JSON object`);
  if (index.schemaVersion !== 1) fail(`${indexPath} schemaVersion must be 1`);
  if (index.month !== month) fail(`${indexPath} month does not match its filename`);
  if (!Array.isArray(index.issues)) fail(`${indexPath} issues must be an array`);
  const matches = index.issues.some((entry) => isRecord(entry)
    && entry.issueNo === identity.issueNo
    && entry.date === identity.date
    && entry.edition === identity.edition
    && entry.path === issuePath.slice('data/'.length));
  if (!matches) fail(`${indexPath} is missing the canonical latest issue entry`);
}

function repositoryUrlMatches(url) {
  return typeof url === 'string' && (
    url.startsWith(`https://github.com/${SOURCE_REPOSITORY}/`)
    || url.startsWith(`https://api.github.com/repos/${SOURCE_REPOSITORY}/`)
  );
}

export function verifySourceRunProvenance({ run, publicationCommit, sourceRunId, sourceSha, edition }) {
  const normalizedRunId = normalizeRunId(sourceRunId, 'source run ID');
  const normalizedSha = normalizeSha(sourceSha, 'publication source SHA');
  const normalizedEdition = normalizeEdition(edition);
  if (!isRecord(run)) fail('source Actions run response must contain a JSON object');
  if (String(run.id ?? '') !== normalizedRunId) fail('source Actions run ID does not match the requested run');
  if (run.repository?.full_name !== SOURCE_REPOSITORY || run.head_repository?.full_name !== SOURCE_REPOSITORY) {
    fail('source Actions run does not belong to the expected repository');
  }
  if (run.head_branch !== 'main' || (run.ref !== null && run.ref !== undefined && run.ref !== 'refs/heads/main')) {
    fail('source Actions run is not for main');
  }
  if (run.path !== PUBLISH_WORKFLOW_BY_EDITION[normalizedEdition]) {
    fail('source Actions run workflow does not match the requested edition');
  }
  if (!ALLOWED_EVENTS.has(run.event)) fail('source Actions run event is not an allowed production trigger');
  if (run.status !== 'completed' || run.conclusion !== 'success') {
    fail('source Actions run is not completed successfully');
  }

  const runHeadSha = normalizeSha(run.head_sha, 'source run head SHA');
  if (!isRecord(publicationCommit)) fail('publication commit response must contain a JSON object');
  const commitSha = normalizeSha(publicationCommit.sha, 'publication commit SHA');
  if (commitSha !== normalizedSha) fail('publication commit SHA does not match the requested source SHA');
  if (publicationCommit.repository?.full_name && publicationCommit.repository.full_name !== SOURCE_REPOSITORY) {
    fail('publication commit does not belong to the expected repository');
  }
  if (!publicationCommit.repository?.full_name
    && !repositoryUrlMatches(publicationCommit.html_url)
    && !repositoryUrlMatches(publicationCommit.url)) {
    fail('publication commit repository cannot be verified');
  }
  if (!Array.isArray(publicationCommit.parents) || !publicationCommit.parents[0]) {
    fail('publication commit has no parent');
  }
  const parentSha = normalizeSha(publicationCommit.parents[0].sha, 'publication commit parent SHA');
  if (parentSha !== runHeadSha) {
    fail('publication commit was not created from the source run head');
  }
  return {
    sourceRunId: normalizedRunId,
    sourceSha: normalizedSha,
    edition: normalizedEdition,
    workflow: PUBLISH_WORKFLOW_BY_EDITION[normalizedEdition],
  };
}

function toArtifactPath(filePath) {
  const normalized = filePath.replaceAll('\\', '/');
  const parts = normalized.split('/');
  if (!normalized || normalized.startsWith('/') || parts.includes('..') || parts.includes('.')) {
    fail(`unsafe artifact path: ${filePath}`);
  }
  return normalized;
}

async function walkFiles(root, current = root, output = { files: [], directories: [] }) {
  const entries = await readdir(current, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = join(current, entry.name);
    const relativePath = toArtifactPath(relative(root, fullPath));
    const stats = await lstat(fullPath);
    if (stats.isDirectory()) {
      output.directories.push(relativePath);
      await walkFiles(root, fullPath, output);
    } else if (stats.isFile()) {
      output.files.push({ path: relativePath, fullPath });
    } else {
      fail(`unexpected artifact filesystem type: ${relativePath}`);
    }
  }
  return output;
}

function isAllowedArtifactPath(filePath) {
  return filePath === DELIVERY_MANIFEST
    || REQUIRED_DATA_FILES.includes(filePath)
    || MONTH_INDEX_PATH_PATTERN.test(filePath)
    || ISSUE_PATH_PATTERN.test(filePath);
}

async function readJson(filePath, displayPath) {
  let text;
  try {
    text = await readFile(filePath, 'utf8');
  } catch (error) {
    fail(`cannot read ${displayPath}: ${error.message}`);
  }
  try {
    return JSON.parse(text);
  } catch (error) {
    fail(`invalid JSON at ${displayPath}: ${error.message}`);
  }
}

export async function validateArtifact(stagingRoot) {
  let stats;
  try {
    stats = await lstat(stagingRoot);
  } catch (error) {
    fail(`staging area is not readable: ${error.message}`);
  }
  if (!stats.isDirectory()) fail('staging area must be a directory');

  const walked = await walkFiles(stagingRoot);
  const files = walked.files;
  for (const directory of walked.directories) {
    if (directory !== 'data' && directory !== 'data/issues') fail(`unexpected artifact directory: ${directory}`);
  }
  const paths = files.map((file) => file.path).sort();
  for (const filePath of paths) {
    if (!isAllowedArtifactPath(filePath)) {
      fail(`unexpected artifact path or type: ${filePath}`);
    }
    if (filePath === `data/${TIMES_STATE_FILE}`) {
      fail('artifact may not overwrite Site-owned sync state');
    }
  }

  const fileMap = new Map(files.map((file) => [file.path, file]));
  if (!fileMap.has(DELIVERY_MANIFEST)) fail('delivery-manifest.json is required');
  for (const requiredPath of REQUIRED_DATA_FILES) {
    if (!fileMap.has(requiredPath)) fail(`${requiredPath} is required`);
  }

  const manifest = normalizeManifest(await readJson(fileMap.get(DELIVERY_MANIFEST).fullPath, DELIVERY_MANIFEST));
  for (const file of files) {
    file.value = await readJson(file.fullPath, file.path);
  }
  const dataFileMap = new Map(files.filter((file) => file.path.startsWith('data/')).map((file) => [file.path, file]));
  const latest = dataFileMap.get('data/latest.json').value;
  const identity = validateLatestSnapshot(latest, manifest);
  validateGraph(dataFileMap.get('data/graph.json').value);
  validateIndexManifest(dataFileMap.get('data/index-manifest.json').value, dataFileMap);
  const issuePath = validateCanonicalIssue(latest, identity, dataFileMap);
  validateLatestMonthIndex(identity, dataFileMap, issuePath);

  return { files, manifest, latest };
}

function issuePathsFromIndex(index, displayPath) {
  if (!isRecord(index) || !Array.isArray(index.issues)) {
    fail(`${displayPath} must contain an issues array`);
  }
  const paths = new Set();
  for (const entry of index.issues) {
    if (!isRecord(entry) || typeof entry.path !== 'string' || !/^issues\/[^/]+\.json$/.test(entry.path)) {
      fail(`${displayPath} contains an issue without a canonical path`);
    }
    paths.add(entry.path);
  }
  return paths;
}

async function inspectAcceptedArchive(dataRoot) {
  let stats;
  try {
    stats = await lstat(dataRoot);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return { issuePaths: new Set(), monthIndexes: new Map(), manifestMonths: new Set() };
    }
    fail(`cannot inspect the accepted archive: ${error.message}`);
  }
  if (!stats.isDirectory()) fail('accepted public/data is not a directory');

  const walked = await walkFiles(dataRoot);
  const issuePaths = new Set();
  const monthIndexes = new Map();
  let manifestMonths = new Set();
  for (const file of walked.files) {
    const artifactPath = `data/${file.path}`;
    if (ISSUE_PATH_PATTERN.test(artifactPath)) {
      issuePaths.add(artifactPath);
      continue;
    }
    if (MONTH_INDEX_PATH_PATTERN.test(artifactPath)) {
      const index = await readJson(file.fullPath, `accepted ${file.path}`);
      monthIndexes.set(artifactPath, issuePathsFromIndex(index, file.path));
      continue;
    }
    if (file.path === 'index-manifest.json') {
      const manifest = await readJson(file.fullPath, 'accepted index-manifest.json');
      if (!isRecord(manifest) || !Array.isArray(manifest.months)) {
        fail('index-manifest.json in the accepted archive is invalid');
      }
      manifestMonths = new Set(manifest.months);
    }
  }
  return { issuePaths, monthIndexes, manifestMonths };
}

export async function validateNonShrinkingArchive(dataRoot, incomingFiles) {
  const accepted = await inspectAcceptedArchive(dataRoot);
  const incomingByPath = new Map(incomingFiles.map((file) => [file.path, file]));
  const incomingPaths = new Set(incomingByPath.keys());

  for (const issuePath of accepted.issuePaths) {
    if (!incomingPaths.has(issuePath)) {
      fail(`incoming delivery removes previously accepted issue file: ${issuePath.slice('data/'.length)}`);
    }
  }

  for (const [indexPath, acceptedIssuePaths] of accepted.monthIndexes) {
    const incomingIndex = incomingByPath.get(indexPath);
    if (!incomingIndex) {
      fail(`incoming delivery removes previously accepted month index: ${indexPath.slice('data/'.length)}`);
    }
    const incomingIssuePaths = issuePathsFromIndex(incomingIndex.value, indexPath.slice('data/'.length));
    for (const issuePath of acceptedIssuePaths) {
      if (!incomingIssuePaths.has(issuePath)) {
        fail(`incoming delivery removes previously accepted issue from ${indexPath.slice('data/'.length)}: ${issuePath}`);
      }
    }
  }

  const incomingManifest = incomingByPath.get('data/index-manifest.json')?.value;
  const incomingMonths = new Set(Array.isArray(incomingManifest?.months) ? incomingManifest.months : []);
  for (const month of accepted.manifestMonths) {
    if (!incomingMonths.has(month)) {
      fail(`incoming delivery removes previously accepted month from index-manifest.json: ${String(month)}`);
    }
  }
}

export function normalizeState(raw) {
  if (!isRecord(raw)) fail('times-sync-state.json must contain a JSON object');
  if (raw.schemaVersion !== undefined && raw.schemaVersion !== DELIVERY_SCHEMA_VERSION) {
    fail(`unsupported sync state schemaVersion: ${String(raw.schemaVersion)}`);
  }
  if (raw.sourceRepository && raw.sourceRepository !== SOURCE_REPOSITORY) {
    fail(`sync state sourceRepository must be ${SOURCE_REPOSITORY}`);
  }
  return {
    schemaVersion: raw.schemaVersion ?? DELIVERY_SCHEMA_VERSION,
    lastSourceRunId: normalizeRunId(raw.lastSourceRunId, 'lastSourceRunId'),
    lastSourceSha: normalizeSha(raw.lastSourceSha, 'lastSourceSha'),
    lastPublishedAt: normalizePublishedAt(raw.lastPublishedAt, 'lastPublishedAt'),
    lastEdition: raw.lastEdition ? normalizeEdition(raw.lastEdition) : null,
  };
}

export async function readState(statePath) {
  try {
    await access(statePath);
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    fail(`cannot access sync state: ${error.message}`);
  }
  return normalizeState(await readJson(statePath, TIMES_STATE_FILE));
}

export function classifyDelivery(manifest, state) {
  if (!state) return { status: 'ACCEPT', reason: 'no accepted delivery exists' };

  if (manifest.sourceRunId === state.lastSourceRunId) {
    if (
      manifest.sourceSha === state.lastSourceSha
      && manifest.publishedAt === state.lastPublishedAt
      && (!state.lastEdition || manifest.edition === state.lastEdition)
    ) {
      return { status: 'NO-OP', reason: 'sourceRunId was already accepted' };
    }
    fail('same sourceRunId has conflicting delivery metadata');
  }

  const incomingTime = Date.parse(manifest.publishedAt);
  const acceptedTime = Date.parse(state.lastPublishedAt);
  if (incomingTime <= acceptedTime) {
    return { status: 'REJECT', reason: 'delivery is not newer than the accepted delivery' };
  }
  return { status: 'ACCEPT', reason: 'delivery is newer than the accepted delivery' };
}

export async function validateStaging(stagingRoot, inputs, statePath) {
  const { files, manifest } = await validateArtifact(stagingRoot);
  validateInputs(manifest, inputs);
  const state = await readState(statePath);
  const decision = classifyDelivery(manifest, state);
  if (decision.status === 'ACCEPT') {
    await validateNonShrinkingArchive(dirname(statePath), files);
  }
  return { files, manifest, state, ...decision };
}

function nextState(manifest) {
  return {
    schemaVersion: DELIVERY_SCHEMA_VERSION,
    sourceRepository: SOURCE_REPOSITORY,
    lastSourceRunId: manifest.sourceRunId,
    lastSourceSha: manifest.sourceSha,
    lastPublishedAt: manifest.publishedAt,
    lastEdition: manifest.edition,
  };
}

async function copyValidatedData(files, tempRoot) {
  for (const file of files) {
    if (!file.path.startsWith('data/')) continue;
    const target = join(tempRoot, file.path.slice('data/'.length));
    await mkdir(dirname(target), { recursive: true });
    await copyFile(file.fullPath, target);
  }
}

function assertStateLocation(destinationRoot, statePath) {
  const expected = resolve(destinationRoot, TIMES_STATE_FILE);
  if (resolve(statePath) !== expected) {
    fail(`sync state must be stored at ${expected}`);
  }
}

export async function installDelivery(stagingRoot, inputs, destinationRoot, statePath) {
  assertStateLocation(destinationRoot, statePath);
  const result = await validateStaging(stagingRoot, inputs, statePath);
  if (result.status !== 'ACCEPT') {
    fail(`delivery is ${result.status}; it is not commit-ready`);
  }

  const parent = dirname(destinationRoot);
  await mkdir(parent, { recursive: true });
  const tempRoot = await mkdtemp(join(parent, '.times-data-install-'));
  let backupParent = null;
  let backupPath = null;
  let destinationMoved = false;
  let destinationInstalled = false;
  try {
    await copyValidatedData(result.files, tempRoot);
    await writeFile(join(tempRoot, TIMES_STATE_FILE), `${JSON.stringify(nextState(result.manifest), null, 2)}\n`, 'utf8');

    try {
      const destinationStats = await lstat(destinationRoot);
      if (!destinationStats.isDirectory()) fail('existing public/data is not a directory');
      backupParent = await mkdtemp(join(parent, '.times-data-backup-'));
      backupPath = join(backupParent, 'data');
      await rename(destinationRoot, backupPath);
      destinationMoved = true;
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }

    await rename(tempRoot, destinationRoot);
    destinationInstalled = true;
    if (backupParent) await rm(backupParent, { recursive: true, force: true });
    return result;
  } catch (error) {
    if (destinationInstalled) await rm(destinationRoot, { recursive: true, force: true });
    if (destinationMoved && backupPath) await rename(backupPath, destinationRoot);
    if (backupParent) await rm(backupParent, { recursive: true, force: true });
    await rm(tempRoot, { recursive: true, force: true });
    throw error;
  }
}

export async function digestDirectory(root) {
  let stats;
  try {
    stats = await lstat(root);
  } catch (error) {
    if (error.code === 'ENOENT') return 'missing';
    throw error;
  }
  if (!stats.isDirectory()) fail(`digest root is not a directory: ${root}`);
  const files = (await walkFiles(root)).files.sort((a, b) => a.path.localeCompare(b.path));
  const hash = createHash('sha256');
  for (const file of files) {
    hash.update(file.path);
    hash.update('\0');
    hash.update(await readFile(file.fullPath));
    hash.update('\0');
  }
  return hash.digest('hex');
}

function parseArguments(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) fail(`unknown argument: ${token}`);
    const key = token.slice(2);
    args[key] = argv[index + 1] ?? '';
    index += 1;
  }
  return args;
}

function requiredArg(args, name) {
  if (!args[name]) fail(`--${name} is required`);
  return args[name];
}

function workflowInputs(args) {
  return {
    sourceRunId: requiredArg(args, 'source-run-id'),
    sourceSha: requiredArg(args, 'source-sha'),
    edition: args.edition || '',
    publishedAt: args['published-at'] || '',
  };
}

async function writeOutputs(outputPath, result) {
  if (!outputPath) return;
  await writeFile(outputPath, [
    `status=${result.status}`,
    `edition=${result.manifest.edition}`,
    `source_sha=${result.manifest.sourceSha}`,
  ].join('\n') + '\n', 'utf8');
}

async function main(argv) {
  const command = argv.shift();
  const args = parseArguments(argv);
  if (command === 'verify-provenance') {
    const run = await readJson(requiredArg(args, 'run'), 'source run response');
    const publicationCommit = await readJson(requiredArg(args, 'commit'), 'publication commit response');
    const result = verifySourceRunProvenance({
      run,
      publicationCommit,
      sourceRunId: requiredArg(args, 'source-run-id'),
      sourceSha: requiredArg(args, 'source-sha'),
      edition: requiredArg(args, 'edition'),
    });
    console.log(`[times-delivery] provenance OK: ${result.edition} ${result.sourceRunId}`);
    return;
  }
  if (command === 'validate') {
    const result = await validateStaging(
      requiredArg(args, 'staging'),
      workflowInputs(args),
      requiredArg(args, 'state'),
    );
    await writeOutputs(args.output, result);
    console.log(`[times-delivery] ${result.status}: ${result.reason}`);
    if (result.status !== 'ACCEPT') console.log('Site変更: NONE');
    return;
  }
  if (command === 'install') {
    const result = await installDelivery(
      requiredArg(args, 'staging'),
      workflowInputs(args),
      requiredArg(args, 'destination'),
      requiredArg(args, 'state'),
    );
    console.log(`[times-delivery] ACCEPT: ${result.manifest.edition} ${result.manifest.sourceRunId}`);
    return;
  }
  if (command === 'digest') {
    console.log(await digestDirectory(requiredArg(args, 'root')));
    return;
  }
  fail('command must be validate, install, or digest');
}

const thisFile = fileURLToPath(import.meta.url);
if (process.argv[1] && resolve(process.argv[1]) === thisFile) {
  main(process.argv.slice(2)).catch((error) => {
    console.error(`[times-delivery] ERROR: ${error.message}`);
    console.error('Site変更: NONE');
    process.exitCode = 1;
  });
}

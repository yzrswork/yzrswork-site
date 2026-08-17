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

const REQUIRED_DATA_FILES = [
  'data/latest.json',
  'data/graph.json',
  'data/index-manifest.json',
];

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
  if (!/^[0-9a-f]{7,64}$/.test(text)) {
    fail(`${label} must be a hexadecimal Git SHA`);
  }
  return text;
}

export function normalizeEdition(value) {
  const text = String(value ?? '').trim();
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/.test(text)) {
    fail('edition must contain only safe identifier characters');
  }
  return text;
}

export function normalizePublishedAt(value, label = 'publishedAt') {
  const text = String(value ?? '').trim();
  if (!text || !Number.isFinite(Date.parse(text))) {
    fail(`${label} must be a valid date-time`);
  }
  return text;
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
  return filePath === DELIVERY_MANIFEST || /^data\/(?:[^/]+\/)*[^/]+\.json$/.test(filePath);
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
    if (directory !== 'data' && !files.some((file) => file.path.startsWith(`${directory}/`))) {
      fail(`unexpected empty artifact directory: ${directory}`);
    }
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
  for (const file of files) await readJson(file.fullPath, file.path);

  const indexManifest = await readJson(fileMap.get('data/index-manifest.json').fullPath, 'data/index-manifest.json');
  if (!isRecord(indexManifest) || !Array.isArray(indexManifest.months)) {
    fail('data/index-manifest.json must contain a months array');
  }
  for (const month of indexManifest.months) {
    if (typeof month !== 'string' || !/^\d{4}-(?:0[1-9]|1[0-2])$/.test(month)) {
      fail(`invalid issue index month: ${String(month)}`);
    }
    const issueIndexPath = `data/issues-index-${month}.json`;
    if (!fileMap.has(issueIndexPath)) fail(`${issueIndexPath} is required by index-manifest.json`);
  }

  return { files, manifest };
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

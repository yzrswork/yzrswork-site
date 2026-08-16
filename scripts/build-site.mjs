import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));

for (const script of ['build-guide.mjs', 'generate-sitemap.mjs']) {
  const result = spawnSync(process.execPath, [join(ROOT, 'scripts', script)], { stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

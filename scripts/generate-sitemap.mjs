import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const OUTPUT = join(ROOT, 'public', 'sitemap.xml');
const urls = [
  'https://yzrswork.com/',
  'https://yzrswork.com/times/',
  'https://yzrswork.com/about/',
  'https://yzrswork.com/privacy/',
  'https://yzrswork.com/guides/hajimete-no-denshi-kousaku-starter-guide/',
  'https://yzrswork.com/junkyard/works/mo-1/',
  'https://yzrswork.com/junkyard/works/compo-1/',
  'https://yzrswork.com/junkyard/works/pdb-1/',
  'https://yzrswork.com/junkyard/works/im-1/',
];

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((url) => `  <url><loc>${url}</loc></url>`).join('\n')}
</urlset>
`;

writeFileSync(OUTPUT, xml, 'utf8');
console.log(`[generate:sitemap] ${OUTPUT}`);

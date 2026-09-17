import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, extname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const PUBLIC = join(ROOT, 'public');
const BASE = 'https://yzrswork.com';
const APPS_HOST = 'apps.yzrswork.com';
const APPS_BASE = `https://${APPS_HOST}`;
const ROUTE_KEY_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const GUIDE = 'guides/hajimete-no-denshi-kousaku-starter-guide/index.html';
const GUIDE_SOURCE = 'content/guides/hajimete-no-denshi-kousaku-starter-guide.md';
const GUIDE_BUILD = 'scripts/build-guide.mjs';
const GUIDE_URL = `${BASE}/guides/hajimete-no-denshi-kousaku-starter-guide/`;
const LP = 'lp/electronics-starter/index.html';
const LP_URL = `${BASE}/lp/electronics-starter/`;
const TIMES = 'times/index.html';
const TIMES_URL = `${BASE}/times/`;
const EVENING = 'evening.html';
const WORKS = [
  {
    name: 'MO-1',
    page: 'junkyard/works/mo-1/index.html',
    url: `${BASE}/junkyard/works/mo-1/`,
    assetUrl: 'https://assets.yzrswork.com/junkyard/2026/works/mo-1/official/c5fe94b74d73.jpeg',
    legacyAsset: 'junkyard/works/mo-1/mo-1.jpeg',
    legacyAssetSize: 190049,
    legacyAssetSha256: 'c5fe94b74d733f28fc181666364f5f1f97493f49e8df71d445c0a6c1e12dbac5',
    noteUrl: 'https://note.com/yzrswork/n/n1d2d7c27e061',
    imageRatio: 'aspect-ratio: 3 / 4;',
  },
  {
    name: 'COMPO-1',
    page: 'junkyard/works/compo-1/index.html',
    url: `${BASE}/junkyard/works/compo-1/`,
    assetUrl: 'https://assets.yzrswork.com/junkyard/2026/works/compo-1/official/1bc21a464ffe.png',
    legacyAsset: 'junkyard/works/compo-1/compo-1.png',
    legacyAssetSize: 1890167,
    legacyAssetSha256: '1bc21a464ffeb8c70a70ee3636397f6869e5f8764d8a911a7f1d3d920736c2b4',
    noteUrl: 'https://note.com/yzrswork/n/n7ed9240f28cd',
    imageRatio: 'aspect-ratio: 4 / 3;',
  },
  {
    name: 'PDB-1',
    page: 'junkyard/works/pdb-1/index.html',
    url: `${BASE}/junkyard/works/pdb-1/`,
    assetUrl: 'https://assets.yzrswork.com/junkyard/2026/works/pdb-1/official/ff7b503a878b.jpeg',
    legacyAsset: 'junkyard/works/pdb-1/pdb-1.jpeg',
    legacyAssetSize: 216676,
    legacyAssetSha256: 'ff7b503a878ba7f1825c471cb29bc029e362bb227a456a270fd4ef13979ade76',
    noteUrl: 'https://note.com/yzrswork/n/nf10af42494eb',
    imageRatio: 'aspect-ratio: 1 / 1;',
    requiredText: ['PDB-1', '配電盤', '180 × 238 mm', 'DC power distribution / exhibition source: 5V MAIN', 'WAGO SPL-2'],
  },
  {
    name: 'IM-1',
    page: 'junkyard/works/im-1/index.html',
    url: `${BASE}/junkyard/works/im-1/`,
    assetUrl: 'https://assets.yzrswork.com/junkyard/2026/works/im-1/official/550747b4448b.jpeg',
    legacyAsset: 'junkyard/works/im-1/im-1.jpg',
    legacyAssetSize: 228878,
    legacyAssetSha256: '550747b4448ba4cd65654f9654ce7311826d80c97eca5bc24d272b1f0214bbd6',
    noteUrl: 'https://note.com/yzrswork/n/n546adc606ab9',
    imageRatio: 'aspect-ratio: 4 / 3;',
    requiredText: ['IM-1', 'インフィニティミラー', '120 × 165 mm', '5V / DC 5.5×2.1mm center positive', 'Digispark (ATtiny85)', '前面ガラスを約10度傾けた', 'Arduino Nanoはハーフミラーに映り込むためDigispark（ATtiny85）へ変更しました。内壁を黒にして余計な乱反射を抑え、3ポジションSWのフローティング問題に詰まった結果、2ポジションの演出へ絞るようにしています。'],
  },
];
const pages = ['index.html', 'about/index.html', 'privacy/index.html', GUIDE, LP, ...WORKS.map(({ page }) => page)];
const uiPages = [TIMES, EVENING];
const analyticsPages = new Set(pages);
const errors = [];

function read(relativePath) {
  const path = join(PUBLIC, relativePath);
  if (!existsSync(path)) {
    errors.push(`required fileがない: public/${relativePath}`);
    return '';
  }
  return readFileSync(path, 'utf8').replaceAll('\r\n', '\n');
}

function readRoot(relativePath) {
  const path = join(ROOT, relativePath);
  if (!existsSync(path)) {
    errors.push(`required source fileがない: ${relativePath}`);
    return '';
  }
  return readFileSync(path, 'utf8').replaceAll('\r\n', '\n');
}

function appUrl(pathname, routeKey) {
  return `${APPS_BASE}${pathname}?yzrs_ref=${routeKey}`;
}

function checkAppUrl(page, rawUrl) {
  let url;
  try {
    url = new URL(rawUrl);
  } catch {
    errors.push(`apps URLが不正: ${page}: ${rawUrl}`);
    return;
  }
  if (url.protocol !== 'https:' || url.hostname !== APPS_HOST) {
    errors.push(`apps URLのoriginが不正: ${page}: ${rawUrl}`);
    return;
  }
  for (const parameter of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content']) {
    if (url.searchParams.has(parameter)) errors.push(`appsリンクにmarketing UTMがある: ${page}: ${rawUrl}`);
  }
  const routeKeys = url.searchParams.getAll('yzrs_ref');
  if (routeKeys.length !== 1 || !routeKeys[0] || routeKeys[0].length > 64 || !ROUTE_KEY_PATTERN.test(routeKeys[0])) {
    errors.push(`appsリンクのyzrs_refが不正: ${page}: ${rawUrl}`);
  }
}

function checkAppLinks(page, html) {
  for (const match of html.matchAll(/<a\b[^>]*\shref=["']((?:https?:)\/\/apps\.yzrswork\.com[^"']*)["']/gi)) {
    checkAppUrl(page, match[1]);
  }
}

function checkExpectedRoute(page, content, pathname, routeKey, markdown = false) {
  const expected = appUrl(pathname, routeKey);
  const marker = markdown ? `](${expected})` : `href="${expected}"`;
  if (!content.includes(marker)) errors.push(`apps routeがない: ${page}: ${expected}`);
}

function countOccurrences(content, needle) {
  return content.split(needle).length - 1;
}

function localPathExists(pathname) {
  let path = pathname.replace(/^\//, '');
  if (!path) path = 'index.html';
  if (path.endsWith('/')) path += 'index.html';
  return existsSync(join(PUBLIC, path));
}

function walkFiles(directory, output = []) {
  for (const entry of readdirSync(directory)) {
    const path = join(directory, entry);
    if (entry === '.git' || entry === 'node_modules' || entry === 'docs') continue;
    if (statSync(path).isDirectory()) walkFiles(path, output);
    else output.push(path);
  }
  return output;
}

function checkInlineScripts(page, html) {
  for (const match of html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/gi)) {
    if (/\ssrc\s*=/.test(match[1])) continue;
    if (/\stype=["']importmap["']/i.test(match[1])) continue;
    if (/type=["']application\/ld\+json["']/.test(match[1])) {
      try { JSON.parse(match[2]); } catch (error) { errors.push(`JSON-LDが不正: ${page}: ${error.message}`); }
      continue;
    }
    try { new vm.Script(match[2], { filename: page }); }
    catch (error) { errors.push(`inline JavaScriptが不正: ${page}: ${error.message}`); }
  }
}

function checkImages(page, html) {
  for (const match of html.matchAll(/<img\b([^>]*)>/gi)) {
    const tag = match[0];
    const src = tag.match(/\ssrc=["']([^"']+)["']/i)?.[1];
    if (!tag.includes('alt=')) errors.push(`画像altがない: ${page}`);
    if (!src || /^(https?:|data:)/i.test(src)) continue;
    if (!localPathExists(new URL(src, BASE).pathname)) errors.push(`画像がない: ${page}: ${src}`);
  }
}

function checkLinks(page, html) {
  for (const match of html.matchAll(/<a\b[^>]*\shref=["']([^"']+)["']/gi)) {
    const href = match[1];
    if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) continue;
    let url;
    try { url = new URL(href, BASE); } catch { errors.push(`URLが不正: ${page}: ${href}`); continue; }
    if (url.origin !== BASE) continue;
    if (!localPathExists(url.pathname)) errors.push(`内部リンク先がない: ${page}: ${href}`);
  }
}

const expectedFiles = [
  'index.html', 'about/index.html', 'privacy/index.html', 'analytics.js', 'ads.txt', 'robots.txt', 'sitemap.xml', 'og.png',
  GUIDE, LP,
  TIMES, EVENING,
  'guides/hajimete-no-denshi-kousaku-starter-guide/assets/tools-step1-set.jpg',
  'guides/hajimete-no-denshi-kousaku-starter-guide/assets/tools-step2-set.jpg',
  'guides/hajimete-no-denshi-kousaku-starter-guide/assets/tools-step3-psu.jpg',
  'guides/hajimete-no-denshi-kousaku-starter-guide/assets/parts-amazon-stock-set.png',
  'guides/hajimete-no-denshi-kousaku-starter-guide/assets/parts-domestic-stock-set.png',
  'guides/hajimete-no-denshi-kousaku-starter-guide/assets/parts-china-stock-set.png',
  ...WORKS.flatMap(({ page, asset, legacyAsset }) => [page, ...(asset ? [asset] : []), ...(legacyAsset ? [legacyAsset] : [])]),
  'junkyard/lab/multi-target/index.html',
  'junkyard/lab/multi-target/style.css',
  'junkyard/lab/multi-target/app.js',
  'junkyard/lab/multi-target/targets.json',
  'junkyard/lab/multi-target/junkyard-six-targets.mind',
];
for (const file of expectedFiles) read(file);

const htmlByPage = new Map(pages.map((page) => [page, read(page)]));
for (const [page, html] of htmlByPage) {
  const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]);
  if (new Set(ids).size !== ids.length) errors.push(`idが重複: ${page}`);
  if (!html.includes('<meta charset="utf-8"')) errors.push(`charsetがない: ${page}`);
  if (!html.includes('name="viewport"')) errors.push(`viewportがない: ${page}`);
  if (analyticsPages.has(page) && !html.includes('<script src="/analytics.js"></script>')) errors.push(`Analyticsがない: ${page}`);
  if (html.includes('maximum-scale=1') || html.includes('user-scalable=no')) errors.push(`zoom制限がある: ${page}`);
  checkInlineScripts(page, html);
  checkImages(page, html);
  checkLinks(page, html);
}

const rootAppRoutes = [
  ['/', 'home-hero-toolbox'],
  ['/kit/', 'home-guide01-kit'],
  ['/bench/', 'home-tool-bench'],
  ['/haisen/', 'home-tool-haisen'],
  ['/handa/', 'home-tool-handa'],
  ['/build/', 'home-tool-build'],
  ['/usbc/', 'home-tool-usbc'],
  ['/hdd/', 'home-tool-hdd'],
  ['/mem/', 'home-tool-mem'],
  ['/glue/', 'home-tool-glue'],
  ['/nurerukun/', 'home-tool-nurerukun'],
  ['/', 'home-all-tools'],
  ['/', 'home-closing-tools'],
  ['/', 'home-footer-tools'],
];
const rootApp = htmlByPage.get('index.html');
const about = htmlByPage.get('about/index.html');
const guideSource = readRoot(GUIDE_SOURCE);
const guideBuild = readRoot(GUIDE_BUILD);
const guideApp = htmlByPage.get(GUIDE);

checkAppLinks('index.html', rootApp);
checkAppLinks('about/index.html', about);
checkAppLinks(GUIDE, guideApp);
for (const [pathname, routeKey] of rootAppRoutes) checkExpectedRoute('index.html', rootApp, pathname, routeKey);
checkExpectedRoute('about/index.html', about, '/', 'about-toolbox');
for (const [pathname, routeKey] of [
  ['/', 'guide01-toolbox'],
  ['/kit/', 'guide01-kit'],
  ['/handa/', 'guide01-handa'],
  ['/bench/', 'guide01-bench'],
]) checkExpectedRoute(GUIDE, guideApp, pathname, routeKey);
for (const [pathname, routeKey] of [
  ['/kit/', 'guide01-kit'],
  ['/handa/', 'guide01-handa'],
  ['/bench/', 'guide01-bench'],
]) checkExpectedRoute(GUIDE_SOURCE, guideSource, pathname, routeKey, true);
checkExpectedRoute(GUIDE_BUILD, guideBuild, '/', 'guide01-toolbox');
checkExpectedRoute(GUIDE_BUILD, guideBuild, '/kit/', 'guide01-kit');

for (const [page, content] of [[GUIDE_SOURCE, guideSource], [GUIDE_BUILD, guideBuild]]) {
  for (const match of content.matchAll(/https?:\/\/apps\.yzrswork\.com\/[^"'\s)]+/gi)) checkAppUrl(page, match[0]);
}
const sourceKitUrl = appUrl('/kit/', 'guide01-kit');
const generatedKitMarker = `href="${sourceKitUrl}"`;
if (countOccurrences(guideSource, sourceKitUrl) !== 2) errors.push('Guide sourceのkit route数が2ではない');
if (countOccurrences(guideApp, generatedKitMarker) !== 3) errors.push('Generated Guideのkit route数が3ではない');

const uiHtmlByPage = new Map(uiPages.map((page) => [page, read(page)]));
for (const [page, html] of uiHtmlByPage) checkInlineScripts(page, html);

const canonicalExpectations = {
  'index.html': `${BASE}/`,
  'about/index.html': `${BASE}/about/`,
  'privacy/index.html': `${BASE}/privacy/`,
  [GUIDE]: GUIDE_URL,
  [LP]: LP_URL,
  ...Object.fromEntries(WORKS.map(({ page, url }) => [page, url])),
  [TIMES]: TIMES_URL,
  [EVENING]: TIMES_URL,
};
for (const [page, canonical] of Object.entries(canonicalExpectations)) {
  const html = uiHtmlByPage.get(page) ?? htmlByPage.get(page);
  if (!html.includes(`<link rel="canonical" href="${canonical}"`)) errors.push(`canonicalが不一致: ${page}`);
}

const root = htmlByPage.get('index.html');
if (!root.includes('<script type="application/ld+json">')) errors.push('TopのJSON-LDがない');
if (!root.includes('<meta property="og:image" content="https://yzrswork.com/og.png"')) errors.push('TopのOGP画像がない');
for (const path of ['/about/', '/privacy/', '/guides/hajimete-no-denshi-kousaku-starter-guide/']) {
  if (!root.includes(`href="${path}"`)) errors.push(`Topからの導線がない: ${path}`);
}

const guide = htmlByPage.get(GUIDE);
if (!guide.includes('<meta name="robots" content="index,follow,max-image-preview:large"')) errors.push('Guideのrobotsが不一致');
if (!guide.includes('<script type="application/ld+json">')) errors.push('GuideのJSON-LDがない');

const lp = htmlByPage.get(LP);
for (const [label, expected] of [
  ['LPのcanonical', `<link rel="canonical" href="${LP_URL}"`],
  ['LPのrobots', '<meta name="robots" content="noindex,follow"'],
  ['LPのAnalytics', '<script src="/analytics.js"></script>'],
  ['LPのGuide URL', 'href="/guides/hajimete-no-denshi-kousaku-starter-guide/"'],
  ['LPのview event', 'lp_view'],
  ['LPのclick event', 'lp_guide_click'],
]) if (!lp.includes(expected)) errors.push(`${label}がない`);
const lpCtas = [...lp.matchAll(/data-cta-position="([^"]+)"/g)].map((match) => match[1]);
if (lpCtas.join(',') !== 'hero,middle,final') errors.push(`LP CTAがhero,middle,finalではない: ${lpCtas.join(',')}`);
if ((lp.match(/href="\/guides\/hajimete-no-denshi-kousaku-starter-guide\//g) || []).length < 4) errors.push('LPのGuide導線が不足');
for (const forbidden of ['__manus__', 'Manus Analytics', 'OWNER_OPEN_ID', 'access_token', 'JWT', 'shadcn', 'from "react"', "from 'react'"]) {
  if (lp.includes(forbidden)) errors.push(`LPに禁止語がある: ${forbidden}`);
}
if (lp.includes('https://amzn.to/') || lp.includes('target="_blank"')) errors.push('LPに不要な外部遷移がある');

for (const spec of WORKS) {
  const work = htmlByPage.get(spec.page);
  for (const [label, expected] of [
    [`${spec.name}のnote URL`, `href="${spec.noteUrl}"`],
    [`${spec.name}の画像表示比率`, spec.imageRatio],
  ]) if (!work.includes(expected)) errors.push(`${label}がない`);
  if (spec.assetUrl) {
    if (!work.includes(`src="${spec.assetUrl}"`)) errors.push(`${spec.name}のR2画像参照がない`);
    if (spec.legacyAsset && work.includes(`src="/${spec.legacyAsset}"`)) errors.push(`${spec.name}が旧ローカル画像を参照している`);
    if (work.includes('IMAGE ASSET PENDING')) errors.push(`${spec.name}に画像保留表示が残っている`);
  } else if (spec.asset) {
    if (!work.includes(`src="/${spec.asset}"`)) errors.push(`${spec.name}の画像参照がない`);
    if (work.includes('IMAGE ASSET PENDING')) errors.push(`${spec.name}に画像保留表示が残っている`);
  } else {
    if (!work.includes('IMAGE ASSET PENDING')) errors.push(`${spec.name}の画像保留表示がない`);
    if (/<img\b/i.test(work)) errors.push(`${spec.name}に未提供画像のimg要素がある`);
  }
  if (/\{\{[^}]+\}\}/.test(work)) errors.push(`${spec.name}に未解決placeholderがある`);
  if (work.includes('height: 210mm')) errors.push(`${spec.name}にA5固定高さがある`);
  for (const expected of spec.requiredText ?? []) {
    if (!work.includes(expected)) errors.push(`${spec.name}に必要な内容がない: ${expected}`);
  }

  const localAsset = spec.asset ?? spec.legacyAsset;
  if (localAsset) {
    const workAssetPath = join(PUBLIC, localAsset);
    if (!existsSync(workAssetPath)) {
      errors.push(`${spec.name}画像ファイルがない: ${localAsset}`);
    } else {
      const workAsset = readFileSync(workAssetPath);
      const sha256 = createHash('sha256').update(workAsset).digest('hex');
      const expectedSize = spec.asset ? spec.assetSize : spec.legacyAssetSize;
      const expectedSha256 = spec.asset ? spec.assetSha256 : spec.legacyAssetSha256;
      if (workAsset.length !== expectedSize) errors.push(`${spec.name}画像サイズが不一致: ${workAsset.length}`);
      if (sha256 !== expectedSha256) errors.push(`${spec.name}画像SHA-256が不一致: ${sha256}`);
    }
  }
}

const robots = read('robots.txt');
if (!robots.includes('Sitemap: https://yzrswork.com/sitemap.xml')) errors.push('robots.txtのSitemap指定がない');
const sitemap = read('sitemap.xml');
for (const url of [BASE + '/', TIMES_URL, `${BASE}/about/`, `${BASE}/privacy/`, GUIDE_URL]) {
  if (!sitemap.includes(`<loc>${url}</loc>`)) errors.push(`sitemapにURLがない: ${url}`);
}
if (sitemap.includes('/lp/electronics-starter/') || sitemap.includes('/evening.html')) errors.push('sitemapにnoindexまたはlegacy URLがある');

const analytics = read('analytics.js');
if (!/G-[A-Z0-9]+/.test(analytics)) errors.push('GA4 measurement IDがない');
if (!analytics.includes('var ID = "G-56D3SSB529";')) errors.push('GA4 measurement IDが変更されている');
if (/document\.cookie|localStorage|sessionStorage|email|phone|user_id/i.test(analytics)) errors.push('AnalyticsにPII収集の実装がある');
for (const expected of [
  'tool_link_click',
  'url.protocol !== "https:"',
  'url.hostname !== APP_HOST',
  'url.searchParams.getAll("yzrs_ref")',
  'route_key: routeKey',
  'tool_slug: toolSlug',
  'destination_path: url.pathname',
]) if (!analytics.includes(expected)) errors.push(`tool_link_click実装要素がない: ${expected}`);
if (/\bpreventDefault\s*\(|\bsetTimeout\s*\(/.test(analytics)) errors.push('Analyticsに遷移遅延またはpreventDefaultがある');

function checkToolLinkClickBehavior() {
  const listeners = {};
  const dataLayer = [];
  const document = {
    baseURI: 'https://yzrswork.com/',
    createElement: () => ({}),
    head: { appendChild: () => {} },
    addEventListener: (type, listener) => { listeners[type] = listener; },
  };
  const context = {
    Date,
    URL,
    console,
    dataLayer,
    document,
    window: { dataLayer: [] },
  };
  try {
    vm.runInNewContext(analytics, context, { filename: 'public/analytics.js' });
  } catch (error) {
    errors.push(`Analytics fixtureの実行に失敗: ${error.message}`);
    return;
  }
  if (typeof listeners.click !== 'function') {
    errors.push('tool_link_clickのclick listenerがない');
    return;
  }

  const makeLink = (href) => ({
    href,
    closest(selector) { return selector === 'a[href]' ? this : null; },
  });
  const eventEntries = () => dataLayer
    .map((entry) => Array.from(entry))
    .filter(([kind, name]) => kind === 'event' && name === 'tool_link_click');
  const click = (href) => listeners.click({ target: makeLink(href) });

  click('https://apps.yzrswork.com/hdd/?yzrs_ref=home-tool-hdd');
  const events = eventEntries();
  if (events.length !== 1) {
    errors.push('tagged apps linkでtool_link_clickが1件発火しない');
  } else {
    const params = events[0][2];
    if (params?.route_key !== 'home-tool-hdd' || params?.tool_slug !== 'hdd' || params?.destination_path !== '/hdd/') {
      errors.push('tool_link_clickのpayloadが不正');
    }
    if (Object.keys(params ?? {}).sort().join(',') !== 'destination_path,route_key,tool_slug') {
      errors.push('tool_link_clickに想定外parameterがある');
    }
  }

  const before = eventEntries().length;
  for (const href of [
    'https://amazon.co.jp/example',
    'https://note.com/yzrswork',
    'https://apps.yzrswork.com/hdd/',
    'http://apps.yzrswork.com/hdd/?yzrs_ref=home-tool-hdd',
    'https://apps.yzrswork.com.evil.example/hdd/?yzrs_ref=home-tool-hdd',
  ]) click(href);
  if (eventEntries().length !== before) errors.push('除外対象リンクでtool_link_clickが発火した');
}

checkToolLinkClickBehavior();

const sourceAmazonUrls = [...new Set([...guideSource.matchAll(/https:\/\/amzn\.to\/[A-Za-z0-9]+/g)].map((match) => match[0]))];
for (const url of sourceAmazonUrls) {
  if (!guideApp.includes(`href="${url}"`)) errors.push(`Generated GuideからAmazon URLが失われた: ${url}`);
}

const siteFiles = walkFiles(ROOT).filter((file) => !['.png', '.jpg', '.jpeg'].includes(extname(file).toLowerCase()));
const secretPatterns = [
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
  /(?:gh[pousr]|github_pat)_[A-Za-z0-9_]{20,}/,
  /(?:sk|rk)-[A-Za-z0-9]{20,}/,
  /(?:CLOUDFLARE_API_TOKEN|GEMINI_API_KEY|GOOGLE_API_KEY|GITHUB_TOKEN|OWNER_OPEN_ID|OAUTH_CLIENT_SECRET)\s*[:=]\s*["']?[A-Za-z0-9_\-]{8,}/i,
];
for (const file of siteFiles) {
  const rel = relative(ROOT, file).replaceAll('\\', '/');
  if (rel.startsWith('docs/') || rel === 'scripts/check-public.mjs') continue;
  if (/^\.env(?:\.|$)/.test(rel.split('/').at(-1))) errors.push(`secret fileがある: ${rel}`);
  const content = readFileSync(file, 'utf8');
  for (const pattern of secretPatterns) if (pattern.test(content)) errors.push(`secret patternがある: ${rel}`);
}

const times = uiHtmlByPage.get(TIMES);
if (!times.includes("'/data/latest.json'")) errors.push('Timesのlatest.json参照がない');
if (!times.includes("fetch('/data/index-manifest.json')")) errors.push('Timesのindex-manifest.json参照がない');
if (times.includes('/evening.html')) errors.push('通常Timesにlegacy evening URL参照がある');
if (times.includes('yzrsTimesForceDay') || times.includes("location.replace('/evening.html')")) errors.push('Timesに旧夜間リダイレクトが残っている');

const evening = uiHtmlByPage.get(EVENING);
if (!evening.includes('<meta http-equiv="refresh" content="0; url=https://yzrswork.com/times/">')) errors.push('EveningのTimesリダイレクトがない');
if (!evening.includes('href="/times/"')) errors.push('EveningのTimesフォールバック導線がない');
if (errors.length) {
  console.error(`[check] ${errors.length}件のエラー`);
  for (const error of errors) console.error(`  - ${error}`);
  process.exit(1);
}

console.log('[check] OK: required files, SEO, links, images, Analytics, robots, sitemap, LP policy, security');

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../public/en/builds/usb-boost-cable-repair/index.html', import.meta.url), 'utf8');
const sitemap = readFileSync(new URL('../public/sitemap.xml', import.meta.url), 'utf8');
const route = 'https://yzrswork.com/en/builds/usb-boost-cable-repair/';
const jp = 'https://note.com/yzrswork/n/nb8a6f101033a';
const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');

test('Pilot B has the canonical route, metadata, shared visual system, and JP authority', () => {
  assert.ok(html.includes('<html lang="en-US">'));
  assert.ok(html.includes(`<link rel="canonical" href="${route}"`));
  assert.ok(html.includes(`<meta property="og:url" content="${route}"`));
  assert.ok(html.includes('<meta name="robots" content="index,follow"'));
  assert.equal(sitemap.split(`<loc>${route}</loc>`).length - 1, 1);
  for (const value of ['/styles/yzrs-ui.css', '/styles/yzrs-top.css', '/analytics.js', jp]) assert.ok(html.includes(`"${value}"`));
});

test('all 20 approved article contract items remain addressable', () => {
  const ids = ['what-failed', 'audience', 'hardware', 'initial-symptoms', 'disassembly', 'repair', 'connector-wiring', 'conditions', 'measurements', 'remaining-failure', 'power-banks', 'interpretation', 'unknowns', 'stop-decision', 'operating-decision', 'product-intent', 'alternatives', 'safety', 'sources'];
  // Items 19 (JP Authority) and 20 (source bundle) share the sources section.
  for (const id of ids) assert.ok(html.includes(`id="${id}"`), id);
  assert.ok(html.slice(html.indexOf('id="sources"')).includes(`href="${jp}"`));
});

test('E01–E11 preserve measurement point, mode, load and authorized values without filling gaps', () => {
  const rows = [...html.matchAll(/<tr data-evidence="(E\d+)"[^>]*>([\s\S]*?)<\/tr>/g)];
  assert.deepEqual(rows.map(m => m[1]), Array.from({ length: 11 }, (_, i) => `E${String(i + 1).padStart(2, '0')}`));
  const approved = {
    E01: ['Anker USB source', ['≈5.09 V', 'Not specified for this reading', 'Not specified for this reading']],
    E02: ['5V, no load', ['Simultaneity unconfirmed', '≈4.99 V', 'Not reported']],
    E03: ['7V, no load', ['Simultaneity unconfirmed', '≈6.98 V', 'Not reported']],
    E04: ['9V, no load', ['Simultaneity unconfirmed', '≈8.98–8.99 V', 'Not reported']],
    E05: ['5V, fan load; count unconfirmed', ['Simultaneity unconfirmed', '≈4.92 V', 'Separate reading below']],
    E06: ['7V, fan load; count unconfirmed', ['Simultaneity unconfirmed', '≈6.90 V', 'Separate reading below']],
    E07: ['9V, one fan', ['Simultaneity unconfirmed', '≈8.86 V', 'Not reported']],
    E08: ['9V, two fans', ['Simultaneity unconfirmed', 'No valid steady measurement; usually stopped before voltage could be checked', 'No valid steady measurement']],
    E09: ['5V, USB input-current check; fan count unconfirmed', ['Simultaneity unconfirmed', 'Separate reading above', '≈0.6 A']],
    E10: ['7V, USB input-current check; fan count unconfirmed', ['Simultaneity unconfirmed', 'Separate reading above', '≈1.32–1.6 A']],
    E11: ['9V, USB meter inserted in series', ['Simultaneity unconfirmed', 'No steady reading established', 'No valid steady measurement; setup stopped']],
  };
  for (const [, id, row] of rows) {
    assert.ok(row.includes(approved[id][0]), `${id} condition`);
    assert.deepEqual([...row.matchAll(/<td>(.*?)<\/td>/g)].map(m => m[1]), approved[id][1], `${id} values and measurement columns`);
  }
  assert.ok(text.includes('0.5–0.6 mm in outside diameter, including insulation'));
  assert.ok(text.includes('3.8 mm OD / 1.4 mm ID'));
  assert.ok(text.includes('The current readings are at the USB input, not the fan output.'));
});

test('approved safety block and unit-specific operating limit are preserved', () => {
  const safety = 'This is a troubleshooting record of one repaired unit, not a verified repair procedure for other cables or fans. Disconnect USB power before soldering, verify polarity before reconnecting power, and prevent shorts. Connector dimensions alone do not establish electrical compatibility. Damaged USB or power wiring can heat up. Follow known component and cable ratings where available; unknown ratings are not permission to exceed them. Stop using the setup if the converter, connector, wiring, or power bank becomes abnormally hot. A near-nominal voltage reading, especially with no load, does not establish current capability or long-term safety.';
  assert.ok(text.includes(safety));
  assert.ok(text.includes('On this repaired unit, I chose 7V as the practical operating limit.'));
  assert.ok(text.includes('No-load operation does not prove loaded capability.'));
  assert.ok(text.includes('not a safety rating or a recommendation for other converters, fans, cables, batteries, or repair leads'));
});

test('causal uncertainty, hardware identities, and recovery/noise boundaries remain explicit', () => {
  for (const required of [
    'The measurements narrow the problem toward the boost-converter/load side, but the exact limiting mechanism was not identified.',
    'The root cause, controller identity, detailed circuit, board maximum current, and protection thresholds remain unknown.',
    'Anker PowerCore Essential 20000', 'UGREEN PB312',
    'switching back to 5V or 7V could restart the fans without unplugging and reconnecting USB',
    'Continuous power availability was not measured',
    'power-bank protection or automatic recovery was not ruled out',
    'The newly purchased replacement female jack made the same rattling sound.',
    'The sound therefore did not prove that the original jack was defective.',
    'I also could not establish that the sound was normal by design.',
    'The controller IC remains unidentified.',
  ]) assert.ok(text.includes(required), required);
  for (const pattern of [/(?<![\d.])2\s*A\b/i, /7\s*V is safe/i, /the board blocked (?:the )?current/i, /87\s*W/i, /24\s*V\s*3\s*A/i, /(?:≈|approximately\s+)0\s*[VA]\b/i]) assert.doesNotMatch(text, pattern);
});

test('Product Intent retains review fields without shopping, affiliates or new input claims', () => {
  for (const id of ['pi01', 'pi02', 'pi03', 'pi04']) {
    const section = html.split(`id="${id}"`)[1].split('<h')[0];
    assert.ok(section.includes('REVIEW:'));
    assert.ok(section.includes('Purpose:'));
  }
  assert.ok(text.includes('US product examples: None.'));
  assert.ok(text.includes('Dimensions alone do not prove compatibility.'));
  assert.doesNotMatch(html, /affiliate\.js|amazon\.(?:com|co\.jp)|amzn\.to|link\.amazon|skimlinks|sparkfun|<input\b|<textarea\b|<form\b/i);
  assert.ok(text.includes('They are historical evidence, not new measurements or an independent hardware investigation.'));
  const images = [...html.matchAll(/<img\b[^>]*>/g)];
  assert.equal(images.length, 6);
  for (const [tag] of images) {
    assert.match(tag, /alt="[^"]+"/);
    assert.match(tag, /width="\d+" height="\d+"/);
    const src = tag.match(/src="([^"]+)"/)[1];
    assert.ok(src.startsWith('/en/builds/usb-boost-cable-repair/assets/'));
    assert.ok(readFileSync(new URL(`../public${src}`, import.meta.url)).length > 0);
  }
  assert.ok(html.includes('data-source-repo="yzrswork-site"'));
});

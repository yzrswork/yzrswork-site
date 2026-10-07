import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const base = new URL('../public/en/builds/volt-1/', import.meta.url);
const html = readFileSync(new URL('index.html', base), 'utf8');
const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');

test('Pilot C canonical route, shared presentation, sitemap and sibling links', () => {
  for (const value of ['<html lang="en-US">', 'href="https://yzrswork.com/en/builds/volt-1/"', 'content="https://yzrswork.com/en/builds/volt-1/"', '/styles/yzrs-ui.css', '/styles/yzrs-top.css', '/analytics.js', 'href="/en/tools/makers-bench/"', 'href="/en/builds/usb-boost-cable-repair/"']) assert.ok(html.includes(value), value);
  const sitemap = readFileSync(new URL('../public/sitemap.xml', import.meta.url), 'utf8');
  assert.equal(sitemap.split('<loc>https://yzrswork.com/en/builds/volt-1/</loc>').length - 1, 1);
});

test('article contract and all six Product Intents remain addressable', () => {
  for (const id of ['what-it-does', 'audience', 'tested-status', 'donor', 'tools', 'product-intent', 'build-steps', 'preparation', 'acrylic', 'mounting', 'retention', 'failure', 'wiring', 'measurements', 'current-configuration', 'troubleshooting', 'alternatives', 'safety', 'parts-sources', 'sources', 'pi01', 'pi02', 'pi03', 'pi04', 'pi05', 'pi06']) assert.ok(html.includes(`id="${id}"`), id);
  for (const id of ['pi01', 'pi02', 'pi03', 'pi04', 'pi05', 'pi06']) assert.ok(html.split(`id="${id}"`)[1].split('</tr>')[0].includes('REVIEW:'));
  assert.match(text, /same watch and frame are not required/);
  assert.match(text, /US product candidates: none/);
  assert.match(text, /physical fit is not verified/);
  assert.doesNotMatch(html, /amzn\.to|amazon\.(com|co\.jp)|affiliate\.js|skimlinks|<form\b/i);
});

test('numerical observations retain historical versus acceptance boundaries', () => {
  const initial = html.match(/<tr data-evidence="initial">([\s\S]*?)<\/tr>/)[1];
  const acceptance = html.match(/<tr data-evidence="acceptance">([\s\S]*?)<\/tr>/)[1];
  assert.match(initial, /5 V USB/); assert.match(initial, /5\.1X/); assert.match(initial, /Functional confirmation only/); assert.match(initial, /No calibrated comparison/);
  assert.match(acceptance, /2–3 hours/); assert.match(acceptance, /production configuration/); assert.match(acceptance, /not laboratory qualification/); assert.match(acceptance, /numeric voltage values were not preserved/);
  for (const status of ['Cold start PASS', 'voltage / voltage-drop check PASS', 'mobile-battery auto-off check PASS', 'backup supply PASS']) assert.ok(acceptance.includes(status));
  for (const value of ['76 × 100 × 12 mm', '2 mm black acrylic', 'M2 screws', '0.6 mm copper wire', 'W620-4140']) assert.ok(text.includes(value));
  assert.match(text, /1 mm bit broke/); assert.match(text, /switched to a 2 mm bit/); assert.match(text, /did not isolate whether the failure/);
  assert.doesNotMatch(text, /ZN02B|4\.5\s*[–−-]\s*30|±\s*1\s*%|20\s*mA|(?:white|red)\s+(?:display|digits)|1 mm (?:was|is) too small/i);
  assert.match(text, /standalone current draw.*remain unknown/);
});

test('all four unique real photographs have local assets, dimensions, captions and provenance', () => {
  const figures = [...html.matchAll(/<figure\b[^>]*>([\s\S]*?)<\/figure>/g)];
  assert.equal(figures.length, 4);
  const readme = readFileSync(new URL('assets/README.md', base), 'utf8');
  const paths = new Set();
  for (const [, figure] of figures) {
    const tag = figure.match(/<img\b[^>]*>/)[0];
    const src = tag.match(/src="([^"]+)"/)[1]; paths.add(src);
    assert.ok(src.startsWith('/en/builds/volt-1/assets/'));
    assert.match(tag, /alt="[^\"]{30,}"/); assert.match(tag, /width="\d+" height="\d+"/);
    assert.match(figure, /<figcaption>[^<]{30,}<\/figcaption>/);
    assert.ok(readFileSync(new URL(`../public${src}`, import.meta.url)).length > 0);
    assert.ok(readme.includes(src.split('/').at(-1)));
  }
  assert.equal(paths.size, 4); assert.match(readme, /byte-for-byte/); assert.match(readme, /SHA-256/);
  assert.doesNotMatch(html, /<img[^>]+https:\/\/assets\.st-note/);
  assert.match(text, /green display working/); assert.match(text, /front view shows display placement/);
});

test('five-volt safety scope, polarity and mechanical precautions are retained', () => {
  const safety = html.split('id="safety"')[1].split('</aside>')[0];
  for (const value of ['5 V DC only', 'mains or AC', 'supported voltage range', 'do not exceed it', 'Confirm polarity', 'disconnect power', 'Remove the donor watch battery', 'Clamp small metal parts', 'eye protection', 'thin drill bits can break', '5 V and GND', 'insulate exposed conductors']) assert.ok(safety.includes(value), value);
  assert.match(text, /No source-confirmed connector pinout/);
});

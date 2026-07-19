import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import vm from 'node:vm';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const htmlPath = join(root, 'index.html');

function source() {
  return readFileSync(htmlPath, 'utf8');
}

function scriptById(html, id) {
  const pattern = new RegExp(`<script[^>]*id=["']${id}["'][^>]*>([\\s\\S]*?)<\\/script>`);
  const match = html.match(pattern);
  assert.ok(match, `missing #${id}`);
  return match[1];
}

function loadContracts() {
  const html = source();
  const context = vm.createContext({ console, URL });
  vm.runInContext(
    `${scriptById(html, 'wedding-config')}\n${scriptById(html, 'wedding-utils')}\n` +
      'globalThis.__contracts = { WEDDING_CONFIG, WeddingUtils };',
    context,
  );
  return context.__contracts;
}

test('runtime is one self-contained index without external code', () => {
  const html = source();
  assert.match(html, /<script[^>]*id="wedding-config"/);
  assert.match(html, /<script[^>]*id="wedding-utils"/);
  assert.match(html, /<script[^>]*id="wedding-app"/);
  assert.doesNotMatch(html, /<script[^>]+src=/i);
  assert.doesNotMatch(html, /<link[^>]+rel=["']stylesheet["']/i);
});

test('configuration exposes every section toggle', () => {
  const { WEDDING_CONFIG: config } = loadContracts();
  assert.deepEqual(
    Object.keys(config.sections),
    ['intro', 'hero', 'invitation', 'couple', 'schedule', 'story', 'gallery', 'location', 'transportation', 'notices', 'accounts', 'share', 'outro'],
  );
  assert.ok(Object.values(config.sections).every(value => typeof value === 'boolean'));
});

test('all local media paths use replaceable asset folders', () => {
  const { WEDDING_CONFIG: config } = loadContracts();
  assert.match(config.intro.video, /^\.\/assets\/video\//);
  assert.match(config.intro.poster, /^\.\/assets\/images\//);
  assert.match(config.media.hero, /^\.\/assets\/images\//);
  assert.match(config.media.map, /^\.\/assets\/images\//);
  assert.ok(config.media.gallery.every(item => item.src.startsWith('./assets/images/')));
});

test('calendarCells marks 24 October 2026 and starts on Thursday', () => {
  const { WeddingUtils: utils } = loadContracts();
  const cells = Array.from(utils.calendarCells('2026-10-24'));
  assert.equal(cells.length, 35);
  assert.deepEqual(cells.slice(0, 4), [null, null, null, null]);
  assert.equal(cells.find(cell => cell?.isWedding)?.day, 24);
});

test('countdownParts is deterministic before, on, and after the wedding', () => {
  const { WeddingUtils: utils } = loadContracts();
  const target = Date.parse('2026-10-24T12:30:00+09:00');
  assert.deepEqual(
    { ...utils.countdownParts(target, Date.parse('2026-10-23T12:30:00+09:00')) },
    { state: 'before', days: 1, hours: 0, minutes: 0, seconds: 0 },
  );
  assert.equal(utils.countdownParts(target, target).state, 'today');
  assert.equal(utils.countdownParts(target, Date.parse('2026-10-25T00:00:00+09:00')).state, 'after');
  assert.equal(utils.countdownParts(Number.NaN, target).state, 'invalid');
});

test('countdownParts uses the Korea calendar date after the wedding time', () => {
  const { WeddingUtils: utils } = loadContracts();
  const target = Date.parse('2026-10-24T12:30:00+09:00');
  assert.equal(utils.countdownParts(target, Date.parse('2026-10-24T18:00:00+09:00')).state, 'today');
  assert.equal(utils.countdownParts(target, Date.parse('2026-10-25T00:00:00+09:00')).state, 'after');
});

test('app provides every safe section renderer', () => {
  const html = source();
  const app = scriptById(html, 'wedding-app');
  const keys = ['hero', 'invitation', 'couple', 'schedule', 'story', 'gallery', 'location', 'transportation', 'notices', 'accounts', 'share', 'outro'];
  for (const key of keys) assert.match(app, new RegExp(`\\b${key}\\s*:`));
  assert.equal((html.match(/<main id="invitation-app"/g) || []).length, 1);
  assert.doesNotMatch(html, /\sstyle=/i);
  assert.match(app, /textContent/);
  assert.match(app, /createElement/);
  assert.match(app, /DocumentFragment/);
});

test('renderers provide a complete accessible document and media outline', () => {
  const app = scriptById(source(), 'wedding-app');
  assert.match(app, /sectionShell\('hero',[\s\S]*?'h1'\)/);
  assert.match(app, /함께해 주셔서 감사합니다/);
  assert.match(app, /addEventListener\('load',[\s\S]*?placeholder\.remove\(\)/);
  assert.match(app, /setAttribute\('scope', 'col'\)/);
  assert.match(app, /일요일/);
});

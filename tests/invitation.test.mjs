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

class FakeClassList {
  constructor() {
    this.values = new Set();
  }

  add(...names) {
    names.forEach(name => this.values.add(name));
  }

  remove(...names) {
    names.forEach(name => this.values.delete(name));
  }

  contains(name) {
    return this.values.has(name);
  }
}

class FakeNode {
  constructor(tagName = 'div') {
    this.tagName = tagName.toUpperCase();
    this.children = [];
    this.dataset = {};
    this.attributes = new Map();
    this.classList = new FakeClassList();
    this.style = { setProperty() {} };
    this.textContent = '';
    this.focusCalls = [];
    this.listeners = new Map();
    this.inert = false;
  }

  set className(value) {
    this.classList = new FakeClassList();
    String(value).split(/\s+/).filter(Boolean).forEach(name => this.classList.add(name));
  }

  get className() {
    return [...this.classList.values].join(' ');
  }

  append(...nodes) {
    nodes.forEach(node => {
      if (node?.isFragment) this.children.push(...node.children);
      else if (node) this.children.push(node);
    });
  }

  before() {}

  replaceChildren(...nodes) {
    this.children = [];
    this.append(...nodes);
  }

  setAttribute(name, value) {
    this.attributes.set(name, String(value));
  }

  getAttribute(name) {
    return this.attributes.get(name) ?? null;
  }

  removeAttribute(name) {
    this.attributes.delete(name);
  }

  addEventListener(type, listener) {
    const listeners = this.listeners.get(type) || [];
    listeners.push(listener);
    this.listeners.set(type, listeners);
  }

  removeEventListener(type, listener) {
    const listeners = this.listeners.get(type) || [];
    this.listeners.set(type, listeners.filter(candidate => candidate !== listener));
  }

  focus(options) {
    this.focusCalls.push(options);
  }

  pause() {}

  play() {}

  remove() {
    this.removed = true;
  }

  matches(selector) {
    if (selector.startsWith('.')) return this.classList.contains(selector.slice(1));
    const dataMatch = selector.match(/^\[data-([a-z-]+)\]$/);
    if (dataMatch) {
      const key = dataMatch[1].replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
      return Object.hasOwn(this.dataset, key);
    }
    return false;
  }

  querySelector(selector) {
    return this.querySelectorAll(selector)[0] || null;
  }

  querySelectorAll(selector) {
    const matches = [];
    const visit = node => {
      node.children.forEach(child => {
        if (child.matches?.(selector)) matches.push(child);
        visit(child);
      });
    };
    visit(this);
    return matches;
  }
}

class FakeFragment extends FakeNode {
  constructor() {
    super('fragment');
    this.isFragment = true;
  }

  cloneNode() {
    return new FakeFragment();
  }
}

function createHarness({ now = Date.now(), introEnabled = true, names, disabledSections = [] } = {}) {
  const ids = new Map();
  const documentListeners = new Map();
  const clearedIntervals = [];
  const intervals = [];
  let currentNow = now;

  const document = {
    title: source().match(/<title>([^<]*)<\/title>/)[1],
    body: new FakeNode('body'),
    documentElement: new FakeNode('html'),
    createElement: tag => new FakeNode(tag),
    createTextNode: text => Object.assign(new FakeNode('#text'), { textContent: String(text) }),
    getElementById: id => ids.get(id) || null,
    querySelectorAll: () => [],
    addEventListener(type, listener) {
      const listeners = documentListeners.get(type) || [];
      listeners.push(listener);
      documentListeners.set(type, listeners);
    },
    removeEventListener(type, listener) {
      const listeners = documentListeners.get(type) || [];
      documentListeners.set(type, listeners.filter(candidate => candidate !== listener));
    },
    execCommand: () => true,
  };

  const app = new FakeNode('main');
  ids.set('invitation-app', app);

  const template = new FakeNode('template');
  template.content = new FakeFragment();
  ids.set('intro-template', template);

  const intro = new FakeNode('div');
  const eyebrow = new FakeNode('p');
  eyebrow.dataset.introEyebrow = '';
  const heading = new FakeNode('h1');
  heading.dataset.introTitle = '';
  const status = new FakeNode('p');
  status.dataset.introStatus = '';
  const mediaLabel = new FakeNode('span');
  mediaLabel.dataset.introMediaLabel = '';
  intro.append(eyebrow, heading, status, mediaLabel);
  ids.set('intro', intro);

  const video = new FakeNode('video');
  const skip = new FakeNode('button');
  const sound = new FakeNode('button');
  ids.set('intro-video', video);
  ids.set('intro-skip', skip);
  ids.set('intro-sound', sound);

  class HarnessDate extends Date {
    static now() {
      return currentNow;
    }
  }

  const window = {
    setInterval(callback, delay) {
      const id = intervals.length + 1;
      intervals.push({ id, callback, delay });
      return id;
    },
    clearInterval(id) {
      clearedIntervals.push(id);
    },
    setTimeout: () => 1,
    clearTimeout() {},
    requestAnimationFrame: callback => callback(),
    matchMedia: () => ({ matches: true }),
  };

  let configScript = scriptById(source(), 'wedding-config');
  if (!introEnabled) configScript = configScript.replace('intro: true', 'intro: false');
  for (const key of disabledSections) {
    configScript = configScript.replace(`${key}: true`, `${key}: false`);
  }
  if (names) {
    configScript = configScript
      .replace("groom: { name: '김민준'", `groom: { name: '${names.groom}'`)
      .replace("bride: { name: '이서연'", `bride: { name: '${names.bride}'`);
  }

  const appScript = scriptById(source(), 'wedding-app')
    .replace(
      'return { init, renderSections, finishIntro, openDialog, closeDialog, copyText };',
      'return { init, renderSections, renderSchedule, renderIntro, finishIntro, openDialog, closeDialog, copyText };',
    )
    .replace(/\n\s*WeddingApp\.init\(\);\s*$/, '\nglobalThis.__app = WeddingApp;');
  const context = vm.createContext({
    console,
    URL,
    Date: HarnessDate,
    DocumentFragment: FakeFragment,
    document,
    window,
    navigator: {},
    location: { href: 'file:///invitation/index.html' },
  });
  vm.runInContext(`${configScript}\n${scriptById(source(), 'wedding-utils')}\n${appScript}`, context);

  return {
    app: context.__app,
    appNode: app,
    document,
    documentListeners,
    intervals,
    clearedIntervals,
    intro,
    skip,
    setNow(value) {
      currentNow = value;
    },
  };
}

function stylesheetHrefs(html) {
  return [...html.matchAll(/<link[^>]+rel=["']stylesheet["'][^>]+href=["']([^"']+)["']/gi)]
    .map(match => match[1]);
}

test('runtime keeps JavaScript inline and loads styles only from approved font CDNs', () => {
  const html = source();
  assert.match(html, /<script[^>]*id="wedding-config"/);
  assert.match(html, /<script[^>]*id="wedding-utils"/);
  assert.match(html, /<script[^>]*id="wedding-app"/);
  assert.doesNotMatch(html, /<script[^>]+src=/i);
  const hosts = stylesheetHrefs(html).map(href => new URL(href).hostname);
  assert.deepEqual(hosts.sort(), ['cdn.jsdelivr.net', 'fonts.googleapis.com']);
});

test('reference-aligned canvas tokens and editable motion defaults are configured', () => {
  const html = source();
  const { WEDDING_CONFIG: config } = loadContracts();
  assert.equal(config.theme.maxWidth, '425px');
  assert.equal(config.theme.transitionMs, 650);
  assert.equal(config.intro.objectPosition, '50% 50%');
  assert.match(html, /--canvas:\s*#eee(?:eee)?;/i);
  assert.match(html, /--paper:\s*#fafafa;/i);
  assert.match(html, /--page-width:\s*425px;/);
  assert.match(html, /--media-ratio:\s*3\s*\/\s*4;/);
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

test('initialization derives the document title from configured couple names', () => {
  const harness = createHarness({
    introEnabled: false,
    names: { groom: '새신랑', bride: '새신부' },
  });

  harness.app.init();

  assert.equal(harness.document.title, '새신랑 ♥ 새신부 결혼식에 초대합니다');
  assert.equal(source().match(/<title>([^<]*)<\/title>/)[1], '모바일 청첩장');
  const outsideConfig = source().replace(/<script[^>]*id="wedding-config"[^>]*>[\s\S]*?<\/script>/, '');
  assert.doesNotMatch(outsideConfig, /김민준|이서연/);
});

test('schedule refreshes its countdown every second and stops after the before state', () => {
  const target = Date.parse('2026-10-24T12:30:00+09:00');
  const harness = createHarness({ now: target - 1000 });

  const schedule = harness.app.renderSchedule();

  assert.equal(harness.intervals.length, 1);
  assert.equal(harness.intervals[0].delay, 1000);
  assert.deepEqual(
    schedule.querySelectorAll('[data-countdown-unit]').map(node => node.textContent),
    ['0', '0', '0', '1'],
  );

  const rerenderedSchedule = harness.app.renderSchedule();
  assert.equal(harness.intervals.length, 2);
  assert.deepEqual(harness.clearedIntervals, [harness.intervals[0].id]);

  harness.setNow(target);
  harness.intervals[1].callback();

  assert.deepEqual(
    rerenderedSchedule.querySelectorAll('[data-countdown-unit]').map(node => node.textContent),
    ['0', '0', '0', '0'],
  );
  assert.equal(rerenderedSchedule.querySelector('.countdown-message').textContent, '오늘, 저희 결혼합니다.');
  assert.deepEqual(harness.clearedIntervals, harness.intervals.map(interval => interval.id));

  const after = createHarness({ now: target + 24 * 60 * 60 * 1000 });
  const afterSchedule = after.app.renderSchedule();
  assert.equal(after.intervals.length, 0);
  assert.equal(afterSchedule.querySelector('.countdown-message').textContent, '함께 축복해 주셔서 감사합니다.');
});

test('intro hides and inerts the invitation, labels and focuses skip, then restores access', () => {
  const harness = createHarness();

  harness.app.renderIntro();

  assert.equal(harness.appNode.inert, true);
  assert.equal(harness.appNode.getAttribute('aria-hidden'), 'true');
  assert.equal(harness.skip.getAttribute('aria-label'), '인트로 건너뛰기');
  assert.equal(harness.skip.focusCalls.length, 1);
  assert.equal(harness.skip.focusCalls[0].preventScroll, true);

  harness.app.finishIntro('skip');

  assert.equal(harness.appNode.inert, false);
  assert.equal(harness.appNode.getAttribute('aria-hidden'), null);
  assert.equal(harness.appNode.focusCalls.length, 1);
  assert.equal(harness.appNode.focusCalls[0].preventScroll, true);
});

test('intro and invitation share the paper canvas without a dark full-screen flash', () => {
  const html = source();
  assert.match(html, /class="intro-shell"/);
  assert.match(html, /class="intro-card"/);
  assert.match(html, /class="intro-media"/);
  assert.match(html, /\.intro-card,\s*\n\s*\.invitation-page\s*\{[\s\S]*background-image:\s*var\(--paper-texture\)/);
  assert.match(html, /\.intro\s*\{[\s\S]*background:\s*var\(--canvas\)/);
  assert.match(html, /\.intro-skip\s*\{[\s\S]*top:\s*24px;[\s\S]*right:\s*20px;[\s\S]*rgba\(0, 0, 0, 0\.4\)/);
});

test('hero through story render the reference-aligned editorial structure', () => {
  const html = source();
  const app = scriptById(html, 'wedding-app');
  const { WEDDING_CONFIG: config } = loadContracts();
  assert.equal(config.messages.hero, 'BEGINS\nON OCT');
  assert.equal(config.messages.heroOrbit, 'JOIN US · JOIN US ·');
  assert.equal(config.messages.heroTagline, 'A new chapter begins with the people we love.');
  assert.match(app, /hero-display/);
  assert.match(app, /hero-orbit/);
  assert.match(app, /hero-tagline/);
  assert.match(app, /section-index/);
  assert.match(app, /story-media/);
  assert.match(html, /\.hero-display\s*\{[\s\S]*font-family:\s*var\(--display\)/);
  assert.match(html, /\.invitation-section\s*\{[\s\S]*padding:[^;]*(?:96px|clamp\(96px)/);
  assert.match(html, /\.story-item:nth-child\(even\)[\s\S]*\.story-media/);
});

test('sections follow the reference narrative order and keep lower-page interactions', () => {
  const html = source();
  const app = scriptById(html, 'wedding-app');
  const order = ['hero', 'invitation', 'couple', 'schedule', 'story', 'location', 'transportation', 'gallery', 'notices', 'accounts', 'share', 'outro'];
  const positions = order.map(key => app.indexOf(`${key}: render`));
  assert.ok(positions.every(position => position >= 0));
  assert.deepEqual([...positions].sort((a, b) => a - b), positions);
  assert.match(html, /\.gallery-grid\s*\{[\s\S]*grid-template-columns:\s*repeat\(12/);
  assert.match(html, /\.location-section \.section-body[\s\S]*margin-inline:/);
  assert.match(html, /\.account-group\s*\{[\s\S]*border-top:/);
  assert.match(app, /navigator\.share/);
  assert.match(app, /dataset\.copyAccount/);
});

test('optional story images stay inside the replaceable image folder', () => {
  const { WEDDING_CONFIG: config } = loadContracts();
  assert.ok(config.story.every(item => !item.image || item.image.startsWith('./assets/images/')));
});

test('intro exits to the first enabled section when hero is disabled', () => {
  const harness = createHarness({ disabledSections: ['hero'] });
  harness.app.renderSections();
  harness.app.renderIntro();
  harness.app.finishIntro('skip');
  const firstSection = harness.appNode.querySelector('[data-section]');
  assert.equal(firstSection.dataset.section, 'invitation');
  assert.equal(firstSection.focusCalls.length, 1);
  assert.equal(harness.appNode.inert, false);
  assert.equal(harness.appNode.getAttribute('aria-hidden'), null);
});

test('intro removes its Escape listener on finish and stays inactive when disabled', () => {
  const harness = createHarness();
  harness.app.renderIntro();
  const keydownHandler = harness.documentListeners.get('keydown')[0];

  harness.app.finishIntro('skip');

  assert.ok(keydownHandler);
  assert.deepEqual(harness.documentListeners.get('keydown'), []);

  const repeated = createHarness();
  repeated.app.renderIntro();
  repeated.app.renderIntro();
  assert.equal(repeated.documentListeners.get('keydown').length, 1);
  repeated.app.finishIntro('skip');
  assert.deepEqual(repeated.documentListeners.get('keydown'), []);

  const disabled = createHarness({ introEnabled: false });
  disabled.app.renderIntro();
  assert.equal(disabled.appNode.inert, false);
  assert.equal(disabled.appNode.getAttribute('aria-hidden'), null);
  assert.deepEqual(disabled.documentListeners.get('keydown') || [], []);
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

test('outro reads its personal signature only from configuration', () => {
  const app = scriptById(source(), 'wedding-app');
  assert.doesNotMatch(app, /Minjun & Seoyeon/);
  assert.match(app, /sectionShell\('outro', WEDDING_CONFIG\.messages\.signature,/);
});

test('intro and progressive enhancement contracts are present', () => {
  const html = source();
  const app = scriptById(html, 'wedding-app');
  assert.match(app, /video\.autoplay\s*=\s*true/);
  assert.match(app, /video\.muted\s*=/);
  assert.match(app, /video\.playsInline\s*=\s*true/);
  assert.match(html, />SKIP</);
  assert.match(app, /addEventListener\(['"]ended['"]/);
  assert.match(app, /addEventListener\(['"]error['"]/);
  assert.match(app, /Escape/);
  assert.match(app, /execCommand\(['"]copy['"]\)/);
  assert.match(app, /navigator\.share/);
  assert.match(app, /AbortError/);
});

test('replaceable asset directories exist and every asset path is relative', () => {
  assert.ok(existsSync(join(root, 'assets/images')));
  assert.ok(existsSync(join(root, 'assets/video')));
  const paths = source().match(/\.\/assets\/[A-Za-z0-9_./-]+/g) || [];
  assert.ok(paths.length >= 4);
  for (const assetPath of paths) {
    assert.doesNotMatch(assetPath, /\.\.|\\\\/);
    assert.ok(!assetPath.startsWith('/'));
  }
});

test('inline runtime scripts and style block are syntactically self-contained', () => {
  const html = source();
  assert.equal((html.match(/<style(?:\s[^>]*)?>/g) || []).length, 1);
  for (const id of ['wedding-config', 'wedding-utils', 'wedding-app']) {
    assert.doesNotThrow(() => new vm.Script(scriptById(html, id), { filename: `${id}.js` }));
  }
});

# Mobile Wedding Invitation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 참고 사이트의 에디토리얼 분위기를 살리면서, 상단 설정 객체만 수정하면 로컬 파일과 GitHub Pages에서 모두 작동하는 단일 `index.html` 모바일 청첩장을 만든다.

**Architecture:** `index.html` 내부를 설정(`wedding-config`), 순수 계산 함수(`wedding-utils`), DOM 앱(`wedding-app`), 인라인 CSS로 논리 분리한다. `WEDDING_CONFIG`가 유일한 정보 원본이고, 앱은 켜진 섹션만 렌더링하며 모든 미디어는 `./assets/images` 또는 `./assets/video` 상대 경로를 사용한다.

**Tech Stack:** HTML5, CSS3, 브라우저 표준 JavaScript(ES2020), Node.js 내장 `node:test`/`node:vm` 정적·순수 함수 테스트, 인앱 브라우저 모바일 QA

## Global Constraints

- 실행 코드는 루트의 `index.html` 한 파일에만 둔다.
- 빌드 도구, 서버, 외부 라이브러리를 런타임에 사용하지 않는다.
- `file://` 직접 열기와 GitHub Pages를 모두 지원한다.
- 실제 정보와 섹션 토글은 문서 상단 `WEDDING_CONFIG`에서만 수정한다.
- 이미지 경로는 `./assets/images/`, 영상 경로는 `./assets/video/`만 사용한다.
- 미디어가 없어도 깨진 아이콘이나 빈 화면 없이 디자인된 대체 화면을 보인다.
- 런타임에 외부 폰트, CDN, 지도 SDK, 카카오 JavaScript SDK를 요청하지 않는다.
- 360px 모바일부터 넓은 데스크톱까지 수평 스크롤이 생기지 않아야 한다.

## File Structure

- Create: `index.html` — 설정, 스타일, 모든 청첩장 마크업 생성 코드와 상호작용을 포함하는 유일한 실행 파일
- Create: `tests/invitation.test.mjs` — HTML 계약, 설정 스키마, 미디어 경로, 달력·카운트다운 순수 함수 검증
- Create: `assets/images/.gitkeep` — Git에서 이미지 교체 폴더 유지
- Create: `assets/video/.gitkeep` — Git에서 영상 교체 폴더 유지
- Existing: `docs/superpowers/specs/2026-07-20-mobile-wedding-invitation-design.md` — 승인된 요구사항과 예외 처리 기준

---

### Task 1: 설정 계약과 날짜 유틸리티

**Files:**
- Create: `tests/invitation.test.mjs`
- Create: `index.html`

**Interfaces:**
- Produces: 전역 상수 `WEDDING_CONFIG`
- Produces: `WeddingUtils.calendarCells(dateKey: string): Array<null | { day: number, isWedding: boolean }>`
- Produces: `WeddingUtils.countdownParts(targetMs: number, nowMs: number): { state: 'before' | 'today' | 'after' | 'invalid', days: number, hours: number, minutes: number, seconds: number }`
- Produces: `WeddingUtils.telHref(value: string): string`
- Produces: `WeddingUtils.toLines(value: string | string[]): string[]`

- [ ] **Step 1: Write the failing configuration and utility tests**

Create `tests/invitation.test.mjs` with Node built-ins only:

```js
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
```

- [ ] **Step 2: Run tests and verify the missing implementation fails**

Run:

```bash
/Users/gyumin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node --test tests/invitation.test.mjs
```

Expected: FAIL because `index.html` does not exist.

- [ ] **Step 3: Add the complete editable configuration at the top of `index.html`**

Create the HTML document and put `<script id="wedding-config">` before `<style>`. Define these exact top-level groups and realistic placeholder values:

```js
const WEDDING_CONFIG = Object.freeze({
  sections: { intro: true, hero: true, invitation: true, couple: true, schedule: true, story: true, gallery: true, location: true, transportation: true, notices: true, accounts: true, share: true, outro: true },
  theme: { paper: '#f2efe8', ink: '#20211d', muted: '#77766f', sage: '#798071', bronze: '#9a765a', maxWidth: '460px' },
  intro: { video: './assets/video/intro.mp4', poster: './assets/images/intro-poster.jpg', eyebrow: 'WEDDING INVITATION', title: 'LOVE OF LIFE', muted: true, fallbackDelayMs: 2800 },
  couple: {
    groom: { name: '김민준', englishName: 'MINJUN', phone: '010-1234-5678', parents: [{ relation: '아버지', name: '김아버지', phone: '010-1111-1111' }, { relation: '어머니', name: '박어머니', phone: '010-2222-2222' }] },
    bride: { name: '이서연', englishName: 'SEOYEON', phone: '010-9876-5432', parents: [{ relation: '아버지', name: '이아버지', phone: '010-3333-3333' }, { relation: '어머니', name: '최어머니', phone: '010-4444-4444' }] },
  },
  wedding: { iso: '2026-10-24T12:30:00+09:00', dateKey: '2026-10-24', displayDate: '2026. 10. 24. SAT', displayTime: '오후 12시 30분', venue: '아르베 웨딩', hall: '그랜드 홀 · 3층', address: '서울특별시 강남구 테헤란로 123', phone: '02-1234-5678' },
  messages: { hero: 'OUR STORY\nBEGINS HERE', invitationTitle: '소중한 분들을 초대합니다', invitation: ['서로의 하루를 아끼며', '같은 곳을 바라보게 된 두 사람이', '이제 한 가족이 되려 합니다.', '', '저희의 새로운 시작을', '따뜻한 마음으로 축복해 주세요.'], outro: ['장담하건대, 세상이 다 겨울이어도', '우리 사랑은 늘 봄처럼 따뜻할 것입니다.'], signature: 'With love, Minjun & Seoyeon' },
  media: { hero: './assets/images/hero.jpg', map: './assets/images/map.jpg', gallery: Array.from({ length: 8 }, (_, index) => ({ src: `./assets/images/gallery-${String(index + 1).padStart(2, '0')}.jpg`, alt: `웨딩 사진 ${index + 1}` })) },
  story: [{ year: '2020', label: '첫 만남', title: '우연처럼 시작된 우리', body: '평범했던 하루가 서로를 만나 특별해졌습니다.' }, { year: '2022', label: '여행', title: '같은 풍경을 바라보며', body: '수많은 계절과 여행 속에서 서로의 가장 편안한 사람이 되었습니다.' }, { year: '2026', label: '약속', title: '평생을 함께하기로', body: '앞으로의 모든 날을 함께 걷기로 약속했습니다.' }],
  transportation: [{ title: '지하철', lines: ['2호선 역삼역 3번 출구에서 도보 5분'] }, { title: '버스', lines: ['간선 146, 341, 360', '지선 3412, 4312'] }, { title: '주차', lines: ['건물 지하 주차장 2시간 무료', '가급적 대중교통 이용을 부탁드립니다.'] }],
  notices: [{ eyebrow: 'PHOTO BOOTH', title: '포토부스 이용 안내', body: '예식 당일 포토부스가 준비됩니다. 환한 미소와 따뜻한 메시지를 남겨주세요.' }, { eyebrow: 'FLOWER', title: '화환은 정중히 사양합니다', body: '축하해 주시는 마음만 감사히 받겠습니다.' }],
  accounts: [{ side: '신랑측', holder: '김민준', bank: '신한은행', number: '110-123-456789' }, { side: '신랑측', holder: '김아버지', bank: '국민은행', number: '123456-01-123456' }, { side: '신부측', holder: '이서연', bank: '우리은행', number: '1002-123-456789' }, { side: '신부측', holder: '이아버지', bank: '하나은행', number: '123-456789-01234' }],
  navigation: { naver: 'https://map.naver.com/', kakao: 'https://map.kakao.com/', tmap: 'https://www.tmap.co.kr/' },
  sharing: { title: '김민준 ♥ 이서연 결혼식에 초대합니다', text: '2026년 10월 24일, 두 사람의 새로운 시작을 함께 축복해 주세요.' },
});
```

- [ ] **Step 4: Implement deterministic utilities**

Add `<script id="wedding-utils">` with this implementation:

```js
const WeddingUtils = Object.freeze((() => {
  const DAY_MS = 24 * 60 * 60 * 1000;

  function calendarCells(dateKey) {
    const match = String(dateKey).match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return [];
    const year = Number(match[1]);
    const month = Number(match[2]);
    const weddingDay = Number(match[3]);
    const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
    if (month < 1 || month > 12 || weddingDay < 1 || weddingDay > lastDay) return [];
    const cells = Array(new Date(Date.UTC(year, month - 1, 1)).getUTCDay()).fill(null);
    for (let day = 1; day <= lastDay; day += 1) {
      cells.push({ day, isWedding: day === weddingDay });
    }
    while (cells.length % 7) cells.push(null);
    return cells;
  }

  function countdownParts(targetMs, nowMs) {
    const empty = { days: 0, hours: 0, minutes: 0, seconds: 0 };
    if (!Number.isFinite(targetMs) || !Number.isFinite(nowMs)) return { state: 'invalid', ...empty };
    const remaining = targetMs - nowMs;
    if (remaining <= 0) {
      return { state: nowMs - targetMs < DAY_MS ? 'today' : 'after', ...empty };
    }
    return {
      state: 'before',
      days: Math.floor(remaining / DAY_MS),
      hours: Math.floor((remaining % DAY_MS) / 3600000),
      minutes: Math.floor((remaining % 3600000) / 60000),
      seconds: Math.floor((remaining % 60000) / 1000),
    };
  }

  function telHref(value) {
    const raw = String(value || '').trim();
    const prefix = raw.startsWith('+') ? '+' : '';
    return `tel:${prefix}${raw.replace(/\D/g, '')}`;
  }

  function toLines(value) {
    return Array.isArray(value) ? value.slice() : String(value || '').split(/\r?\n/);
  }

  return { calendarCells, countdownParts, telHref, toLines };
})());
```

- [ ] **Step 5: Run the contract tests**

Run the Step 2 command.

Expected: all 5 tests PASS.

- [ ] **Step 6: Commit Task 1**

```bash
git add index.html tests/invitation.test.mjs
git commit -m "feat: add wedding configuration contract"
```

---

### Task 2: 에디토리얼 본문과 선택 가능한 섹션

**Files:**
- Modify: `index.html`
- Modify: `tests/invitation.test.mjs`

**Interfaces:**
- Consumes: `WEDDING_CONFIG`, `WeddingUtils`
- Produces: `WeddingApp.init(): void`
- Produces: `WeddingApp.renderSections(): void`
- Produces: DOM IDs `#invitation-app`, `#contact-dialog`, `#lightbox-dialog`, `#toast`
- Produces: `[data-section]`, `[data-media]`, `[data-gallery-index]`, `[data-account-side]` contracts

- [ ] **Step 1: Add failing structural coverage**

Append this test, which extracts `wedding-app` and verifies the renderer contract and safe DOM construction:

```js
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
```

- [ ] **Step 2: Run tests and verify structural coverage fails**

Run the Task 1 test command.

Expected: the new test FAILS because the section renderer map is absent.

- [ ] **Step 3: Build the full semantic section renderer**

In `wedding-app`, implement `element(tag, className, text)`, `mediaFrame(src, alt, label)`, `sectionShell(key, eyebrow, title)`, and a `SECTION_RENDERERS` object with exact keys `hero`, `invitation`, `couple`, `schedule`, `story`, `gallery`, `location`, `transportation`, `notices`, `accounts`, `share`, `outro`. Each renderer returns one semantic `section` with `data-section` set to its key. `renderSections` iterates the map and appends only keys where `WEDDING_CONFIG.sections[key] === true`.

Render the schedule calendar from `calendarCells(WEDDING_CONFIG.wedding.dateKey)`, mark the selected date with `aria-current="date"`, and render countdown values into `[data-countdown-unit]`. Render gallery buttons with `data-gallery-index`, account groups by unique `side`, contact controls from non-empty phone values, and navigation anchors only for non-empty URLs.

- [ ] **Step 4: Apply the complete responsive visual system**

Add mobile-first CSS with these exact layout contracts: `--page-width` comes from `theme.maxWidth`; body background is warm gray; `.invitation-page` is full width up to `--page-width`; sections use 72–112px vertical padding; hero is at least `100svh`; gallery uses a 12-column asymmetric grid; all buttons are at least 44px high; desktop at `min-width: 700px` adds outer margins and a paper shadow. Use only CSS gradients for grain and placeholder surfaces. Add strong `:focus-visible`, `@media (prefers-reduced-motion: reduce)`, and `@media (forced-colors: active)` rules.

- [ ] **Step 5: Verify Task 2**

Run the Node tests.

Expected: all tests PASS.

Open the file at 390×844 and verify `document.documentElement.scrollWidth === 390`, all 12 enabled body sections exist, and missing photos show `.media-placeholder` labels instead of broken-image icons.

- [ ] **Step 6: Commit Task 2**

```bash
git add index.html tests/invitation.test.mjs
git commit -m "feat: render configurable wedding sections"
```

---

### Task 3: 인트로 영상과 상호작용

**Files:**
- Modify: `index.html`
- Modify: `tests/invitation.test.mjs`

**Interfaces:**
- Consumes: `WEDDING_CONFIG.intro`, rendered DOM contracts from Task 2
- Produces: `WeddingApp.finishIntro(reason: string): void`
- Produces: `WeddingApp.openDialog(dialog: HTMLDialogElement, trigger: HTMLElement): void`
- Produces: `WeddingApp.closeDialog(dialog: HTMLDialogElement): void`
- Produces: `WeddingApp.copyText(value: string): Promise<boolean>`
- Produces: DOM IDs `#intro`, `#intro-video`, `#intro-skip`, `#intro-sound`

- [ ] **Step 1: Add failing interaction contracts**

Append the following static contract test:

```js
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
```

- [ ] **Step 2: Run tests and verify interaction coverage fails**

Run the Node tests.

Expected: the new interaction-contract test FAILS.

- [ ] **Step 3: Implement the intro state machine**

Render a fixed `#intro` before the app only when `sections.intro` is true. Create `<video id="intro-video" autoplay muted playsinline preload="auto">`, set `src` and `poster` from config, and overlay the configured eyebrow/title, progress line, sound control, and `SKIP`. Lock body scrolling with `.is-intro-open`. Route `ended`, `SKIP`, and `Escape` through idempotent `finishIntro`; on `error`, add `.has-media-error`, change the skip label to `청첩장 보기`, announce the missing path, and schedule `finishIntro('media-error')` after `fallbackDelayMs`. If `video.play()` rejects, keep the fallback control visible and schedule the same safe exit. `finishIntro` clears timers, pauses media, removes the body lock, fades the overlay, focuses `#invitation-app`, and removes the intro after transition completion.

- [ ] **Step 4: Implement dialogs, gallery, copy, sharing, and reveal motion**

Use native `<dialog>` for contacts and lightbox. Store the opening trigger, focus the dialog close button, close on `Escape`/backdrop, and restore trigger focus. Gallery previous/next wraps around the configured image array and updates alt text. Account and address copy buttons use `navigator.clipboard.writeText` first, then a visually hidden textarea plus `document.execCommand('copy')`. Sharing uses `navigator.share({ title, text, url: location.href })`; if unavailable, copy `location.href`; ignore `AbortError`. Announce successful and failed actions through `#toast[aria-live="polite"]`. Use one `IntersectionObserver` for `.reveal` elements and display them immediately when reduced motion is active or the observer is unavailable.

- [ ] **Step 5: Verify Task 3**

Run the Node tests.

Expected: all tests PASS.

In the browser, verify the missing default video exits automatically, clicking `SKIP` exits immediately after reload, the contact dialog opens/closes, a gallery placeholder opens and navigates, each account group expands independently, and copy/share status is announced.

- [ ] **Step 6: Commit Task 3**

```bash
git add index.html tests/invitation.test.mjs
git commit -m "feat: add invitation intro and interactions"
```

---

### Task 4: 교체 폴더와 최종 호환성 검증

**Files:**
- Create: `assets/images/.gitkeep`
- Create: `assets/video/.gitkeep`
- Modify: `tests/invitation.test.mjs`

**Interfaces:**
- Consumes: final `index.html`
- Produces: GitHub에 유지되는 두 교체 전용 미디어 디렉터리

- [ ] **Step 1: Add final repository contract tests**

Append these tests using the `existsSync` import already declared at the top of the test file:

```js
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
```

- [ ] **Step 2: Run tests and verify missing folders fail**

Run the Node tests.

Expected: FAIL because the asset directories are not yet tracked.

- [ ] **Step 3: Create the replacement folders**

Create `assets/images/.gitkeep` and `assets/video/.gitkeep` as empty files. Do not add sample copyrighted media or remote image URLs.

- [ ] **Step 4: Run automated verification**

Run:

```bash
/Users/gyumin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node --test tests/invitation.test.mjs
git diff --check
```

Expected: all tests PASS and `git diff --check` prints nothing.

- [ ] **Step 5: Run visual and interaction verification**

Open `index.html` directly as a `file://` URL. At 360×800, 390×844, and 1280×900 confirm no horizontal overflow, intro fallback cannot trap the visitor, all enabled sections render, and keyboard `Tab`/`Escape` behavior works. Temporarily evaluate a config copy with `gallery`, `accounts`, and `story` set to `false` and confirm those section nodes are absent without spacing gaps. Restore the committed configuration after the check.

- [ ] **Step 6: Commit Task 4**

```bash
git add assets/images/.gitkeep assets/video/.gitkeep tests/invitation.test.mjs
git commit -m "test: verify static invitation delivery"
```

## Final Verification Checklist

- [ ] `WEDDING_CONFIG` appears before all style and app code.
- [ ] Every visible personal datum comes from `WEDDING_CONFIG`.
- [ ] Every major section has a boolean toggle.
- [ ] Runtime code exists only in `index.html`.
- [ ] Default missing media displays designed placeholders.
- [ ] Intro ends on video completion and `SKIP`.
- [ ] Local direct opening does not require a server.
- [ ] Node contract tests and `git diff --check` pass.
- [ ] Browser QA covers mobile, desktop, reduced motion, and keyboard controls.

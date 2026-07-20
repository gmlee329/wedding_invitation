# Reference-Aligned Wedding Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 기존 기능과 단일 파일 배포 계약을 보존하면서, 참고 사이트의 425px 종이 카드·대형 세리프 히어로·여백 중심 섹션 흐름과 동일 배경의 동영상 인트로를 구현한다.

**Architecture:** 기존 `WEDDING_CONFIG` → 섹션 렌더러 → 단일 앱 루트 구조를 유지한다. `index.html`의 설정·CSS·인트로 템플릿·렌더러만 재구성하고, `tests/invitation.test.mjs`의 VM 하네스와 정적 계약으로 CDN 허용 목록, 공용 캔버스, 섹션 순서, 인트로 종료 대상을 검증한다.

**Tech Stack:** HTML5, CSS3, 브라우저 표준 JavaScript, Google Fonts, jsDelivr Pretendard CSS, Node.js 내장 `node:test`/`node:vm`, 인앱 Chromium 브라우저 QA

## Global Constraints

- 실행 코드는 루트의 단일 `index.html`에만 둔다.
- `file://`로 `index.html`을 직접 열어도 핵심 기능이 동작한다.
- GitHub public repository와 GitHub Pages 하위 경로에 그대로 배포할 수 있다.
- 사진과 영상은 `assets/images/`, `assets/video/` 안의 파일만 교체해 변경한다.
- 기존 `WEDDING_CONFIG` 키를 이름 변경하거나 재편하지 않는다.
- 모든 섹션은 기존 `WEDDING_CONFIG.sections` 불리언 값으로 독립적으로 표시하거나 숨긴다.
- 자동 로드 외부 리소스는 Google Fonts와 jsDelivr Pretendard CSS만 허용한다.
- 외부 글꼴 로드 실패 시 시스템 글꼴로 폴백하며 핵심 JavaScript는 외부 코드에 의존하지 않는다.
- 인트로는 동영상으로 유지하고 종료·스킵·오류·Escape가 하나의 종료 경로를 사용한다.
- 참고 사이트의 전용 소스 코드, SVG, 이미지, 문구는 복사하지 않는다.
- 360px 이상 화면에서 수평 스크롤이 없어야 한다.
- `prefers-reduced-motion: reduce`에서 긴 전환과 확대 애니메이션을 제거한다.
- 사용자 소유의 `.DS_Store` 파일은 수정·삭제·스테이징하지 않는다.

## File Structure

- Modify: `index.html` — 설정 기본값, 승인된 글꼴 링크, 시각 토큰, 공용 종이 캔버스, 인트로 템플릿·수명주기, 전체 섹션 렌더러와 스타일
- Modify: `tests/invitation.test.mjs` — CDN 허용 목록, 참고 레이아웃, 인트로 전환·토글, 섹션 순서, 반응형·접근성 회귀 계약
- Reference: `docs/superpowers/specs/2026-07-20-reference-aligned-wedding-redesign-design.md` — 승인된 디자인과 검증 기준

---

### Task 1: 승인된 CDN과 참고 레이아웃 토큰

**Files:**
- Modify: `tests/invitation.test.mjs:276-290`
- Modify: `index.html:3-25`
- Modify: `index.html:27-130`

**Interfaces:**
- Consumes: 기존 `WEDDING_CONFIG.theme`, `WEDDING_CONFIG.intro`
- Produces: `theme.maxWidth: '425px'`, `theme.transitionMs: 650`, `intro.objectPosition: '50% 50%'`
- Produces: CSS 변수 `--canvas`, `--paper`, `--paper-texture`, `--page-width`, `--transition-duration`, `--media-ratio`
- Produces: 자동 로드 스타일시트 호스트 허용 목록 `fonts.googleapis.com`, `cdn.jsdelivr.net`

- [ ] **Step 1: 외부 리소스와 시각 토큰의 실패 테스트를 작성한다**

기존 `runtime is one self-contained index without external code` 테스트를 아래 코드로 교체하고 레이아웃 계약 테스트를 추가한다.

```js
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
```

- [ ] **Step 2: 새 테스트가 기존 값과 외부 스타일시트 금지 계약 때문에 실패하는지 확인한다**

Run:

```bash
/Users/gyumin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node --test tests/invitation.test.mjs
```

Expected: 새 두 테스트가 `460px`, 누락된 `transitionMs`/`objectPosition`, 빈 스타일시트 목록 때문에 FAIL하고 기존 테스트는 계속 PASS한다.

- [ ] **Step 3: 설정 기본값과 승인된 글꼴 링크를 구현한다**

`<head>`에서 설정 스크립트 다음, `<style>` 앞에 다음 링크를 추가한다.

```html
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;1,400&amp;family=Gowun+Dodum&amp;display=swap">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css">
```

기존 설정 키를 유지하면서 두 객체를 다음 값으로 갱신한다.

```js
theme: { paper: '#fafafa', ink: '#252321', muted: '#77736d', sage: '#777f70', bronze: '#9d8069', maxWidth: '425px', transitionMs: 650 },
intro: { video: './assets/video/intro.mp4', poster: './assets/images/intro-poster.jpg', eyebrow: 'WEDDING INVITATION', title: 'LOVE OF LIFE', mediaLabel: 'BEGIN OUR DAY', muted: true, fallbackDelayMs: 2800, objectPosition: '50% 50%' },
```

루트 토큰을 다음처럼 교체한다.

```css
:root {
  --canvas: #eeeeee;
  --page-width: 425px;
  --paper: #fafafa;
  --ink: #252321;
  --muted: #77736d;
  --sage: #777f70;
  --bronze: #9d8069;
  --line: color-mix(in srgb, var(--ink) 13%, transparent);
  --transition-duration: 650ms;
  --media-ratio: 3 / 4;
  --paper-texture:
    radial-gradient(circle at 18% 24%, rgb(72 65 56 / 3.5%) 0 0.55px, transparent 0.75px),
    radial-gradient(circle at 76% 68%, rgb(255 255 255 / 72%) 0 0.7px, transparent 0.9px),
    linear-gradient(112deg, rgb(255 255 255 / 20%), transparent 42%, rgb(97 86 72 / 2.5%));
  --display: 'Cormorant Garamond', Georgia, 'Times New Roman', serif;
  --korean: 'Gowun Dodum', 'Apple SD Gothic Neo', sans-serif;
  --ui: Pretendard, -apple-system, BlinkMacSystemFont, 'Apple SD Gothic Neo', sans-serif;
}
```

`applyTheme()` 끝에 편집 가능한 전환 시간을 연결한다.

```js
const transitionMs = Number(WEDDING_CONFIG.theme.transitionMs);
root.style.setProperty('--transition-duration', `${Number.isFinite(transitionMs) ? Math.max(0, transitionMs) : 650}ms`);
```

- [ ] **Step 4: 전체 테스트가 통과하는지 확인한다**

Run: `/Users/gyumin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node --test tests/invitation.test.mjs`

Expected: 기존 16개와 새 2개 테스트가 모두 PASS한다.

- [ ] **Step 5: Task 1을 커밋한다**

```bash
git add index.html tests/invitation.test.mjs
git commit -m "feat: add reference-aligned visual tokens"
```

---

### Task 2: 본문과 같은 종이 캔버스의 동영상 인트로

**Files:**
- Modify: `tests/invitation.test.mjs:145-274`
- Modify: `tests/invitation.test.mjs:345-393`
- Modify: `index.html:130-260`
- Modify: `index.html:995-1016`
- Modify: `index.html:1700-1845`

**Interfaces:**
- Consumes: `theme.transitionMs`, `intro.objectPosition`, `sections.intro`, 활성 `[data-section]`
- Produces: DOM `.intro-shell > .intro-card`, `.intro-media`, `.intro-copy`, `#intro-skip`
- Produces: `introExitTarget(app: Element): Element`
- Produces: 모든 인트로 종료 원인을 단일 `finishIntro(reason: string): void`로 수렴

- [ ] **Step 1: 공용 캔버스와 첫 활성 섹션 포커스의 실패 테스트를 작성한다**

`createHarness` 옵션에 `disabledSections = []`를 추가하고 설정 스크립트 변환 직후 다음 코드를 넣는다.

```js
for (const key of disabledSections) {
  configScript = configScript.replace(`${key}: true`, `${key}: false`);
}
```

다음 테스트를 추가한다.

```js
test('intro and invitation share the paper canvas without a dark full-screen flash', () => {
  const html = source();
  assert.match(html, /class="intro-shell"/);
  assert.match(html, /class="intro-card"/);
  assert.match(html, /class="intro-media"/);
  assert.match(html, /\.intro-card,\s*\n\s*\.invitation-page\s*\{[\s\S]*background-image:\s*var\(--paper-texture\)/);
  assert.match(html, /\.intro\s*\{[\s\S]*background:\s*var\(--canvas\)/);
  assert.match(html, /\.intro-skip\s*\{[\s\S]*top:\s*24px;[\s\S]*right:\s*20px;[\s\S]*rgba\(0, 0, 0, 0\.4\)/);
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
```

- [ ] **Step 2: 기존 전체 화면 영상과 앱 루트 고정 포커스 때문에 테스트가 실패하는지 확인한다**

Run: `/Users/gyumin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node --test tests/invitation.test.mjs`

Expected: `.intro-card`, `.intro-media`, 공용 종이 배경이 없고 종료 포커스가 앱 루트에 가므로 새 테스트가 FAIL한다.

- [ ] **Step 3: 인트로 템플릿을 편집형 영상 카드로 교체한다**

`#intro-template` 내용을 다음 구조로 교체한다.

```html
<div id="intro" class="intro" role="dialog" aria-modal="true" aria-labelledby="intro-title">
  <div class="intro-shell">
    <div class="intro-card">
      <button id="intro-skip" class="intro-skip" type="button" aria-label="인트로 건너뛰기">SKIP</button>
      <div class="intro-copy">
        <p class="intro-eyebrow" data-intro-eyebrow></p>
        <h1 id="intro-title" class="intro-title" data-intro-title></h1>
      </div>
      <div class="intro-media">
        <video id="intro-video" class="intro-video" autoplay muted playsinline preload="auto"></video>
        <span class="intro-media-label" data-intro-media-label aria-hidden="true"></span>
      </div>
      <div class="intro-footer">
        <button id="intro-sound" class="intro-sound" type="button"></button>
        <p class="intro-status" data-intro-status aria-live="polite"></p>
      </div>
    </div>
  </div>
</div>
```

- [ ] **Step 4: 본문과 인트로의 공용 표면 및 전환 CSS를 구현한다**

기존 인트로 CSS를 다음 핵심 규칙으로 교체하고, 세부 타이포 크기는 이 토큰을 기준으로 작성한다.

```css
.intro {
  position: fixed;
  z-index: 50;
  inset: 0;
  overflow: hidden;
  color: var(--ink);
  background: var(--canvas);
  opacity: 1;
  transition: opacity var(--transition-duration) ease;
}

.intro-shell {
  width: 100%;
  max-width: var(--page-width);
  min-height: 100svh;
  margin: 0 auto;
}

.intro-card,
.invitation-page {
  background-color: var(--paper);
  background-image: var(--paper-texture);
  background-size: 17px 23px, 21px 29px, 100% 100%;
}

.intro-card {
  position: relative;
  display: grid;
  min-height: 100svh;
  padding: 70px 24px 34px;
  grid-template-rows: auto 1fr auto;
  overflow: hidden;
}

.intro-media {
  position: relative;
  width: min(72vw, 304px);
  margin: -12px 0 0 auto;
  aspect-ratio: var(--media-ratio);
  overflow: hidden;
  background: #ded8cf;
}

.intro-video {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: var(--intro-object-position, 50% 50%);
}

.intro-skip {
  position: absolute;
  z-index: 2;
  top: 24px;
  right: 20px;
  min-height: 30px;
  padding: 4px 12px;
  border: 0;
  border-radius: 8px;
  color: #fff;
  background: rgba(0, 0, 0, 0.4);
  font: 500 14px/1.5 var(--ui);
  cursor: pointer;
}

.intro.is-exiting {
  pointer-events: none;
  opacity: 0;
}

.intro.is-exiting .intro-card {
  transform: scale(1.012);
  transition: transform var(--transition-duration) ease;
}
```

- [ ] **Step 5: 설정 가능한 영상 초점과 안전한 종료 포커스를 구현한다**

`renderIntro()`에서 요소를 조회한 뒤 공용 CSS 변수에 초점 위치를 연결한다.

```js
intro.style.setProperty('--intro-object-position', WEDDING_CONFIG.intro.objectPosition || '50% 50%');
intro.querySelector('[data-intro-media-label]').textContent = WEDDING_CONFIG.intro.mediaLabel || '';
```

`finishIntro()` 앞에 다음 함수를 추가하고, 기존 `app.focus()` 두 곳을 `exitTarget.focus()`로 교체한다. 각 섹션은 `sectionShell()`에서 `section.tabIndex = -1`로 만든다.

```js
function introExitTarget(app) {
  if (!app) return null;
  return app.querySelector('[data-section]') || app;
}

function finishIntro(reason = 'complete') {
  const app = document.getElementById('invitation-app');
  const exitTarget = introExitTarget(app);
  document.removeEventListener('keydown', handleIntroKeydown);
  restoreInvitationAccess(app);
  if (introFinished) return;
  introFinished = true;
  window.clearTimeout(introFallbackTimer);
  window.clearTimeout(introRemovalTimer);
  document.body.classList.remove('is-intro-open');
  const intro = document.getElementById('intro');
  const video = document.getElementById('intro-video');
  if (video) {
    try { video.pause(); } catch (error) { /* exit remains available */ }
  }
  if (!intro) {
    if (exitTarget) exitTarget.focus({ preventScroll: true });
    return;
  }
  intro.dataset.exitReason = reason;
  intro.setAttribute('aria-hidden', 'true');
  intro.classList.add('is-exiting');
  if (exitTarget) exitTarget.focus({ preventScroll: true });
  const removeIntro = () => {
    window.clearTimeout(introRemovalTimer);
    intro.removeEventListener('transitionend', onTransitionEnd);
    intro.remove();
  };
  const onTransitionEnd = event => {
    if (event.target === intro && event.propertyName === 'opacity') removeIntro();
  };
  intro.addEventListener('transitionend', onTransitionEnd);
  const reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const configuredDuration = Number(WEDDING_CONFIG.theme.transitionMs);
  const duration = Number.isFinite(configuredDuration) ? Math.max(0, configuredDuration) : 650;
  if (reducedMotion || duration === 0) removeIntro();
  else introRemovalTimer = window.setTimeout(removeIntro, duration + 80);
}
```

- [ ] **Step 6: 인트로 계약과 기존 테스트가 모두 통과하는지 확인한다**

Run: `/Users/gyumin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node --test tests/invitation.test.mjs`

Expected: 공용 캔버스, 스킵, `hero=false`, Escape·포커스·리스너 정리를 포함한 모든 테스트가 PASS한다.

- [ ] **Step 7: Task 2를 커밋한다**

```bash
git add index.html tests/invitation.test.mjs
git commit -m "feat: blend video intro into invitation canvas"
```

---

### Task 3: 히어로부터 스토리까지 에디토리얼 흐름

**Files:**
- Modify: `tests/invitation.test.mjs:394-430`
- Modify: `index.html:260-620`
- Modify: `index.html:1147-1330`

**Interfaces:**
- Consumes: `messages.hero`, `messages.invitation`, `couple`, `wedding`, `story`, `media.hero`, `media.gallery`
- Produces: `.hero-display`, `.hero-orbit`, `.hero-tagline`, `.section-index`, `.story-media`
- Preserves: 달력 표 구조, 1초 카운트다운, 연락 다이얼로그 트리거

- [ ] **Step 1: 핵심 에디토리얼 구조의 실패 테스트를 작성한다**

```js
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

test('optional story images stay inside the replaceable image folder', () => {
  const { WEDDING_CONFIG: config } = loadContracts();
  assert.ok(config.story.every(item => !item.image || item.image.startsWith('./assets/images/')));
});
```

- [ ] **Step 2: 새 구조 클래스와 스토리 이미지가 없어 테스트가 실패하는지 확인한다**

Run: `/Users/gyumin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node --test tests/invitation.test.mjs`

Expected: 에디토리얼 클래스와 `story.image` 계약이 구현되지 않아 첫 테스트가 FAIL한다.

- [ ] **Step 3: 히어로 문구와 스토리 이미지 설정을 호환 가능한 선택 필드로 추가한다**

기존 `messages` 객체에서 히어로 관련 값만 다음처럼 변경·추가한다. 새 장식 문구도 HTML이나 렌더러에 하드코딩하지 않는다.

```js
hero: 'BEGINS\nON OCT',
heroOrbit: 'JOIN US · JOIN US ·',
heroTagline: 'A new chapter begins with the people we love.',
```

기존 `story` 배열의 각 항목에는 다음 경로와 대체 텍스트를 추가한다. 키 이름과 배열 구조는 유지한다.

```js
story: [
  { year: '2020', label: '첫 만남', title: '우연처럼 시작된 우리', body: '평범했던 하루가 서로를 만나 특별해졌습니다.', image: './assets/images/story-01.jpg', alt: '처음 만난 시절의 두 사람' },
  { year: '2022', label: '여행', title: '같은 풍경을 바라보며', body: '수많은 계절과 여행 속에서 서로의 가장 편안한 사람이 되었습니다.', image: './assets/images/story-02.jpg', alt: '함께 여행하는 두 사람' },
  { year: '2026', label: '약속', title: '평생을 함께하기로', body: '앞으로의 모든 날을 함께 걷기로 약속했습니다.', image: './assets/images/story-03.jpg', alt: '결혼을 약속한 두 사람' },
],
```

사용자가 기존 설정을 유지할 경우에도 `item.image || WEDDING_CONFIG.media.gallery[index]?.src || ''`로 안전하게 폴백한다.

- [ ] **Step 4: 섹션 헤더 인덱스와 히어로 구조를 구현한다**

`sectionShell()`에서 활성 렌더 순번을 작은 장식으로 추가하고, 섹션에 포커스를 받을 수 있게 한다.

```js
function sectionShell(key, eyebrow, title, headingTag = 'h2') {
  const section = element('section', `invitation-section ${key}-section reveal`);
  section.dataset.section = key;
  section.tabIndex = -1;
  const header = element('header', 'section-header');
  const enabledKeys = Object.keys(SECTION_RENDERERS).filter(name => WEDDING_CONFIG.sections[name] === true);
  const ordinal = enabledKeys.indexOf(key) + 1;
  if (ordinal > 0) header.append(element('span', 'section-index', String(ordinal).padStart(2, '0')));
  if (eyebrow) header.append(element('p', 'section-eyebrow', eyebrow));
  if (title) header.append(element(headingTag, 'section-title', title));
  const body = element('div', 'section-body');
  section.append(header, body);
  return section;
}
```

`renderHero()`는 기존 설정만 소비하면서 다음 구조를 생성한다.

```js
function renderHero() {
  const section = sectionShell('hero', 'Wedding Invitation', '', 'h1');
  const body = sectionBody(section);
  const display = element('h1', 'hero-display');
  WeddingUtils.toLines(WEDDING_CONFIG.messages.hero).forEach(line => display.append(element('span', '', line)));
  const media = mediaFrame(WEDDING_CONFIG.media.hero, `${WEDDING_CONFIG.couple.groom.name}과 ${WEDDING_CONFIG.couple.bride.name}의 대표 사진`, 'Main Portrait');
  media.classList.add('hero-media');
  const orbit = element('span', 'hero-orbit', WEDDING_CONFIG.messages.heroOrbit || '');
  orbit.setAttribute('aria-hidden', 'true');
  const tagline = element('p', 'hero-tagline', WEDDING_CONFIG.messages.heroTagline || '');
  const footer = element('div', 'hero-footer');
  footer.append(
    element('p', 'hero-names', `${WEDDING_CONFIG.couple.groom.name} · ${WEDDING_CONFIG.couple.bride.name}`),
    element('p', 'hero-date', WEDDING_CONFIG.wedding.displayDate),
  );
  body.append(display, media, orbit, tagline, footer);
  return section;
}
```

- [ ] **Step 5: 스토리에 교차 사진 구조를 추가한다**

```js
function renderStory() {
  const section = sectionShell('story', 'Our Story', '우리의 시간');
  const list = element('div', 'story-list');
  WEDDING_CONFIG.story.forEach((item, index) => {
    const article = element('article', 'story-item');
    const imageSource = item.image || WEDDING_CONFIG.media.gallery[index]?.src || '';
    const media = mediaFrame(imageSource, item.alt || item.title, `Story ${String(index + 1).padStart(2, '0')}`);
    media.classList.add('story-media');
    const copy = element('div', 'story-copy');
    copy.append(
      element('p', 'story-year', item.year),
      element('p', 'story-label', item.label),
      element('h3', 'story-title', item.title),
      element('p', 'story-body', item.body),
    );
    article.append(media, copy);
    list.append(article);
  });
  sectionBody(section).append(list);
  return section;
}
```

- [ ] **Step 6: 히어로·초대·커플·일정·스토리 CSS를 전면 교체한다**

다음 레이아웃 토큰을 기반으로 관련 기존 CSS 블록을 교체한다.

```css
.invitation-section {
  position: relative;
  padding: clamp(96px, 28vw, 132px) clamp(24px, 7vw, 34px);
}

.section-header {
  position: relative;
  margin-bottom: 48px;
  text-align: center;
}

.section-index {
  display: inline-grid;
  width: 28px;
  height: 28px;
  margin-bottom: 20px;
  border: 1px solid var(--line);
  border-radius: 50%;
  place-items: center;
  color: var(--muted);
  font: 500 9px/1 var(--ui);
  letter-spacing: 0.08em;
}

.section-eyebrow {
  margin: 0 0 14px;
  font: 500 10px/1.4 var(--ui);
  letter-spacing: 0.24em;
  text-transform: uppercase;
}

.hero-section {
  min-height: 100svh;
  padding: 54px 22px 46px;
}

.hero-display {
  position: relative;
  z-index: 2;
  display: grid;
  margin: 30px 0 -34px;
  font-family: var(--display);
  font-size: clamp(4.5rem, 22vw, 6.4rem);
  font-weight: 400;
  letter-spacing: -0.07em;
  line-height: 0.72;
}

.hero-display span:last-child {
  margin-left: 0.46em;
}

.hero-media {
  width: 75%;
  margin-left: auto;
  aspect-ratio: var(--media-ratio);
}

.hero-orbit {
  display: grid;
  width: 78px;
  height: 78px;
  margin: -44px 0 0 10px;
  border: 1px solid var(--ink);
  border-radius: 50%;
  place-items: center;
  font: 500 8px/1.2 var(--ui);
  letter-spacing: 0.12em;
  text-align: center;
}

.story-list {
  display: grid;
  gap: 86px;
}

.story-item {
  display: grid;
  grid-template-columns: minmax(0, 1.15fr) minmax(0, 0.85fr);
  align-items: end;
  gap: 22px;
}

.story-item:nth-child(even) .story-media {
  grid-column: 2;
  grid-row: 1;
}

.story-item:nth-child(even) .story-copy {
  grid-column: 1;
  grid-row: 1;
  text-align: right;
}

.story-media {
  aspect-ratio: var(--media-ratio);
}
```

- [ ] **Step 7: 핵심 섹션 테스트와 전체 회귀 테스트를 실행한다**

Run: `/Users/gyumin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node --test tests/invitation.test.mjs`

Expected: 히어로·스토리 구조, 달력·카운트다운, 연락처, 설정 호환 테스트가 모두 PASS한다.

- [ ] **Step 8: Task 3을 커밋한다**

```bash
git add index.html tests/invitation.test.mjs
git commit -m "feat: redesign the editorial invitation flow"
```

---

### Task 4: 위치부터 아웃트로까지 하단 섹션 재배치

**Files:**
- Modify: `tests/invitation.test.mjs:394-450`
- Modify: `index.html:620-990`
- Modify: `index.html:1090-1110`
- Modify: `index.html:1328-1465`

**Interfaces:**
- Consumes: 기존 `location`, `transportation`, `media.gallery`, `notices`, `accounts`, `navigation`, `sharing`, `messages.outro`
- Produces: 렌더 순서 `hero → invitation → couple → schedule → story → location → transportation → gallery → notices → accounts → share → outro`
- Preserves: 지도 앱 외부 링크, 주소·계좌 복사, 갤러리 다이얼로그, Web Share API 폴백

- [ ] **Step 1: 섹션 순서와 하단 시각 계약의 실패 테스트를 작성한다**

```js
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
  assert.match(app, /data\.copyAccount/);
});
```

- [ ] **Step 2: 현재 갤러리 우선 순서 때문에 테스트가 실패하는지 확인한다**

Run: `/Users/gyumin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node --test tests/invitation.test.mjs`

Expected: 현재 `gallery`가 `location`보다 앞에 있어 순서 테스트가 FAIL한다.

- [ ] **Step 3: 렌더러 순서를 승인된 서사 순서로 변경한다**

```js
const SECTION_RENDERERS = {
  hero: renderHero,
  invitation: renderInvitation,
  couple: renderCouple,
  schedule: renderSchedule,
  story: renderStory,
  location: renderLocation,
  transportation: renderTransportation,
  gallery: renderGallery,
  notices: renderNotices,
  accounts: renderAccounts,
  share: renderShare,
  outro: renderOutro,
};
```

- [ ] **Step 4: 하단 섹션을 종이형 편집 레이아웃으로 교체한다**

기존 기능 클래스는 유지하면서 다음 핵심 레이아웃을 적용한다.

```css
.location-section .section-body {
  margin-inline: calc(clamp(24px, 7vw, 34px) * -1);
}

.location-address,
.location-section .address-copy-button,
.location-section .venue-phone {
  margin-inline: auto;
}

.map-media {
  margin-top: 34px;
  aspect-ratio: 4 / 3;
}

.transport-item {
  display: grid;
  padding: 22px 0;
  border-top: 1px solid var(--line);
  grid-template-columns: 88px 1fr;
  gap: 18px;
}

.gallery-grid {
  display: grid;
  grid-template-columns: repeat(12, minmax(0, 1fr));
  gap: 7px;
}

.gallery-button {
  grid-column: span 7;
}

.gallery-button:nth-child(4n + 2),
.gallery-button:nth-child(4n + 3) {
  grid-column: span 5;
}

.notice-card {
  padding: 28px 0;
  border: 0;
  border-top: 1px solid var(--line);
  background: transparent;
}

.account-group {
  border-top: 1px solid var(--line);
}

.share-section,
.outro-section {
  text-align: center;
}

.outro-section {
  min-height: 90svh;
}

.outro-lines {
  font-family: var(--display);
  font-size: clamp(2.6rem, 12vw, 4rem);
  line-height: 0.98;
}
```

버튼은 기존 이벤트 위임용 `data-copy-address`, `data-copy-account`, `data-share`, `data-gallery-index`를 유지하며 마크업에서 제거하지 않는다.

- [ ] **Step 5: 전체 테스트가 통과하는지 확인한다**

Run: `/Users/gyumin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node --test tests/invitation.test.mjs`

Expected: 새 순서·스타일 계약과 기존 지도·복사·공유·갤러리 동작 테스트가 모두 PASS한다.

- [ ] **Step 6: Task 4를 커밋한다**

```bash
git add index.html tests/invitation.test.mjs
git commit -m "feat: reorder and restyle supporting sections"
```

---

### Task 5: 반응형·접근성·정적 호스팅 회귀 검증

**Files:**
- Modify: `tests/invitation.test.mjs:450-520`
- Modify: `index.html:900-990`

**Interfaces:**
- Consumes: 완성된 단일 `index.html`
- Produces: 360px 무수평 스크롤, 425px 데스크톱 카드, reduced-motion, 승인 CDN 폴백, GitHub Pages 상대 경로 검증 결과

- [ ] **Step 1: 최종 호스팅·반응형 계약 테스트를 추가한다**

```js
test('responsive and reduced-motion safeguards remain in the single-file page', () => {
  const html = source();
  assert.match(html, /body\s*\{[\s\S]*min-width:\s*320px;[\s\S]*overflow-x:\s*hidden;/);
  assert.match(html, /\.invitation-page\s*\{[\s\S]*width:\s*100%;[\s\S]*max-width:\s*var\(--page-width\)/);
  assert.match(html, /@media\s*\(prefers-reduced-motion:\s*reduce\)/);
  assert.match(html, /transition-duration:\s*0\.01ms\s*!important/);
  assert.doesNotMatch(html, /(?:src|href)=["']\/(?!\/)/);
});

test('font CDN failure cannot remove local content or require external JavaScript', () => {
  const html = source();
  assert.doesNotMatch(html, /<script[^>]+src=/i);
  assert.match(html, /--display:[^;]*Georgia/);
  assert.match(html, /--korean:[^;]*Apple SD Gothic Neo/);
  assert.match(html, /--ui:[^;]*-apple-system/);
  const assetPaths = html.match(/\.\/assets\/[A-Za-z0-9_./-]+/g) || [];
  assert.ok(assetPaths.every(path => !path.includes('..')));
});
```

- [ ] **Step 2: 테스트를 실행하고 필요한 누락 보호 규칙이 있으면 정확한 실패를 확인한다**

Run: `/Users/gyumin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node --test tests/invitation.test.mjs`

Expected: 구현된 CSS 보호 규칙과 상대 경로가 모두 존재하므로 새 테스트까지 PASS한다.

- [ ] **Step 3: 전체 정적 검증을 실행한다**

```bash
/Users/gyumin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node --test tests/invitation.test.mjs
git diff --check
rg -n "TO[D]O|TB[D]|FIXM[E]|PLACEHOLDE[R]" index.html tests/invitation.test.mjs
```

Expected: 모든 테스트 PASS, `git diff --check` 출력 없음, 미완성 마커 출력 없음. `media-placeholder` 클래스는 사용자 미디어 누락 시 의도된 대체면이므로 대소문자 스캔 대상과 구분한다.

- [ ] **Step 4: 로컬 정적 서버에서 모바일과 데스크톱 시각 QA를 실행한다**

Run:

```bash
python3 -m http.server 4173 --bind 127.0.0.1
```

인앱 브라우저에서 `http://127.0.0.1:4173/index.html`을 열고 아래를 확인한다.

- 390×844: 카드가 화면을 채우고 수평 스크롤이 없다.
- 1280×900: 외부 `#eeeeee` 캔버스 가운데 425px 카드가 놓인다.
- 영상 파일 누락 상태: 종이색 인트로 대체면, SKIP, 자동 본문 진입이 작동한다.
- `hero=false`: 인트로 종료 후 첫 활성 섹션에 포커스가 간다.
- reduced motion: 인트로가 긴 크로스페이드 없이 제거된다.
- 글꼴 요청 차단: 시스템 글꼴로 바뀌어도 레이아웃과 기능이 유지된다.
- 키보드: SKIP 초기 포커스, Escape 종료, 연락처·갤러리 다이얼로그 닫기와 포커스 복귀가 작동한다.

검증이 끝나면 서버를 종료하고 브라우저 뷰포트와 탭을 정리한다.

- [ ] **Step 5: 최종 변경을 커밋한다**

```bash
git add index.html tests/invitation.test.mjs
git commit -m "test: verify static invitation redesign"
```

- [ ] **Step 6: 최종 리뷰를 요청한다**

리뷰 입력은 설계 문서, 이 구현 계획, `git diff`와 전체 테스트 출력을 포함한다. 리뷰 기준은 다음 네 가지다.

1. 기존 요구사항과 설정 키 호환성
2. 참고 사이트에 가까운 시각 구조와 인트로 연결
3. 접근성·토글·누락 미디어의 안전성
4. 단일 파일·`file://`·GitHub Pages 상대 경로 계약

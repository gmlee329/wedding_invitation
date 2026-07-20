# Intro Paper Signature Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the dark intro with the invitation's paper background, render the selected `Gyumin / & / Sara` Allura signature, and reveal the video at full original brightness only when playback begins.

**Architecture:** Keep the existing build-free single-file runtime. Split intro copy into explicit configuration fields, render them as one accessible heading, share the existing paper texture between the invitation and intro, and use the existing `is-video-playing` event state to switch the preloaded video from fully hidden to fully visible without a dimming overlay.

**Tech Stack:** One static `index.html`, vanilla HTML/CSS/JavaScript, Google Fonts Allura stylesheet, Node.js built-in test runner and VM harness.

## Global Constraints

- The deployable application remains one `index.html` with no build step.
- The only allowed external stylesheet is `https://fonts.googleapis.com/css2?family=Allura&display=swap`; no external JavaScript is allowed.
- Direct `file://` opening and GitHub Pages must keep working; CDN failure falls back to `cursive` without blocking the intro.
- `WEDDING_CONFIG.intro` must expose `groomName: 'Gyumin'`, `connector: '&'`, `brideName: 'Sara'`, and `message: '결혼 여정을 시작합니다.'` separately.
- Keep `messageHoldMs: 1000`, `messageFadeMs: 600`, relative video/poster paths, muted playback, and media fallback behavior.
- The pre-video screen must use the same `--paper` color and three texture layers as `.invitation-page`.
- Hide the video completely until `playing`; then show it immediately at `opacity: 1` with no whole-video shade, tint, or dimming opacity.
- Preserve `object-fit: cover`, `SKIP`, `Escape`, sound control, progress, reduced motion, timer cleanup, section toggles, and focus restoration.
- Keep control targets at least 44px and preserve accessible names, pressed state, and visible focus.
- Do not modify or commit the user's video, personal details, `.DS_Store`, `.idea/`, or Visual Companion scratch files.

## File Structure

- Modify `index.html`: approved font link, intro configuration, shared paper background, signature/video/control styles, intro template, and copy binding.
- Modify `tests/invitation.test.mjs`: mirror the signature heading in the VM harness and verify configuration, CDN allow-list, paper background, shade removal, and playback visibility state.

---

### Task 1: Render the paper signature intro and undimmed video

**Files:**
- Modify: `index.html:5-28, 119-275, 1027-1043, 1840-1925`
- Modify: `tests/invitation.test.mjs:42-285, 395-555`
- Test: `tests/invitation.test.mjs`

**Interfaces:**
- Consumes: `WEDDING_CONFIG.intro.groomName`, `connector`, `brideName`, `message`, `messageHoldMs`, `messageFadeMs`, `video`, `poster`, and `muted`.
- Produces: `[data-intro-groom]`, `[data-intro-connector]`, `[data-intro-bride]`, `[data-intro-message]`, plus existing intro states `is-message-fading`, `is-message-hidden`, and `is-video-playing`.
- Preserves: `renderIntro()`, `finishIntro(reason)`, `handleIntroMediaError()`, all section toggles, and existing timer lifecycles.

- [ ] **Step 1: Change the VM fixture to express the wished-for accessible signature**

Replace the two old copy nodes with a real heading and four configured text nodes:

```js
  const introHeading = new FakeNode('h1');
  const introGroom = new FakeNode('span');
  introGroom.dataset.introGroom = '';
  const introConnector = new FakeNode('span');
  introConnector.dataset.introConnector = '';
  const introBride = new FakeNode('span');
  introBride.dataset.introBride = '';
  const introMessage = new FakeNode('span');
  introMessage.dataset.introMessage = '';
  introHeading.append(introGroom, introConnector, introBride, introMessage);
  const status = new FakeNode('p');
  status.dataset.introStatus = '';
  intro.append(introHeading, status);
  ids.set('intro-title', introHeading);
```

Return the new nodes from `createHarness()`:

```js
    intro,
    video,
    introHeading,
    introGroom,
    introConnector,
    introBride,
    introMessage,
    skip,
```

- [ ] **Step 2: Update the opening-copy behavior test and verify RED**

Replace the old single-name assertions while retaining the hold/fade/play assertions:

```js
test('intro renders configurable signature before delayed playback', () => {
  const { WEDDING_CONFIG: config } = loadContracts();
  assert.equal(config.intro.groomName, 'Gyumin');
  assert.equal(config.intro.connector, '&');
  assert.equal(config.intro.brideName, 'Sara');
  assert.equal(config.intro.message, '결혼 여정을 시작합니다.');
  assert.equal(config.intro.messageHoldMs, 1000);
  assert.equal(config.intro.messageFadeMs, 600);

  const harness = createHarness({ reducedMotion: false });
  harness.app.renderIntro();

  assert.equal(harness.introGroom.textContent, config.intro.groomName);
  assert.equal(harness.introConnector.textContent, config.intro.connector);
  assert.equal(harness.introBride.textContent, config.intro.brideName);
  assert.equal(harness.introMessage.textContent, config.intro.message);
  assert.equal(harness.video.autoplay, false);
  assert.equal(harness.video.playCalls, 0);
  assert.equal(harness.intro.classList.contains('is-video-playing'), false);

  const hold = harness.timeouts.find(timeout => timeout.delay === 1000);
  assert.ok(hold);
  hold.callback();
  assert.ok(harness.intro.classList.contains('is-message-fading'));
  assert.equal(harness.video.playCalls, 0);

  const fade = harness.timeouts.find(timeout => timeout.delay === 600);
  assert.ok(fade);
  fade.callback();
  assert.equal(harness.video.playCalls, 1);
  assert.equal(harness.introHeading.getAttribute('aria-hidden'), 'true');
  assert.equal(harness.intro.classList.contains('is-video-playing'), false);

  const [handlePlaying] = harness.video.listeners.get('playing') || [];
  assert.ok(handlePlaying);
  handlePlaying();
  assert.equal(harness.intro.classList.contains('is-video-playing'), true);
});
```

Run:

```bash
/Users/gyumin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node --test --test-name-pattern="intro renders configurable signature" tests/invitation.test.mjs
```

Expected: FAIL because `groomName`, `connector`, and `brideName` are absent and `renderIntro()` still queries `[data-intro-names]`.

- [ ] **Step 3: Implement the configured signature fields and accessible markup**

Replace the single `names` field at the top of `WEDDING_CONFIG.intro`:

```js
      intro: {
        video: './assets/video/intro.mp4',
        poster: './assets/images/intro-poster.jpg',
        groomName: 'Gyumin',
        connector: '&',
        brideName: 'Sara',
        message: '결혼 여정을 시작합니다.',
        messageHoldMs: 1000,
        messageFadeMs: 600,
        muted: true,
        fallbackDelayMs: 2800,
      },
```

Replace the heading inside `#intro-template` and remove `.intro-shade` from the template:

```html
      <video id="intro-video" class="intro-video" muted playsinline preload="auto"></video>
      <div class="intro-content">
        <h1 id="intro-title" class="intro-heading">
          <span class="intro-name" data-intro-groom></span>
          <span class="intro-connector" data-intro-connector></span>
          <span class="intro-name" data-intro-bride></span>
          <span class="intro-message" data-intro-message></span>
        </h1>
        <div class="intro-actions">
          <div class="intro-progress" aria-hidden="true"></div>
          <button id="intro-sound" class="intro-control intro-sound" type="button"></button>
          <button id="intro-skip" class="intro-control" type="button" aria-label="인트로 건너뛰기">SKIP</button>
          <p class="intro-status" data-intro-status aria-live="polite"></p>
        </div>
      </div>
```

In `renderIntro()`, query and bind all four nodes:

```js
        const introHeading = document.getElementById('intro-title');
        const introGroom = intro.querySelector('[data-intro-groom]');
        const introConnector = intro.querySelector('[data-intro-connector]');
        const introBride = intro.querySelector('[data-intro-bride]');
        const introMessage = intro.querySelector('[data-intro-message]');
        if (!introHeading || !introGroom || !introConnector || !introBride || !introMessage) {
          finishIntro('missing-intro-copy');
          return;
        }
        introGroom.textContent = WEDDING_CONFIG.intro.groomName;
        introConnector.textContent = WEDDING_CONFIG.intro.connector;
        introBride.textContent = WEDDING_CONFIG.intro.brideName;
        introMessage.textContent = WEDDING_CONFIG.intro.message;
```

When `playVideo()` hides the finished copy, hide the complete accessible heading:

```js
          intro.classList.add('is-message-hidden');
          introHeading.setAttribute('aria-hidden', 'true');
          video.currentTime = 0;
```

- [ ] **Step 4: Run the signature behavior test and verify GREEN**

Run:

```bash
/Users/gyumin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node --test --test-name-pattern="intro renders configurable signature" tests/invitation.test.mjs
```

Expected: PASS with one test selected and no warnings.

- [ ] **Step 5: Write failing static contracts for the approved font and undimmed layer stack**

Update the first runtime contract so one approved font stylesheet is allowed while external scripts remain forbidden:

```js
test('runtime is one index with only the approved font stylesheet', () => {
  const html = source();
  assert.match(html, /<script[^>]*id="wedding-config"/);
  assert.match(html, /<script[^>]*id="wedding-utils"/);
  assert.match(html, /<script[^>]*id="wedding-app"/);
  assert.doesNotMatch(html, /<script[^>]+src=/i);
  const stylesheets = html.match(/<link[^>]+rel=["']stylesheet["'][^>]*>/gi) || [];
  assert.equal(stylesheets.length, 1);
  assert.match(stylesheets[0], /https:\/\/fonts\.googleapis\.com\/css2\?family=Allura(?:&|&amp;)display=swap/);
});
```

Add the focused visual contract:

```js
test('intro shares the paper texture and reveals an undimmed video without a shade', () => {
  const html = source();
  assert.doesNotMatch(html, /class=["']intro-shade["']/);
  assert.doesNotMatch(html, /\.intro-shade\s*\{/);
  assert.doesNotMatch(html, /#171814|opacity:\s*0\.78|opacity:\s*0\.16/);
  assert.match(html, /\.invitation-page,\s*\.intro\s*\{[^}]*background-color:\s*var\(--paper\)/);
  assert.match(html, /\.intro-video\s*\{[^}]*opacity:\s*0;[^}]*visibility:\s*hidden;/);
  assert.match(html, /\.intro\.is-video-playing \.intro-video\s*\{[^}]*opacity:\s*1;[^}]*visibility:\s*visible;/);
  assert.match(html, /font-family:\s*'Allura',\s*cursive/);
  assert.match(html, /\.intro-control\s*\{[^}]*background:\s*color-mix\(in srgb, var\(--paper\) 88%, transparent\)/);
});
```

Run:

```bash
/Users/gyumin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node --test --test-name-pattern="runtime is one index|intro shares the paper" tests/invitation.test.mjs
```

Expected: FAIL because no Allura stylesheet exists, the dark background/shade remain, and the video still uses `opacity: 0.78`.

- [ ] **Step 6: Add Allura and share the paper texture between the page and intro**

Add the approved stylesheet after `<title>`:

```html
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Allura&amp;display=swap">
```

Move the existing paper declarations into a shared rule, leaving layout-only declarations in `.invitation-page`:

```css
    .invitation-page,
    .intro {
      background-color: var(--paper);
      background-image:
        radial-gradient(circle at 12% 18%, rgb(255 255 255 / 44%) 0 0.8px, transparent 1px),
        radial-gradient(circle at 82% 64%, rgb(32 33 29 / 6%) 0 0.7px, transparent 1px),
        linear-gradient(115deg, rgb(255 255 255 / 12%), transparent 44%, rgb(154 118 90 / 4%));
      background-size: 13px 17px, 19px 23px, 100% 100%;
      isolation: isolate;
    }

    .invitation-page {
      position: relative;
      width: 100%;
      max-width: var(--page-width);
      margin: 0 auto;
      overflow: hidden;
    }
```

Set `.intro` to the paper ink without any dark background:

```css
    .intro {
      position: fixed;
      z-index: 50;
      inset: 0;
      display: grid;
      overflow: hidden;
      place-items: center;
      color: var(--ink);
      opacity: 1;
      transition: opacity 520ms ease;
    }
```

- [ ] **Step 7: Hide the preloaded video until playback and style the signature**

Replace the video, shade, and old name styles with the approved layer behavior:

```css
    .intro-video {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
      opacity: 0;
      visibility: hidden;
    }

    .intro.is-video-playing .intro-video {
      opacity: 1;
      visibility: visible;
    }

    .intro-content {
      position: relative;
      z-index: 1;
      display: grid;
      width: min(calc(100% - 48px), 420px);
      min-height: 100svh;
      padding: 64px 0 38px;
      grid-template-rows: 1fr auto;
      text-align: center;
    }

    .intro-heading {
      display: grid;
      margin: 0;
      place-content: center;
      opacity: 1;
      transform: translateY(0);
      transition:
        opacity var(--intro-message-fade-duration, 600ms) ease,
        transform var(--intro-message-fade-duration, 600ms) ease;
    }

    .intro-name {
      font-family: 'Allura', cursive;
      font-size: clamp(3.6rem, 18vw, 5.4rem);
      font-weight: 400;
      line-height: 0.82;
    }

    .intro-connector {
      margin: 10px 0 8px;
      font-family: var(--serif);
      font-size: 1.45rem;
      font-weight: 400;
      line-height: 1;
    }

    .intro-message {
      margin-top: 30px;
      font-size: 0.78rem;
      font-weight: 500;
      letter-spacing: 0.1em;
      line-height: 1.6;
    }
```

Do not retain `.intro.has-media-error .intro-video` or `.intro-shade` rules.

- [ ] **Step 8: Make controls legible without dimming the video**

Use ink-based progress colors and paper-backed buttons:

```css
    .intro-progress {
      position: relative;
      height: 1px;
      grid-column: 1 / -1;
      overflow: hidden;
      background: color-mix(in srgb, var(--ink) 22%, transparent);
    }

    .intro-progress::after {
      position: absolute;
      inset: 0;
      background: var(--ink);
      content: '';
      transform-origin: left;
      animation: intro-progress 8s linear infinite paused;
    }

    .intro-control {
      min-width: 88px;
      padding: 8px 12px;
      border: 1px solid color-mix(in srgb, var(--ink) 24%, transparent);
      color: var(--ink);
      background: color-mix(in srgb, var(--paper) 88%, transparent);
      cursor: pointer;
      font-size: 0.65rem;
      font-weight: 700;
      letter-spacing: 0.14em;
    }
```

- [ ] **Step 9: Verify GREEN and all preserved behavior**

Run:

```bash
/Users/gyumin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node --test --test-name-pattern="runtime is one index|intro shares the paper" tests/invitation.test.mjs
/Users/gyumin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node --test tests/invitation.test.mjs
git diff --check
```

Expected: focused tests PASS; full suite 20/20 PASS; no whitespace errors or warnings.

- [ ] **Step 10: Inspect the final static diff and attempt direct-file mobile QA**

Run:

```bash
git diff --stat
git diff -- index.html tests/invitation.test.mjs
```

Open this direct local URL at a mobile viewport if browser policy permits:

```text
file:///Users/gyumin/Documents/New%20project/index.html
```

Verify the exact sequence: paper texture with `Gyumin / & / Sara`, 1000ms hold, 600ms fade, full-brightness video appearing only when it plays, paper-backed controls, and successful `SKIP`. If the automated browser blocks `file://`, record the limitation and leave this final visual check to the user without substituting localhost for the direct-file requirement.

- [ ] **Step 11: Commit the completed feature**

```bash
git add index.html tests/invitation.test.mjs
git commit -m "feat: restyle intro with paper and signature type"
```

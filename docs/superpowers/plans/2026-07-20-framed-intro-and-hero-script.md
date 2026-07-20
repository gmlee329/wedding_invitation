# Framed Intro Video and Hero Script Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep the paper treatment visible around a bounded intro video, unify the main viewport color with that paper, and replace the hero phrase with an Allura-script “Happily Ever After”.

**Architecture:** Preserve the existing single-file renderer and state machine. Add one presentational `.intro-stage` wrapper around the existing video and heading, constrain that wrapper to 4:5, and contain the source video inside it without changing playback behavior.

**Tech Stack:** Static HTML, inline CSS, vanilla JavaScript, Google Fonts Allura stylesheet, Node.js built-in test runner.

## Global Constraints

- Runtime remains one `index.html` file with no build step and no external JavaScript.
- All local image and video paths remain relative for direct `file://` and GitHub Pages use.
- Google Fonts Allura remains the only external stylesheet and must keep a `cursive` fallback.
- Preserve intro hold `1000ms`, fade `600ms`, muted playback, sound, skip, Escape, reduced-motion, focus, ended, and media-error fallback behavior.
- Do not modify or commit `assets/video/intro.mp4`, `.DS_Store`, `.idea`, or scratch artifacts.

---

### Task 1: Paper-backed framed video and script hero

**Files:**
- Modify: `tests/invitation.test.mjs`
- Modify: `index.html`

**Interfaces:**
- Consumes: `WEDDING_CONFIG.theme.paper`, `WEDDING_CONFIG.messages.hero`, the existing `#intro-template`, and the existing `is-video-playing` intro state.
- Produces: `.intro-stage` as a 4:5 paper-backed layout boundary; `Happily Ever After` as configured hero copy; Allura styling on `.hero-section .section-title`.

- [ ] **Step 1: Write the failing static regression tests**

Extend the existing intro paper test and add a focused hero test with assertions equivalent to:

```js
assert.match(html, /html\s*\{[^}]*background:\s*var\(--paper\)/);
assert.match(html, /body\s*\{[^}]*background:\s*var\(--paper\)/);
assert.match(html, /<div class="intro-stage">\s*<video[\s\S]*?<h1/);
assert.match(html, /\.intro-stage\s*\{[^}]*aspect-ratio:\s*4\s*\/\s*5/);
assert.match(html, /\.intro-video\s*\{[^}]*object-fit:\s*contain/);
assert.doesNotMatch(html, /\.intro-video\s*\{[^}]*inset:\s*0;[^}]*width:\s*100%;[^}]*height:\s*100%;[^}]*object-fit:\s*cover/);

const { WEDDING_CONFIG: config } = loadContracts();
assert.equal(config.messages.hero, 'Happily Ever After');
assert.match(html, /\.hero-section \.section-title\s*\{[^}]*font-family:\s*'Allura',\s*cursive/);
```

- [ ] **Step 2: Run the full test file and verify RED**

Run:

```bash
/Users/gyumin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node --test tests/invitation.test.mjs
```

Expected: the new layout and hero assertions fail because the viewport-sized `object-fit: cover` video, gray `html`/`body` background, old hero copy, and serif hero title are still present.

- [ ] **Step 3: Implement the minimal HTML/CSS/config changes**

In `index.html`:

```js
messages: { hero: 'Happily Ever After', invitationTitle: '소중한 분들을 초대합니다', invitation: ['서로의 하루를 아끼며', '같은 곳을 바라보게 된 두 사람이', '이제 한 가족이 되려 합니다.', '', '저희의 새로운 시작을', '따뜻한 마음으로 축복해 주세요.'], outro: ['장담하건대, 세상이 다 겨울이어도', '우리 사랑은 늘 봄처럼 따뜻할 것입니다.'], signature: 'With love, GYUMIN & SARA' },
```

Use the paper color on the viewport:

```css
html {
  background: var(--paper);
}

body {
  background: var(--paper);
}
```

Scope the video and heading to a new stage:

```html
<div class="intro-content">
  <div class="intro-stage">
    <video id="intro-video" class="intro-video" muted playsinline preload="auto"></video>
    <h1 id="intro-title" class="intro-heading">
      <span class="intro-name" data-intro-groom></span>
      <span class="intro-connector" data-intro-connector></span>
      <span class="intro-name" data-intro-bride></span>
      <span class="intro-message" data-intro-message></span>
    </h1>
  </div>
  <div class="intro-actions">
    <div class="intro-progress" aria-hidden="true"></div>
    <button id="intro-sound" class="intro-control intro-sound" type="button"></button>
    <button id="intro-skip" class="intro-control" type="button" aria-label="인트로 건너뛰기">SKIP</button>
    <p class="intro-status" data-intro-status aria-live="polite"></p>
  </div>
</div>
```

```css
.intro-stage {
  position: relative;
  display: grid;
  width: 100%;
  aspect-ratio: 4 / 5;
  align-self: center;
  overflow: hidden;
  place-items: center;
}

.intro-video {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
  opacity: 0;
  visibility: hidden;
}

.hero-section .section-title {
  font-family: 'Allura', cursive;
  letter-spacing: 0;
  line-height: 0.95;
}
```

Keep `.intro` as the textured paper layer. Do not add a video background, dark shade, filter, or opacity below `1` in the playing state.

- [ ] **Step 4: Run tests and syntax/diff checks for GREEN**

Run:

```bash
/Users/gyumin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node --test tests/invitation.test.mjs
git diff --check
```

Expected: all tests pass, including the existing `playing → error` paper fallback test; both commands exit `0`.

- [ ] **Step 5: Review and commit only the implementation files**

Inspect:

```bash
git diff -- index.html tests/invitation.test.mjs
git status --short
```

Then commit only the expected files:

```bash
git add -- index.html tests/invitation.test.mjs
git commit -m "feat: frame intro video on paper"
```

# Intro Opening Message Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show the configurable `규민 ♡ 사라` opening copy for one second, fade it out, and only then play `assets/video/intro.mp4` from the beginning.

**Architecture:** Keep the existing single-file static architecture. `WEDDING_CONFIG.intro` owns copy and timing; the intro renderer preloads a paused video, drives the hold/fade/play sequence with cancellable timers, and preserves the existing skip, error, focus, and section-toggle lifecycle.

**Tech Stack:** HTML5 video, CSS transitions, vanilla JavaScript, Node.js built-in test runner and VM harness; no runtime dependency or build step.

## Global Constraints

- Keep the deployable runtime in one `index.html` file.
- Keep every asset URL relative so both direct `file://` opening and GitHub Pages work.
- Keep replaceable media under `assets/images/` and `assets/video/`; use `./assets/video/intro.mp4`.
- Keep all opening copy and timing values at the top in `WEDDING_CONFIG.intro`.
- Use the unfilled outline heart `♡`, not the red emoji `❤️` or filled heart `♥`.
- Default copy is exactly `규민 ♡ 사라` and `결혼 여정을 시작합니다.`.
- Default hold time is `1000` ms and default fade time is `600` ms.
- Preserve all section toggles, `SKIP`, `Escape`, sound control, media-error fallback, and invitation focus restoration.
- Do not commit `.DS_Store` or `.idea/`.

## File Structure

- Modify `index.html`: intro configuration, two-line heading markup and styles, delayed-play state machine, and timer cleanup.
- Modify `tests/invitation.test.mjs`: make name overrides independent of sample data, observe intro timers/media calls, and verify delayed playback and cancellation.
- Modify `docs/superpowers/specs/2026-07-20-intro-opening-message-design.md`: record the approved outline-heart copy.

---

### Task 1: Restore a configuration-independent green baseline

**Files:**
- Modify: `tests/invitation.test.mjs:229-238`
- Test: `tests/invitation.test.mjs:328-340`

**Interfaces:**
- Consumes: the `groom.name` and `bride.name` string fields inside the inline `WEDDING_CONFIG` source.
- Produces: `createHarness({ names: { groom, bride } })`, which overrides current configured names without assuming the repository's original sample names.

- [ ] **Step 1: Re-run the existing failing title test**

Run:

```bash
/Users/gyumin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node --test --test-name-pattern="initialization derives" tests/invitation.test.mjs
```

Expected: FAIL because the harness searches for the removed sample literals `김민준` and `이서연`, leaving the title as `이규민 ♥ 김사라 결혼식에 초대합니다`.

- [ ] **Step 2: Generalize only the test-harness substitutions**

Replace the literal substitutions with property-anchored regular expressions:

```js
  if (names) {
    configScript = configScript
      .replace(/groom:\s*\{\s*name:\s*'[^']*'/, `groom: { name: '${names.groom}'`)
      .replace(/bride:\s*\{\s*name:\s*'[^']*'/, `bride: { name: '${names.bride}'`);
  }
```

- [ ] **Step 3: Verify the focused test and full baseline**

Run:

```bash
/Users/gyumin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node --test --test-name-pattern="initialization derives" tests/invitation.test.mjs
/Users/gyumin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node --test tests/invitation.test.mjs
```

Expected: focused test PASS; full suite 16/16 PASS.

- [ ] **Step 4: Commit the harness repair**

```bash
git add tests/invitation.test.mjs
git commit -m "test: decouple invitation harness from sample names"
```

---

### Task 2: Add configurable opening copy and delayed video playback

**Files:**
- Modify: `tests/invitation.test.mjs:42-260, 376-455`
- Modify: `index.html:8-12, 180-230, 1002-1015, 1105-1115, 1700-1845`
- Test: `tests/invitation.test.mjs`

**Interfaces:**
- Consumes: `WEDDING_CONFIG.intro.names: string`, `message: string`, `messageHoldMs: number`, `messageFadeMs: number`, `video: string`, and `muted: boolean`.
- Produces: intro state classes `is-message-fading`, `is-message-hidden`, and `is-video-playing`; cancellable `introMessageTimer` and `introPlaybackTimer` handles.
- Preserves: `finishIntro(reason)`, `handleIntroMediaError()`, and public `WeddingApp` behavior.

- [ ] **Step 1: Extend the VM harness without adding production behavior**

Track media calls on `FakeNode`:

```js
    this.playCalls = 0;
    this.pauseCalls = 0;
```

```js
  pause() {
    this.pauseCalls += 1;
  }

  play() {
    this.playCalls += 1;
  }
```

Allow motion mode and observable timeouts:

```js
function createHarness({ now = Date.now(), introEnabled = true, names, reducedMotion = true } = {}) {
  const timeouts = [];
  const clearedTimeouts = [];
```

```js
    setTimeout(callback, delay) {
      const id = timeouts.length + 1;
      timeouts.push({ id, callback, delay });
      return id;
    },
    clearTimeout(id) {
      clearedTimeouts.push(id);
    },
    matchMedia: () => ({ matches: reducedMotion }),
```

Give the two intro test nodes both legacy and wished-for selectors so the current implementation still executes during RED:

```js
  const introNames = new FakeNode('span');
  introNames.dataset.introEyebrow = '';
  introNames.dataset.introNames = '';
  const introMessage = new FakeNode('span');
  introMessage.dataset.introTitle = '';
  introMessage.dataset.introMessage = '';
  intro.append(introNames, introMessage, status);
```

Return `video`, `introNames`, `introMessage`, `timeouts`, and `clearedTimeouts` from `createHarness`.

- [ ] **Step 2: Write focused failing behavior tests**

Add tests that assert configuration, ordering, and cancellation:

```js
test('intro renders configurable opening copy before delayed playback', () => {
  const { WEDDING_CONFIG: config } = loadContracts();
  assert.equal(config.intro.names, '규민 ♡ 사라');
  assert.equal(config.intro.message, '결혼 여정을 시작합니다.');
  assert.equal(config.intro.messageHoldMs, 1000);
  assert.equal(config.intro.messageFadeMs, 600);

  const harness = createHarness({ reducedMotion: false });
  harness.app.renderIntro();

  assert.equal(harness.introNames.textContent, config.intro.names);
  assert.equal(harness.introMessage.textContent, config.intro.message);
  assert.equal(harness.video.autoplay, false);
  assert.equal(harness.video.playCalls, 0);

  const hold = harness.timeouts.find(timeout => timeout.delay === 1000);
  assert.ok(hold);
  hold.callback();
  assert.ok(harness.intro.classList.contains('is-message-fading'));
  assert.equal(harness.video.playCalls, 0);

  const fade = harness.timeouts.find(timeout => timeout.delay === 600);
  assert.ok(fade);
  fade.callback();
  assert.equal(harness.video.playCalls, 1);
  assert.equal(harness.introMessage.getAttribute('aria-hidden'), 'true');
});

test('finishing during opening copy cancels delayed playback', () => {
  const harness = createHarness({ reducedMotion: false });
  harness.app.renderIntro();
  const hold = harness.timeouts.find(timeout => timeout.delay === 1000);

  harness.app.finishIntro('skip');
  hold.callback();

  assert.equal(harness.video.playCalls, 0);
  assert.ok(harness.clearedTimeouts.includes(hold.id));
});

test('reduced motion skips only the fade delay', () => {
  const harness = createHarness({ reducedMotion: true });
  harness.app.renderIntro();
  const hold = harness.timeouts.find(timeout => timeout.delay === 1000);

  hold.callback();

  assert.equal(harness.video.playCalls, 1);
  assert.equal(harness.timeouts.some(timeout => timeout.delay === 600), false);
});
```

Update the progressive-enhancement contract to require delayed autoplay and paused progress:

```js
  assert.match(app, /video\.autoplay\s*=\s*false/);
  assert.doesNotMatch(html, /<video[^>]*\sautoplay(?:\s|>)/i);
  assert.match(html, /\.intro\.is-video-playing \.intro-progress::after/);
```

- [ ] **Step 3: Run the focused tests and verify RED**

Run:

```bash
/Users/gyumin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node --test --test-name-pattern="intro renders configurable|finishing during opening|reduced motion|intro and progressive" tests/invitation.test.mjs
```

Expected: FAIL because `names`, `message`, and timing fields do not exist and the current renderer calls `video.play()` immediately.

- [ ] **Step 4: Add the top-level intro configuration and two-line heading**

Replace the old `eyebrow`/`title` pair with clearly named values:

```js
      intro: {
        video: './assets/video/intro.mp4',
        poster: './assets/images/intro-poster.jpg',
        names: '규민 ♡ 사라',
        message: '결혼 여정을 시작합니다.',
        messageHoldMs: 1000,
        messageFadeMs: 600,
        muted: true,
        fallbackDelayMs: 2800,
      },
```

Remove the HTML `autoplay` attribute and make the two lines one accessible heading:

```html
      <video id="intro-video" class="intro-video" muted playsinline preload="auto"></video>
      <div class="intro-shade" aria-hidden="true"></div>
      <div class="intro-content">
        <h1 id="intro-title" class="intro-heading">
          <span class="intro-names" data-intro-names></span>
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

- [ ] **Step 5: Add message transition and playback-progress styles**

Replace the old eyebrow/title styles and pause progress until playback:

```css
    .intro-heading {
      display: grid;
      margin: 0;
      place-content: center;
      gap: 14px;
      opacity: 1;
      transform: translateY(0);
      transition:
        opacity var(--intro-message-fade-duration, 600ms) ease,
        transform var(--intro-message-fade-duration, 600ms) ease;
    }

    .intro.is-message-fading .intro-heading {
      opacity: 0;
      transform: translateY(-6px);
    }

    .intro.is-message-hidden .intro-heading {
      visibility: hidden;
    }

    .intro-names {
      font-family: var(--serif);
      font-size: clamp(1.65rem, 7vw, 2.35rem);
      font-weight: 400;
      letter-spacing: 0.04em;
      line-height: 1.15;
    }

    .intro-message {
      font-size: 0.88rem;
      font-weight: 500;
      letter-spacing: 0.08em;
      line-height: 1.6;
    }
```

```css
    .intro-progress::after {
      animation: intro-progress 8s linear infinite paused;
    }

    .intro.is-video-playing .intro-progress::after {
      animation-play-state: running;
    }
```

- [ ] **Step 6: Implement cancellable hold, fade, and play sequencing**

Add state handles next to the existing intro timers:

```js
      let introMessageTimer = 0;
      let introPlaybackTimer = 0;
```

Add helpers before the fallback logic:

```js
      function introDelay(value, fallback) {
        const duration = Number(value);
        return Number.isFinite(duration) ? Math.max(0, duration) : fallback;
      }

      function clearIntroSequenceTimers() {
        window.clearTimeout(introMessageTimer);
        window.clearTimeout(introPlaybackTimer);
        introMessageTimer = 0;
        introPlaybackTimer = 0;
      }
```

Call `clearIntroSequenceTimers()` at the start of `renderIntro()`, in `handleIntroMediaError()`, and in `finishIntro()`. In `renderIntro()`, fill the new copy, explicitly disable autoplay, preload the source, and schedule playback only after the copy sequence:

```js
        const introNames = intro.querySelector('[data-intro-names]');
        const introMessage = intro.querySelector('[data-intro-message]');
        if (!introNames || !introMessage) {
          finishIntro('missing-intro-copy');
          return;
        }
        introNames.textContent = WEDDING_CONFIG.intro.names;
        introMessage.textContent = WEDDING_CONFIG.intro.message;

        video.autoplay = false;
        video.muted = Boolean(WEDDING_CONFIG.intro.muted);
```

After assigning `video.src`, use these closures:

```js
        const holdMs = introDelay(WEDDING_CONFIG.intro.messageHoldMs, 1000);
        const fadeMs = introDelay(WEDDING_CONFIG.intro.messageFadeMs, 600);
        const reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        intro.style.setProperty('--intro-message-fade-duration', `${fadeMs}ms`);

        const playVideo = () => {
          introPlaybackTimer = 0;
          if (introFinished || document.getElementById('intro') !== intro) return;
          intro.classList.add('is-message-hidden');
          introMessage.setAttribute('aria-hidden', 'true');
          introNames.setAttribute('aria-hidden', 'true');
          video.currentTime = 0;
          try {
            const playResult = video.play();
            if (playResult && typeof playResult.catch === 'function') playResult.catch(handleIntroMediaError);
          } catch (error) {
            handleIntroMediaError();
          }
        };

        const fadeMessage = () => {
          introMessageTimer = 0;
          if (introFinished || document.getElementById('intro') !== intro) return;
          intro.classList.add('is-message-fading');
          if (reducedMotion) {
            playVideo();
            return;
          }
          introPlaybackTimer = window.setTimeout(playVideo, fadeMs);
        };

        video.addEventListener('playing', () => intro.classList.add('is-video-playing'));
        introMessageTimer = window.setTimeout(fadeMessage, holdMs);
```

- [ ] **Step 7: Verify GREEN, static constraints, and the real transition**

Run:

```bash
/Users/gyumin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node --test --test-name-pattern="intro renders configurable|finishing during opening|reduced motion|intro and progressive" tests/invitation.test.mjs
/Users/gyumin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node --test tests/invitation.test.mjs
git diff --check
```

Expected: focused tests PASS; full suite 19/19 PASS; no whitespace errors.

Open the direct local URL in a mobile viewport:

```text
file:///Users/gyumin/Documents/New%20project/index.html
```

Verify: first frame and `규민 ♡ 사라` / `결혼 여정을 시작합니다.` appear immediately; after about one second the copy fades for about 600 ms; video then starts at 0:00; `SKIP` still reveals the invitation; no external runtime asset is required.

- [ ] **Step 8: Commit the feature**

```bash
git add index.html tests/invitation.test.mjs docs/superpowers/specs/2026-07-20-intro-opening-message-design.md
git commit -m "feat: delay intro video behind opening message"
```

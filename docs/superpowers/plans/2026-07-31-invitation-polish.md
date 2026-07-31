# Mobile Invitation Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply the approved mist-sage palette, cross-faded intro, icon-only manual playback, borderless silent video, and slower staggered invitation reveals.

**Architecture:** Keep the one-file invitation runtime in `index.html` and its existing autoplay/manual fallback state machine. Regenerate the derived MP4 and poster from the immutable original using the existing Python renderer, with a one-pixel inset crop before scaling. Lock each behavior with the existing Node source/runtime tests and Python media tests before changing production files.

**Tech Stack:** HTML, CSS, vanilla JavaScript, Node.js built-in test runner, Python `unittest`, Pillow, NumPy, FFmpeg/FFprobe.

## Global Constraints

- Preserve `assets/video/intro.original.mp4` with SHA-256 `298f7609b8583780e9c84de4be4e40bf5a381fd68e0e210fee6eb937e1cdf3f2`.
- Keep the derived video silent H.264 Constrained Baseline Level 3.1, 840×720, 24fps, 6 seconds, `yuv420p`, no B-frames, and faststart.
- Use palette values exactly: paper `#f7feff`, ink `#263b3b`, muted `#708484`, sage `#718f8a`, bronze `#967d70`.
- Keep autoplay-first, icon-only manual playback, SKIP, media-error fallback, and reduced-motion behavior.
- Do not add external JavaScript, CSS, or media dependencies.

---

### Task 1: Remove the encoded video edge

**Files:**
- Modify: `scripts/test_intro_video_clean_title.py`
- Modify: `scripts/edit_intro_video.py`
- Modify: `assets/video/intro.mp4`
- Modify: `assets/images/intro-poster.jpg`

**Interfaces:**
- Consumes: immutable `SOURCE`, `SOURCE_SHA256`, FFmpeg, and the existing 144-frame cleanup pipeline.
- Produces: `frame_rgb(..., crop_source=True)` using the approved inset crop and a borderless `OUTPUT`/`POSTER`.

- [ ] **Step 1: Write the failing crop and edge tests**

Change the `crop_source` filter to the approved reference transform:

```python
if crop_source:
    filters.extend(
        [
            "crop=838:718:223:1",
            "scale=840:720:flags=lanczos",
        ]
    )
```

Replace the broad matte test with a one-pixel border regression:

```python
def test_crop_excludes_dark_source_border(self) -> None:
    frame = frame_rgb(OUTPUT, 0)
    edges = (
        frame[:, 0],
        frame[:, -1],
        frame[0, :],
        frame[-1, :],
    )
    for edge in edges:
        near_black_ratio = float(np.mean(np.max(edge, axis=1) < 40))
        self.assertLess(near_black_ratio, 0.1)
```

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```bash
'/Users/gyumin/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3' -m unittest -v \
  scripts.test_intro_video_clean_title.IntroVideoCleanTitleTest.test_first_output_frame_is_cropped_source_frame_48 \
  scripts.test_intro_video_clean_title.IntroVideoCleanTitleTest.test_crop_excludes_dark_source_border
```

Expected: FAIL because the current output still includes the source border and does not match the inset-scaled reference.

- [ ] **Step 3: Implement the source-level crop fix**

Change `extract_frames()` in `scripts/edit_intro_video.py` to:

```python
"trim=start_frame=48:end_frame=192,"
"crop=838:718:223:1,"
"scale=840:720:flags=lanczos,"
"setpts=N/(24*TB)"
```

Keep the encoder flags, output frame count, poster rendering, and immutable-source checks unchanged.

- [ ] **Step 4: Regenerate the derived assets**

Run:

```bash
'/Users/gyumin/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3' scripts/edit_intro_video.py
```

Expected: output reports the rendered MP4, poster, and preserved original.

- [ ] **Step 5: Verify GREEN**

Run:

```bash
'/Users/gyumin/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3' -m unittest -v scripts/test_intro_video_clean_title.py
```

Expected: all media tests PASS.

- [ ] **Step 6: Commit the deployable media**

```bash
git add assets/video/intro.mp4 assets/images/intro-poster.jpg
git commit -m "fix: remove intro video edge border"
```

---

### Task 2: Apply the palette and icon-only manual control

**Files:**
- Modify: `tests/invitation.test.mjs`
- Modify: `index.html`

**Interfaces:**
- Consumes: `WEDDING_CONFIG.theme`, CSS custom properties, and `showIntroManualPlayback()`.
- Produces: the exact approved palette and an accessible `#intro-play` containing only an inline SVG.

- [ ] **Step 1: Write the failing source contract**

Add:

```javascript
test('invitation uses the approved palette and icon-only manual play control', () => {
  const html = source();
  assert.match(html, /paper:\s*'#f7feff'/);
  assert.match(html, /ink:\s*'#263b3b'/);
  assert.match(html, /muted:\s*'#708484'/);
  assert.match(html, /sage:\s*'#718f8a'/);
  assert.match(html, /bronze:\s*'#967d70'/);
  assert.match(html, /id="intro-play"[\s\S]*?<svg[^>]*aria-hidden="true"/);
  assert.match(html, /\.intro-play\s*\{[\s\S]*?width:\s*64px;[\s\S]*?height:\s*64px;/);
  assert.doesNotMatch(html, /intro-play-label|intro-play-help/);
  assert.doesNotMatch(html, />\s*영상 재생\s*</);
  assert.doesNotMatch(html, /자동재생이 안 되면 한 번 눌러주세요/);
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```bash
'/Users/gyumin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node' \
  --test --test-name-pattern='approved palette and icon-only' tests/invitation.test.mjs
```

Expected: FAIL on the old palette, text markup, and 180×96px capsule control.

- [ ] **Step 3: Implement the palette**

Set both `WEDDING_CONFIG.theme` and `:root` to:

```javascript
theme: {
  paper: '#f7feff',
  ink: '#263b3b',
  muted: '#708484',
  sage: '#718f8a',
  bronze: '#967d70',
  maxWidth: '460px',
},
```

Update old hard-coded fallback RGB values to ink `rgb(38 59 59 / …)` and paper `rgb(247 254 255 / …)`.

- [ ] **Step 4: Implement the icon-only control**

Use this button content:

```html
<button id="intro-play" class="intro-play" type="button" aria-label="인트로 영상 재생" hidden>
  <svg class="intro-play-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path d="M8 5.4v13.2c0 .8.9 1.3 1.6.8l9-6.6a1 1 0 0 0 0-1.6l-9-6.6A1 1 0 0 0 8 5.4Z"></path>
  </svg>
</button>
```

Make `.intro-play` a 64×64px white circle with a subtle border, `0 14px 30px` and `0 3px 8px` shadows, centered transform, focus-visible outline, and active scale `0.96`. Remove `.intro-play-label` and `.intro-play-help`. In `showIntroManualPlayback()`, keep the status empty instead of assigning an instruction string.

- [ ] **Step 5: Verify GREEN**

Run the focused Node test again. Expected: PASS.

- [ ] **Step 6: Commit the palette and control**

```bash
git add index.html
git commit -m "style: apply mist sage invitation palette"
```

---

### Task 3: Cross-fade the opening copy into video

**Files:**
- Modify: `tests/invitation.test.mjs`
- Modify: `index.html`

**Interfaces:**
- Consumes: `messageHoldMs`, `messageFadeMs`, `attemptIntroPlayback()`, and the `playing` event.
- Produces: playback beginning when the copy fade begins and completion of accessibility hiding after 1200ms.

- [ ] **Step 1: Rewrite the intro timing test for the desired timeline**

Change the expected `messageFadeMs` to `1200`. After the 1000ms hold callback, assert:

```javascript
assert.ok(harness.intro.classList.contains('is-message-fading'));
assert.equal(harness.video.playCalls, 1);
assert.equal(harness.introHeading.getAttribute('aria-hidden'), null);
```

Invoke the registered `playing` handler and assert `is-video-playing`. Then invoke the 1200ms timer and assert:

```javascript
assert.ok(harness.intro.classList.contains('is-message-hidden'));
assert.equal(harness.introHeading.getAttribute('aria-hidden'), 'true');
```

Update the autoplay-rejection test so the 1000ms hold callback triggers the rejected play directly and the empty status remains `''`.

- [ ] **Step 2: Run the intro timing tests and verify RED**

Run:

```bash
'/Users/gyumin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node' \
  --test --test-name-pattern='intro renders|autoplay rejection' tests/invitation.test.mjs
```

Expected: FAIL because playback currently begins after the 600ms fade and the manual state writes instruction text.

- [ ] **Step 3: Implement concurrent fade and playback**

Set `messageFadeMs: 1200`. Give `.intro-video` an opacity transition using `--intro-message-fade-duration`. In `fadeMessage()`:

```javascript
intro.classList.add('is-message-fading');
video.currentTime = 0;
attemptIntroPlayback();
if (effectiveFadeMs === 0) {
  completeMessageFade();
  return;
}
introPlaybackTimer = window.setTimeout(completeMessageFade, effectiveFadeMs);
```

Define `completeMessageFade()` to clear `introPlaybackTimer`, add `is-message-hidden`, and set the heading `aria-hidden` to `true`. Keep `playing` responsible for adding `is-video-playing` and hiding the manual control.

- [ ] **Step 4: Verify GREEN**

Run the focused timing tests. Expected: PASS.

- [ ] **Step 5: Commit the cross-fade**

```bash
git add index.html
git commit -m "feat: crossfade intro copy into video"
```

---

### Task 4: Slow and stagger invitation section reveals

**Files:**
- Modify: `tests/invitation.test.mjs`
- Modify: `index.html`

**Interfaces:**
- Consumes: `.section-header`, `.section-body`, `.reveal.is-visible`, `IntersectionObserver`, and `matchMedia`.
- Produces: 1100ms header reveal, delayed 1250ms body reveal, and immediate reduced-motion rendering.

- [ ] **Step 1: Write the failing motion contract**

Add:

```javascript
test('section copy reveals slowly in a stagger and respects reduced motion', () => {
  const html = source();
  assert.match(html, /\.reveal \.section-header[\s\S]*?transition-duration:\s*1100ms/);
  assert.match(html, /\.reveal \.section-body[\s\S]*?transition-duration:\s*1250ms/);
  assert.match(html, /\.reveal \.section-body[\s\S]*?transition-delay:\s*180ms/);
  assert.match(html, /cubic-bezier\(0\.22,\s*1,\s*0\.36,\s*1\)/);
  assert.match(html, /prefers-reduced-motion:\s*reduce/);
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```bash
'/Users/gyumin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node' \
  --test --test-name-pattern='section copy reveals slowly' tests/invitation.test.mjs
```

Expected: FAIL because the current animation moves the entire section for 720ms.

- [ ] **Step 3: Implement the staggered reveal**

Replace the whole-section transition with child transitions:

```css
.has-reveal-motion .reveal .section-header,
.has-reveal-motion .reveal .section-body {
  opacity: 0;
  transition-property: opacity, transform;
  transition-timing-function: cubic-bezier(0.22, 1, 0.36, 1);
}

.has-reveal-motion .reveal .section-header {
  transform: translateY(36px);
  transition-duration: 1100ms;
}

.has-reveal-motion .reveal .section-body {
  transform: translateY(30px);
  transition-duration: 1250ms;
  transition-delay: 180ms;
}

.has-reveal-motion .reveal.is-visible .section-header,
.has-reveal-motion .reveal.is-visible .section-body {
  opacity: 1;
  transform: none;
}
```

Add a reduced-motion rule that removes transitions and transforms. In `initRevealMotion()`, return after adding `is-visible` when `matchMedia('(prefers-reduced-motion: reduce)').matches`.

- [ ] **Step 4: Verify GREEN**

Run the focused motion test and then the entire Node suite. Expected: all tests PASS.

- [ ] **Step 5: Commit the reveal motion**

```bash
git add index.html
git commit -m "style: slow and stagger invitation reveals"
```

---

### Task 5: Final compatibility and visual verification

**Files:**
- Verify: `index.html`
- Verify: `assets/video/intro.mp4`
- Verify: `assets/images/intro-poster.jpg`

**Interfaces:**
- Consumes: all deliverables from Tasks 1–4.
- Produces: evidence that the complete invitation is deployable and visually matches the approved mobile design.

- [ ] **Step 1: Run all automated tests**

```bash
'/Users/gyumin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node' --test tests/invitation.test.mjs
'/Users/gyumin/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3' -m unittest -v scripts/test_intro_video_clean_title.py
```

Expected: all Node and Python tests PASS.

- [ ] **Step 2: Decode and inspect the full video**

```bash
ffmpeg -v error -i assets/video/intro.mp4 -f null -
ffprobe -v error -show_streams -show_format -of json assets/video/intro.mp4
```

Expected: decode exits 0; exactly one H.264 video stream and no audio stream.

- [ ] **Step 3: Verify faststart, keyframes, source preservation, and clean diff**

```bash
rg -a -b -o 'ftyp|moov|mdat' assets/video/intro.mp4
ffprobe -v error -select_streams v:0 -skip_frame nokey \
  -show_entries frame=best_effort_timestamp_time -of csv=p=0 assets/video/intro.mp4
shasum -a 256 assets/video/intro.original.mp4
git diff --check
```

Expected: `moov` precedes `mdat`; keyframes are at 0, 2, and 4 seconds; source hash matches the global constraint; diff check is empty.

- [ ] **Step 4: Verify the real site at iPhone 11 Pro dimensions**

Serve the repository locally, open the page at 375×812, and inspect both autoplay success and a forced autoplay rejection. Confirm:

- `Gyumin & Sara` cross-fades into the video without an abrupt blank frame.
- Manual mode shows only the floating white play icon.
- No dark line is visible on any video edge.
- Section headers and bodies rise slowly in sequence.
- The background is `#f7feff` and the remaining components use the approved mist-sage palette.

- [ ] **Step 5: Report repository state**

Run:

```bash
git status --short
git log -6 --oneline
```

Report the changed files, verification results, commits made, and whether anything remains untracked or unpushed.

# Fresh Sage Sky Theme Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the invitation's brown-and-ivory colors with the approved Fresh Sage Sky palette while preserving every existing typography, layout, motion, and media behavior.

**Architecture:** Keep the single-file runtime and existing CSS structure in `index.html`. Replace only theme configuration, CSS color tokens, and hard-coded color fallbacks; use the existing Node suite to lock the palette and protect the typography contract before editing production CSS.

**Tech Stack:** HTML, CSS custom properties, vanilla JavaScript, Node.js built-in test runner, local browser verification.

## Global Constraints

- Use paper `#EFFBFD`, ink `#244346`, muted `#6B8586`, green `#497A71`, sky `#CDEDF4`, and soft green `#B8D8CB`.
- Apply only color-related changes.
- Preserve Allura, Georgia, and the existing system Korean font stack.
- Preserve every font size, weight, letter spacing, line height, layout dimension, radius, spacing, animation, and video behavior.
- Remove the `bronze` token and all old brown or ivory fallback values from deployable HTML.
- Do not modify or regenerate any image or video.

---

### Task 1: Lock the palette and typography contract

**Files:**
- Modify: `tests/invitation.test.mjs`

**Interfaces:**
- Consumes: the HTML source, `WEDDING_CONFIG.theme`, `WeddingApp.init()`, and the existing fake document root.
- Produces: a focused regression test for the approved tokens, runtime CSS properties, absence of brown fallbacks, and preservation of the existing font declarations.

- [ ] **Step 1: Make the fake style declaration observable**

Replace the no-op `FakeNode.style` with a property map:

```javascript
const styleValues = new Map();
this.style = {
  setProperty(name, value) {
    styleValues.set(name, String(value));
  },
  getPropertyValue(name) {
    return styleValues.get(name) || '';
  },
};
```

- [ ] **Step 2: Rewrite the palette test for the approved A option**

Rename the current palette test to `invitation applies the fresh sage sky palette without changing typography` and assert:

```javascript
const { WEDDING_CONFIG: config } = loadContracts();
assert.equal(config.theme.paper, '#effbfd');
assert.equal(config.theme.ink, '#244346');
assert.equal(config.theme.muted, '#6b8586');
assert.equal(config.theme.green, '#497a71');
assert.equal(config.theme.sky, '#cdedf4');
assert.equal(config.theme.softGreen, '#b8d8cb');
assert.equal(Object.hasOwn(config.theme, 'bronze'), false);

const harness = createHarness({ introEnabled: false });
harness.app.init();
assert.equal(harness.document.documentElement.style.getPropertyValue('--paper'), '#effbfd');
assert.equal(harness.document.documentElement.style.getPropertyValue('--green'), '#497a71');
assert.equal(harness.document.documentElement.style.getPropertyValue('--sky'), '#cdedf4');
assert.equal(harness.document.documentElement.style.getPropertyValue('--soft-green'), '#b8d8cb');

assert.doesNotMatch(
  html,
  /#f7feff|#967d70|#dcd7cd|#c9c2b5|#e5e0d7|#e3ded4|#cbc5ba|150 125 112|121 128 113|42 38 31|--bronze|theme\.bronze/,
);
assert.match(html, /--serif:\s*Georgia,\s*'Times New Roman',\s*'Noto Serif KR',\s*serif/);
assert.match(html, /--sans:\s*-apple-system,\s*BlinkMacSystemFont,\s*'Apple SD Gothic Neo',\s*'Noto Sans KR',\s*sans-serif/);
assert.match(html, /\.hero-section \.section-title\s*\{[^}]*font-family:\s*'Allura',\s*cursive/);
```

Keep the existing icon-only play-control assertions in the same test.

- [ ] **Step 3: Run the focused test and verify RED**

Run:

```bash
'/Users/gyumin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node' \
  --test --test-name-pattern='fresh sage sky palette' tests/invitation.test.mjs
```

Expected: FAIL because the current configuration still exposes the old paper, `sage`, and `bronze` theme.

- [ ] **Step 4: Commit no files yet**

The test stays red until Task 2 provides the production palette.

---

### Task 2: Apply the Fresh Sage Sky colors

**Files:**
- Modify: `index.html`

**Interfaces:**
- Consumes: the palette contract from Task 1 and the existing `applyTheme()` entry point.
- Produces: theme keys `paper`, `ink`, `muted`, `green`, `sky`, and `softGreen`, with matching CSS variables and no brown fallback colors.

- [ ] **Step 1: Replace theme configuration and root tokens**

Use:

```javascript
theme: { paper: '#effbfd', ink: '#244346', muted: '#6b8586', green: '#497a71', sky: '#cdedf4', softGreen: '#b8d8cb', maxWidth: '460px' },
```

Use matching initial CSS:

```css
--paper: #effbfd;
--ink: #244346;
--muted: #6b8586;
--green: #497a71;
--sky: #cdedf4;
--soft-green: #b8d8cb;
```

Keep `--page-width`, `--line`, `--serif`, and `--sans` unchanged.

- [ ] **Step 2: Replace semantic accent references**

- Replace every `var(--sage)` and `var(--bronze)` reference with `var(--green)`.
- Change the focus outline, all section and card eyebrows, story years, timeline dots, account toggles, buttons, dates, and link accents only through that token replacement.
- Remove the now-redundant `.hero-section .section-eyebrow` color override if it duplicates the shared green rule.

- [ ] **Step 3: Replace hard-coded brown surfaces**

Use token-based color layers without changing any dimensions or declarations unrelated to color:

```css
linear-gradient(115deg, rgb(255 255 255 / 12%), transparent 44%, rgb(73 122 113 / 5%))
```

```css
background: linear-gradient(145deg, var(--sky), var(--soft-green) 48%, color-mix(in srgb, var(--sky) 72%, white));
```

```css
background:
  radial-gradient(circle at 32% 28%, rgb(255 255 255 / 48%), transparent 24%),
  linear-gradient(135deg, rgb(73 122 113 / 16%), transparent 52%),
  linear-gradient(30deg, var(--sky), var(--soft-green));
```

Change account-row tint to `rgb(73 122 113 / 8%)`, modal and page shadows to ink-derived RGB values, and keep existing alpha values, blur radii, offsets, and border radii unchanged.

- [ ] **Step 4: Update runtime token application**

Change `applyTheme()` to:

```javascript
root.style.setProperty('--green', WEDDING_CONFIG.theme.green);
root.style.setProperty('--sky', WEDDING_CONFIG.theme.sky);
root.style.setProperty('--soft-green', WEDDING_CONFIG.theme.softGreen);
```

Remove the `--sage` and `--bronze` assignments.

- [ ] **Step 5: Run the focused test and verify GREEN**

Run:

```bash
'/Users/gyumin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node' \
  --test --test-name-pattern='fresh sage sky palette' tests/invitation.test.mjs
```

Expected: PASS.

- [ ] **Step 6: Align the stale intro-copy assertion**

The production config currently contains `두 사람의 여정이 시작됩니다.` while the ignored local test helper expects an older phrase. Change only the test assertion to the current production value:

```javascript
assert.equal(config.intro.message, '두 사람의 여정이 시작됩니다.');
```

Do not change the production intro copy.

- [ ] **Step 7: Run the full Node suite**

Run:

```bash
'/Users/gyumin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node' \
  --test tests/invitation.test.mjs
```

Expected: all tests PASS.

- [ ] **Step 8: Commit the deployable change**

```bash
git add index.html
git commit -m "style: apply fresh sage sky theme"
```

---

### Task 3: Verify the unchanged mobile design

**Files:**
- Verify: `index.html`

**Interfaces:**
- Consumes: the completed theme and the current local invitation.
- Produces: evidence that only colors changed and that the selected palette is applied consistently at mobile size.

- [ ] **Step 1: Serve the invitation locally**

Run a static HTTP server rooted at the repository and load `index.html`.

- [ ] **Step 2: Inspect at iPhone 11 Pro dimensions**

Set the browser viewport to 375×812 and confirm:

- Computed paper background is `rgb(239, 251, 253)`.
- `Wedding Invitation`, `Invitation`, and `Bride & Groom` share the green `rgb(73, 122, 113)`.
- The photo and gallery fallbacks use sky and soft-green gradients with no brown tones.
- Buttons, timeline dots, account controls, focus color, and labels use the green family.
- Allura and Georgia font declarations, type sizes, spacing, layout, and animations remain visually unchanged.

- [ ] **Step 3: Run complete regression checks**

```bash
'/Users/gyumin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node' --test tests/invitation.test.mjs
'/Users/gyumin/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3' -m unittest discover -s scripts -p 'test_*.py'
ffmpeg -v error -i assets/video/intro.mp4 -f null -
git diff --check
```

Expected: all Node and Python tests PASS, video decode exits 0, and diff check is empty.

# Courgette Script Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Allura with Courgette for only the intro names and hero title, keep `Happily Ever After` on one line, then verify the mobile layout and push the completed `main` branch.

**Architecture:** Keep the existing single Google Fonts stylesheet and two existing CSS selectors in `index.html`. Lock the font URL, target selectors, and unchanged size declarations with the Node suite before changing the HTML.

**Tech Stack:** HTML, CSS, Google Fonts CSS API, Node.js built-in test runner, local browser verification, Git.

## Global Constraints

- Apply `'Courgette', cursive` only to `.intro-name` and `.hero-section .section-title`.
- Keep one external stylesheet and remove every Allura reference.
- Preserve the intro font size and both titles' weights, letter spacing, line height, colors, surrounding layout, animation, and media behavior.
- Size the hero title for Courgette with `max-width: 100%` and `font-size: clamp(1.75rem, 9vw, 2.6rem)`.
- Keep `Happily Ever After` fully visible on one line without horizontal page overflow at 320px and 375px viewport widths.
- Do not stage or push `assets/video/intro.original.mp4`.
- Push the verified commits directly to `origin/main`.

---

### Task 1: Lock the Courgette typography contract

**Files:**
- Modify: `tests/invitation.test.mjs`

**Interfaces:**
- Consumes: the HTML source and the existing Google Fonts, intro, and hero typography tests.
- Produces: a focused contract that fails if Courgette is not loaded, either target misses it, Allura remains, the existing sizes change, or the hero title can wrap.

- [ ] **Step 1: Update the external-font expectation**

In `runtime is one index with only the approved font stylesheet`, replace the Allura URL assertion with:

```javascript
assert.match(stylesheets[0], /https:\/\/fonts\.googleapis\.com\/css2\?family=Courgette(?:&|&amp;)display=swap/);
```

- [ ] **Step 2: Add the focused target and size assertions**

Add:

```javascript
test('script titles use courgette with responsive hero sizing', () => {
  const html = source();
  assert.doesNotMatch(html, /Allura/);
  assert.match(
    html,
    /\.intro-name\s*\{[^}]*font-family:\s*'Courgette',\s*cursive;[^}]*font-size:\s*clamp\(3\.6rem,\s*18vw,\s*5\.4rem\);/,
  );
  assert.match(
    html,
    /\.hero-section \.section-title\s*\{[^}]*max-width:\s*100%;[^}]*font-family:\s*'Courgette',\s*cursive;[^}]*font-size:\s*clamp\(1\.75rem,\s*9vw,\s*2\.6rem\);[^}]*white-space:\s*nowrap;/,
  );
});
```

Update the existing intro and hero font-family assertions from Allura to Courgette without changing their other expectations.

- [ ] **Step 3: Run the focused test and verify RED**

Run:

```bash
'/Users/gyumin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node' \
  --test --test-name-pattern='courgette is limited' tests/invitation.test.mjs
```

Expected: FAIL because `index.html` still loads and uses Allura.

---

### Task 2: Replace Allura with Courgette and keep the hero title on one line

**Files:**
- Modify: `index.html`

**Interfaces:**
- Consumes: the failing typography contract from Task 1.
- Produces: one Courgette stylesheet, two Courgette target selectors, and a no-wrap hero title.

- [ ] **Step 1: Replace the Google Fonts link**

Change the existing stylesheet to:

```html
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Courgette&amp;display=swap">
```

- [ ] **Step 2: Replace only the two font-family declarations**

Use:

```css
font-family: 'Courgette', cursive;
```

in `.intro-name` and `.hero-section .section-title`. Do not modify any adjacent declaration.

- [ ] **Step 3: Prevent the hero title from wrapping**

Replace `max-width: 7em` and the existing hero font-size, then add the no-wrap declaration:

```css
max-width: 100%;
font-size: clamp(1.75rem, 9vw, 2.6rem);
white-space: nowrap;
```

- [ ] **Step 4: Run the focused test and verify GREEN**

Run:

```bash
'/Users/gyumin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node' \
  --test --test-name-pattern='courgette is limited' tests/invitation.test.mjs
```

Expected: PASS.

- [ ] **Step 5: Run the full Node suite**

Run:

```bash
'/Users/gyumin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node' \
  --test tests/invitation.test.mjs
```

Expected: all tests PASS.

- [ ] **Step 6: Commit**

```bash
git add index.html
git commit -m "style: use courgette for invitation script"
```

---

### Task 3: Verify mobile rendering and push main

**Files:**
- Verify: `index.html`

**Interfaces:**
- Consumes: the committed Courgette change and all prior invitation behavior.
- Produces: mobile visual evidence, a green regression suite, and an updated `origin/main`.

- [ ] **Step 1: Verify the real page at 375×812**

Serve the repository locally and inspect the page at 320×812 and iPhone 11 Pro dimensions. Confirm:

- `Gyumin & Sara` and `Happily Ever After` compute to `Courgette, cursive`.
- `Happily Ever After` has `white-space: nowrap` and renders as one line.
- The hero title's `scrollWidth` does not exceed its `clientWidth`, so no letters are clipped.
- The root has no horizontal overflow.
- The intro phrase retains its prior font size; both phrases retain their prior line heights.
- Colors, section spacing, video, transitions, and remaining fonts are unchanged.

- [ ] **Step 2: Run complete regression checks**

```bash
'/Users/gyumin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node' --test tests/invitation.test.mjs
'/Users/gyumin/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3' -m unittest discover -s scripts -p 'test_*.py'
ffmpeg -v error -i assets/video/intro.mp4 -f null -
git diff --check
```

Expected: all Node and Python tests PASS, video decode exits 0, and diff check is empty.

- [ ] **Step 3: Fetch and confirm main has not diverged**

```bash
git fetch origin main
git status --short --branch
```

Expected: local `main` is ahead of `origin/main` with no remote-only commits. The preserved untracked original video may remain listed.

- [ ] **Step 4: Push the verified branch**

```bash
git push origin main
```

Expected: push succeeds and local `main` matches `origin/main`.

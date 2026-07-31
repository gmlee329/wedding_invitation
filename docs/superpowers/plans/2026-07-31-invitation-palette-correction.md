# Invitation Palette Correction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Change the invitation paper background to `#effeff` and make every section eyebrow use the same sage color as the top `Wedding Invitation` eyebrow.

**Architecture:** Keep the existing theme-token structure in `index.html`. Update the paper token in both the JavaScript configuration and initial CSS, then split the shared eyebrow selector so section-level labels use `--sage` while card labels and story years retain `--bronze`.

**Tech Stack:** HTML, CSS, vanilla JavaScript, Node.js built-in test runner.

## Global Constraints

- Use paper `#effeff` exactly in `WEDDING_CONFIG.theme.paper` and the initial `:root --paper`.
- Use `var(--sage)` for every `.section-eyebrow`, including `Wedding Invitation`, `Invitation`, and `Bride & Groom`.
- Keep `.card-eyebrow` and `.story-year` on `var(--bronze)`.
- Do not change layout, animation, video behavior, or the remaining palette values.

---

### Task 1: Correct the shared invitation palette

**Files:**
- Modify: `tests/invitation.test.mjs`
- Modify: `index.html`

**Interfaces:**
- Consumes: `WEDDING_CONFIG.theme`, the `:root` CSS variables, and the `.section-eyebrow`/`.card-eyebrow`/`.story-year` selectors.
- Produces: a consistent `#effeff` paper background and section-level sage eyebrow color without changing card hierarchy.

- [ ] **Step 1: Update the palette behavior test**

Change the expected paper value in `invitation uses the approved palette and icon-only manual play control` to `#effeff`. Add assertions that the CSS rules assign `var(--sage)` to `.section-eyebrow` and retain `var(--bronze)` for `.card-eyebrow` and `.story-year`:

```javascript
assert.match(html, /paper:\s*'#effeff'/);
assert.match(html, /--paper:\s*#effeff;/);
assert.match(html, /\.section-eyebrow\s*\{[\s\S]*?color:\s*var\(--sage\);/);
assert.match(html, /\.card-eyebrow,\s*\.story-year\s*\{[\s\S]*?color:\s*var\(--bronze\);/);
```

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```bash
'/Users/gyumin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node' \
  --test --test-name-pattern='approved palette and icon-only' tests/invitation.test.mjs
```

Expected: FAIL because the current paper is `#f7feff` and section eyebrow colors are grouped with the bronze selectors.

- [ ] **Step 3: Implement the token and selector correction**

Set the configuration and CSS token to:

```css
--paper: #effeff;
```

```javascript
theme: { paper: '#effeff', ink: '#263b3b', muted: '#708484', sage: '#718f8a', bronze: '#967d70', maxWidth: '460px' },
```

Split the eyebrow rules:

```css
.section-eyebrow {
  margin: 0 0 12px;
  color: var(--sage);
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.22em;
  line-height: 1.4;
  text-transform: uppercase;
}

.card-eyebrow,
.story-year {
  margin: 0 0 12px;
  color: var(--bronze);
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.22em;
  line-height: 1.4;
  text-transform: uppercase;
}
```

Remove the now-redundant `.hero-section .section-eyebrow` override.

- [ ] **Step 4: Run the focused and full tests**

Run:

```bash
'/Users/gyumin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node' \
  --test --test-name-pattern='approved palette and icon-only' tests/invitation.test.mjs

'/Users/gyumin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node' \
  --test tests/invitation.test.mjs
```

Expected: the focused test and all Node tests PASS.

- [ ] **Step 5: Verify the mobile rendering**

Serve `index.html` locally and inspect it at 375×812. Confirm the computed `--paper` is `#effeff` and the computed colors of `Wedding Invitation`, `Invitation`, and `Bride & Groom` are identical.

- [ ] **Step 6: Commit**

```bash
git add index.html
git commit -m "style: unify invitation section colors"
```

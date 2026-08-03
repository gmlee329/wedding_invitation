# Elegant Reveal Motion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 청첩장 글씨가 2.4초 동안 천천히 페이드인되며 32px 올라오게 하고, 속도·거리·본문 지연을 `:root` 상단 변수로 직접 조절할 수 있게 한다.

**Architecture:** 기존 CSS reveal 시스템과 JavaScript 초기화 순서는 유지한다. `:root`의 세 CSS 사용자 변수만 모션 수치를 소유하고 헤더·본문 규칙이 이를 공통으로 참조한다.

**Tech Stack:** HTML, CSS custom properties, Node.js `node:test`, 로컬 모바일 브라우저

## Global Constraints

- 기본값은 `--reveal-duration: 2400ms`, `--reveal-distance: 32px`, `--reveal-body-delay: 300ms`다.
- easing은 `ease-in-out`을 사용한다.
- `prefers-reduced-motion: reduce`와 인트로 종료 뒤 reveal 초기화 순서는 유지한다.
- 글꼴, 색상, 레이아웃, 이미지, JavaScript 동작은 변경하지 않는다.
- `assets/video/intro.original.mp4`는 추적하거나 변경하지 않는다.
- 원격 저장소에 푸시하지 않는다.

---

### Task 1: 모션 수치 변수화와 완만한 등장 효과

**Files:**
- Modify: `tests/invitation.test.mjs`
- Modify: `index.html`

**Interfaces:**
- Consumes: 기존 `.has-reveal-motion .reveal` CSS 계약
- Produces: `--reveal-duration`, `--reveal-distance`, `--reveal-body-delay` CSS 사용자 변수

- [ ] **Step 1: 실패하는 회귀 테스트 작성**

`section copy reveals slowly in a stagger and respects reduced motion` 테스트가 다음을 검사하게 바꾼다.

```js
assert.match(html, /--reveal-duration:\s*2400ms;[^\n]*숫자가 클수록 천천히/);
assert.match(html, /--reveal-distance:\s*32px;[^\n]*숫자가 작을수록 차분/);
assert.match(html, /--reveal-body-delay:\s*300ms;[^\n]*숫자가 클수록 늦게/);
assert.match(html, /transition-timing-function:\s*ease-in-out/);
assert.match(html, /transform:\s*translateY\(var\(--reveal-distance\)\)/);
assert.match(html, /transition-duration:\s*var\(--reveal-duration\)/);
assert.match(html, /transition-delay:\s*var\(--reveal-body-delay\)/);
```

- [ ] **Step 2: 테스트가 올바른 이유로 실패하는지 확인**

Run: `/Users/gyumin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node --test --test-name-pattern='section copy reveals slowly' tests/invitation.test.mjs`

Expected: 세 변수가 없고 기존 하드코딩 값을 사용하므로 FAIL.

- [ ] **Step 3: 상단 변수와 한글 안내 주석 추가**

`index.html`의 `:root`에서 `--paper` 다음에 다음 값을 추가한다.

```css
--reveal-duration: 2400ms; /* 글씨 등장 속도: 숫자가 클수록 천천히 나타납니다 */
--reveal-distance: 32px; /* 글씨 상승 거리: 숫자가 작을수록 차분하게 움직입니다 */
--reveal-body-delay: 300ms; /* 본문 시작 간격: 숫자가 클수록 늦게 시작합니다 */
```

- [ ] **Step 4: reveal 규칙이 변수를 사용하게 수정**

공통 easing을 `ease-in-out`으로 바꾸고 헤더·본문의 `transform`과 `transition-duration`, 본문의 `transition-delay`가 세 변수를 참조하게 한다. 기존 `52px`, `44px`, `1600ms`, `1800ms`, `260ms`는 제거한다.

- [ ] **Step 5: 관련 테스트와 전체 테스트 실행**

Run: `/Users/gyumin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node --test tests/invitation.test.mjs`

Expected: 모든 테스트 PASS.

- [ ] **Step 6: 모바일 브라우저에서 실제 계산값과 진행 상태 확인**

375×812 뷰포트에서 인트로 종료 뒤 계산값이 `2.4s`, `32px`, `0.3s`, `ease-in-out`인지 확인한다. 300ms 시점에는 opacity가 0과 1 사이이고 transform이 남아 있어야 하며, 2.8초 뒤에는 opacity 1과 transform `none`이어야 한다.

- [ ] **Step 7: 최종 검증 후 커밋**

Run: `git diff --check && git status --short --branch`

```bash
git add index.html
git commit -m "style: soften invitation reveal motion"
```

`assets/video/intro.original.mp4`는 계속 추적되지 않은 상태로 두고 푸시하지 않는다.

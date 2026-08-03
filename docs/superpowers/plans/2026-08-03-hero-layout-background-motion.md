# 히어로 레이아웃·배경·모바일 모션 구현 계획

> **For Codex:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 첫 화면 제목과 이미지의 겹침·비대칭을 해소하고, A안 배경색과 인트로 종료 뒤 시작하는 느린 모바일 reveal, 교체 가능한 예시 이미지를 적용한다.

**Architecture:** 기존 단일 `index.html` 구조를 유지한다. CSS `--paper`를 배경의 단일 편집 지점으로 만들고, 히어로는 정상 문서 흐름과 동일한 콘텐츠 폭을 사용한다. reveal은 기존 `IntersectionObserver`를 그대로 쓰되 인트로 제거 뒤 한 번만 초기화한다.

**Tech Stack:** HTML, CSS, 바닐라 JavaScript, Node.js `node:test`, Python 테스트, 네이티브 이미지 변환, 로컬 모바일 브라우저 검증

---

## 공통 제약

- `assets/video/intro.original.mp4`는 사용자가 보관 중인 원본이므로 추적하거나 변경하지 않는다.
- 글꼴, 본문 구조, 초록·하늘색 보조 색상, 인트로 영상 재생 로직은 유지한다.
- 새 의존성을 추가하지 않는다.
- 사용자는 직접 푸시하므로 원격 저장소에 푸시하지 않는다.

### Task 1: 정적 회귀 테스트 추가

**Files:**
- Modify: `tests/invitation.test.mjs`

- [ ] **Step 1: 배경·미디어 경로 안내 테스트 작성**

`#f2f8ff`가 `:root --paper`에만 있고 `WEDDING_CONFIG.theme.paper` 및 `applyTheme()` 덮어쓰기가 없는지 검사한다. `WEDDING_CONFIG.media` 근처 주석에 `hero.jpg`, `map.jpg`, `gallery-01.jpg`~`gallery-08.jpg`, 파일명·확장자 변경 안내가 있는지도 검사한다.

- [ ] **Step 2: 히어로 레이아웃 테스트 작성**

`.hero-section .section-header`가 음수 마진 없이 `margin: 0 0 32px`, 가로 패딩 없이 `padding: 30px 0 0`인지 확인한다. 제목 크기 `clamp(1.8rem, 10.5vw, 2.9rem)`, `.hero-media`의 `width: 100%`와 `margin-left: 0`을 검사한다.

- [ ] **Step 3: reveal 지연 초기화와 긴 모션 테스트 작성**

헤더 `52px/1600ms`, 본문 `44px/1800ms/260ms`를 검사한다. `initRevealMotion()`의 일회성 가드와 `removeIntro()` 뒤 초기화, 인트로가 없을 때의 즉시 초기화 계약을 소스 수준에서 고정한다.

- [ ] **Step 4: 관련 테스트가 실패하는지 확인**

Run: `node --test --test-name-pattern='background|media filename|hero title and media|reveal motion waits' tests/invitation.test.mjs`

Expected: 새 기대값과 아직 다른 기존 구현 때문에 FAIL.

- [ ] **Step 5: 테스트만 커밋**

```bash
git add tests/invitation.test.mjs
git commit -m "test: cover hero layout and mobile reveal"
```

### Task 2: 배경·이미지 안내·히어로 레이아웃 구현

**Files:**
- Modify: `index.html`

- [ ] **Step 1: 배경색을 한 곳으로 통합**

`:root`의 `--paper`를 `#f2f8ff`로 바꾸고 바로 옆에 `전체 배경색: 이 값만 변경하세요` 주석을 넣는다. `WEDDING_CONFIG.theme.paper`와 `applyTheme()`의 `--paper` 설정을 제거한다.

- [ ] **Step 2: 미디어 객체에 실제 교체 예시 추가**

상단 `WEDDING_CONFIG.media`를 여러 줄로 펼친다. `hero.jpg`, `map.jpg`, `gallery-01.jpg`부터 `gallery-08.jpg`까지의 저장 이름과, 다른 이름 또는 확장자를 쓰면 해당 `src` 경로도 바꿔야 한다는 예시를 인접 주석으로 기록한다.

- [ ] **Step 3: 히어로를 정상 흐름과 동일 폭으로 수정**

헤더의 음수 아래 마진과 가로 안쪽 여백을 제거하고 32px 아래 간격을 준다. 제목은 한 줄을 유지하면서 콘텐츠 폭을 더 채우도록 확대한다. 메인 이미지는 `width: 100%`, `margin-left: 0`으로 좌우 20px 여백을 동일하게 맞춘다.

- [ ] **Step 4: 관련 테스트 실행**

Run: `node --test --test-name-pattern='background|media filename|hero title and media' tests/invitation.test.mjs`

Expected: PASS.

### Task 3: 모바일 reveal을 인트로 뒤로 지연

**Files:**
- Modify: `index.html`

- [ ] **Step 1: reveal 초기화 일회성 상태 추가**

앱 상태에 `revealMotionInitialized` 불리언을 추가하고 `initRevealMotion()` 첫 부분에서 중복 실행을 막는다.

- [ ] **Step 2: 인트로 제거 뒤 reveal 시작**

`removeIntro()`가 DOM에서 인트로를 제거한 직후 `initRevealMotion()`을 호출한다. 인트로가 비활성화되었거나 생성되지 않은 경우 `init()`에서 즉시 호출한다. 기존 Observer와 reduced-motion 분기는 유지한다.

- [ ] **Step 3: 모션 시간과 이동 거리 확대**

헤더를 `translateY(52px)`/`1600ms`, 본문을 `translateY(44px)`/`1800ms`/`260ms`로 설정한다.

- [ ] **Step 4: reveal 관련 테스트 실행**

Run: `node --test --test-name-pattern='reveal motion waits|section copy reveals slowly' tests/invitation.test.mjs`

Expected: PASS.

### Task 4: 예시 메인 이미지 추가

**Files:**
- Create: `assets/images/hero.jpg`

- [ ] **Step 1: 생성 원본을 JPEG로 변환**

생성된 세로형 웨딩 예시 이미지를 브라우저 호환 JPEG로 변환하여 `assets/images/hero.jpg`에 저장한다. 원본 생성 파일과 기존 미디어는 유지한다.

- [ ] **Step 2: 이미지 무결성 확인**

Run: `file assets/images/hero.jpg && sips -g pixelWidth -g pixelHeight assets/images/hero.jpg`

Expected: JPEG이며 세로 비율과 유효한 픽셀 크기가 표시된다.

- [ ] **Step 3: 이미지 시각 검토**

파일을 직접 열어 텍스트·워터마크가 없고 옅은 하늘빛/세이지 테마에 어울리는지 확인한다.

### Task 5: 브라우저 및 전체 검증

**Files:**
- Verify: `index.html`
- Verify: `assets/images/hero.jpg`
- Verify: `tests/invitation.test.mjs`

- [ ] **Step 1: 전체 자동 테스트 실행**

Run: `node --test tests/invitation.test.mjs`

Run: `python3 -m unittest discover -s tests -p 'test_*.py'`

Expected: 모두 PASS.

- [ ] **Step 2: 모바일 레이아웃 검증**

로컬 서버에서 320×667, 375×667, 375×812 뷰포트를 확인한다. 제목 아래가 이미지 위보다 작거나 같고, 제목/이미지의 좌우 기준선이 히어로 콘텐츠 경계와 일치하며, 문서 가로 넘침이 없어야 한다.

- [ ] **Step 3: 모바일 reveal 시점 검증**

인트로가 있는 동안 히어로가 미리 `is-visible`이 되지 않는지 확인한다. 인트로를 닫은 직후 opacity/transform 전환이 진행되고 약 2.1초 뒤 최종 상태가 되는지 확인한다.

- [ ] **Step 4: 색상·이미지 로드 확인**

계산된 배경색이 `rgb(242, 248, 255)`이고 `hero.jpg`의 `naturalWidth`가 0보다 큰지 확인한다.

- [ ] **Step 5: 최종 정적 검사**

Run: `git diff --check && git status --short`

Expected: 공백 오류 없음. `assets/video/intro.original.mp4`는 계속 추적되지 않은 상태.

- [ ] **Step 6: 구현 커밋**

```bash
git add index.html tests/invitation.test.mjs assets/images/hero.jpg
git commit -m "fix: polish mobile wedding invitation hero"
```

- [ ] **Step 7: 푸시하지 않고 사용자에게 인계**

로컬 커밋, 테스트 결과, 배경 변경 위치, 이미지 파일명 규칙을 보고한다. 원격 푸시는 실행하지 않는다.

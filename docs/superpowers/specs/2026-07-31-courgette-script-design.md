# Courgette 필기체 적용 디자인

## 목표

인트로의 `Gyumin & Sara`와 첫 본문 화면의 `Happily Ever After`를 현재 Allura보다 가독성이 좋은 Courgette로 바꾼다.

## 적용 범위

- Google Fonts에서 Allura 대신 Courgette를 불러온다.
- `.intro-name`의 글꼴을 `'Courgette', cursive`로 바꾼다.
- `.hero-section .section-title`의 글꼴을 `'Courgette', cursive`로 바꾼다.
- `Happily Ever After`는 모바일에서도 한 줄로 표시한다.

## 유지 범위

- 두 문구의 글자 크기, 굵기, 자간과 행간을 유지한다.
- 히어로 제목에는 `white-space: nowrap`만 추가하고, 현재 폭과 글자 크기는 그대로 둔다.
- 현재 초록·하늘색 테마와 모든 색상을 유지한다.
- 인트로 전환, 영상 자동·수동 재생과 본문 등장 모션을 유지한다.
- 나머지 Georgia, 시스템 한글 글꼴과 모든 본문 타이포그래피를 유지한다.
- 레이아웃, 여백, 모서리와 미디어 파일을 변경하지 않는다.

## 로딩과 대체 글꼴

- 기존과 동일하게 Google Fonts CSS 한 개만 사용한다.
- 네트워크에서 Courgette를 불러오지 못하면 브라우저의 `cursive` 대체 글꼴을 사용한다.
- 별도 JavaScript나 추가 폰트 파일은 넣지 않는다.

## 검증

- 테스트에서 외부 스타일시트가 Courgette 한 개만 요청하는지 확인한다.
- 두 대상 선택자가 Courgette를 쓰고 Allura 참조가 남지 않았는지 확인한다.
- 기존 글자 크기와 레이아웃 선언이 그대로인지 확인한다.
- iPhone 11 Pro 크기에서 두 문구의 판독성, 히어로 제목의 한 줄 표시와 화면 넘침을 확인한다.
- 전체 웹·영상 테스트와 영상 디코딩을 실행한 뒤 `main`에 푸시한다.

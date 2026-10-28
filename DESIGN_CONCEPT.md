# Good Measure — agency concept

로컬 미리보기: `/studio.html` (`npm start` 실행 후 기본 포트 3100).

기존 AI 검색 페이지는 `/`에 유지됩니다. 이번 작업은 별도의 개인 브랜드 디자인 시안이며 GitHub 푸시나 운영 배포는 실행하지 않았습니다.

Good Measure의 새 슬로건은 **Good ideas. Better made. / 충분히 생각하고, 제대로 만듭니다.**입니다. 기존 Hummman 소개 문구와 로고를 교체했습니다. 갤러리의 기존 프로젝트는 참고 사례로 명확히 표시했습니다.

재사용 가능한 디자인 기준은 `/design-system.html`과 `design/README.md`에 있습니다. BeyondC·IDhair의 실제 Figma 측정 결과는 `design/FIGMA_FINDINGS.md`, 코드 기준 원본은 `design/tokens.json`입니다.

## 방향

- elespacio의 여유 있는 크림색 바탕과 큰 타이포그래피, think thing thank의 실험적인 그래픽과 절제된 구성을 참고했습니다. 두 사이트의 코드나 이미지를 복제하지 않았습니다.
- 크림 / 잉크 블랙 / 라임 / 핑크 색상, 큰 헤드라인, 직접 제작한 회전 메탈릭 SVG, 비대칭 프로젝트 갤러리로 구성했습니다.
- 실제 공개 Prismic 작업 이미지 4개를 사용했습니다. 제목과 서비스는 실제 프로젝트 데이터에 근거하며, 상세 링크는 조회 당시 기존 사이트 순서에 맞췄습니다. CMS 재정렬 후에는 링크 확인이 필요합니다.
- 서비스 소개와 브랜드 문구는 시안용 제안입니다. 실적 수치나 후기는 만들지 않았습니다.

## 인터랙션

프로젝트 필터, 서비스 아코디언, 모바일 메뉴, 서울 시간 표시, 문의 모달 및 브리프 생성/복사. 문의 모달은 입력 내용을 외부로 전송하지 않습니다. AI 검색은 기존 페이지 링크로 연결합니다.

모바일용 레이아웃과 키보드 포커스, reduced-motion 스타일을 포함했습니다. 데스크톱 브라우저에서 렌더링, 프로젝트 필터, 서비스 펼침, 모달 열기와 브리프 생성을 검증했습니다.

## 자산

- `public/concept/chrome.svg`: 이번 시안을 위해 직접 작성한 벡터 그래픽.
- 프로젝트 이미지: 공개 `hummman-pt` Prismic 데이터의 썸네일. 원본 프로젝트에 대한 권리는 해당 권리자에게 있습니다.
- Manrope 폰트: Google Fonts, SIL Open Font License. https://github.com/sharanda/manrope

레퍼런스: https://www.elespacio.net/services/content-social-media / https://thinkthingthank.com/

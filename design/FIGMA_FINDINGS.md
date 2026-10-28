# BeyondC / IDhair — 실제 원본 분석

원본 파일을 읽기 전용으로 조사했습니다. 원본 Figma 및 기존 프로젝트는 수정하지 않았습니다. 노드·스타일 단위의 전체 측정 결과는 `figma-audit.json`에 있습니다.

## 공통 패턴

| 항목 | BeyondC | IDhair | Good Measure 적용 기준 |
| --- | --- | --- | --- |
| 데스크톱 프레임 | 1560×900 | 1560×900 및 긴 페이지 | 기준 프레임 1560, 콘텐츠 최대 1440 |
| 데스크톱 그리드 | 12열 ×120px, 열 사이 0 | 12열 ×120px, 열 사이 0 | 구조 12열, 컴포넌트 내부 간격은 별도 |
| 데스크톱 좌우 | (1560−1440)÷2=60px | 실제 x=60px 정렬 | 최대 콘텐츠 1440, 기준 좌우 60 |
| 모바일 프레임 | 360×720 | 360×720 및 긴 페이지 | 최소 360px 및 390px 검토 |
| 모바일 좌우 | 그리드 offset 20px | 그리드 offset 20px | 20px |
| 모바일 그리드 | 12열 stretch | 12열 stretch | 12열 유지, 카드 한 개는 전체 열 사용 |
| 본문 스타일 | 14 /16px, 행간150% | 14 /16px 170%, 18px 160% | 기본16/175%, 보조14/150% 이상 |
| 제목 스타일 | 28 /40 /60 /110px | 32 /40 /48 /96 /128 /160 /200px | 본문과 분리한 역할별 램프; 히어로48~160 |
| 로컬 변수 | 없음 | BG/Primary 컬러 1개 | 간격·타입·색상·레이아웃 의미 토큰 (공통 파일로 관리) |

## 근거 노드

- [BeyondC 데스크톱](https://www.figma.com/design/Fdq674dwprOqUGM6zygiUZ/?node-id=5202-639): 1560×900, 12열×120px 그리드. 주요 그룹 x=60, width=1440.
- [BeyondC 모바일](https://www.figma.com/design/Fdq674dwprOqUGM6zygiUZ/?node-id=5319-4009): 360×720, offset20 그리드. 제목40px, 본문12px. 작은 본문값은 신규 기준에서 상향 제안.
- [BeyondC 축소 규칙 메모](https://www.figma.com/design/Fdq674dwprOqUGM6zygiUZ/?node-id=5441-1773): `120→60, 80→40, 60→32, 48→24, 40→20, 32→16, 24→14, 20→12, 16→10, 12→8, 8→6`.
- [IDhair 사용자가 지정한 제목](https://www.figma.com/design/WzbAnebUfAPtlHBhq6i3sl/?node-id=169-913): ID MAGAZINE, 160px, 텍스트 영역1018×176. 상위 페이지1560px의 x=60에 배치.
- [IDhair 모바일 갤러리](https://www.figma.com/design/WzbAnebUfAPtlHBhq6i3sl/?node-id=169-1015): 360px, 그리드 여백20px. 타이틀48px, 컬렉션 제목40px. 갤러리 이미지 폭266px은 해당 화면의 표현값이며 전체 페이지 콘텐츠 폭으로 일반화하지 않음.
- [IDhair 타이포 보드](https://www.figma.com/design/WzbAnebUfAPtlHBhq6i3sl/?node-id=89-111): Body/Head/Display/Caption 역할과 Regular/SemiBold 구분.

## 간격 빈도 해석

- BeyondC Auto Layout 444개: gap10(245회), 20(57), 40(48), 8(40), 4(39). padding 상하4/좌우20 형태169회.
- IDhair Page1 Auto Layout556개: gap10(146), 8(118), 4(77), 12(51), 20(39). About 페이지161개에서는20(40),40(27),12(21)이 반복됩니다.
- 반복 화면과 상태, 폰트 보드가 포함된 빈도이므로 중요도나 유일한 기준으로 사용하지 않습니다. 각 노드의 visible 속성을 기준으로 수집했으며 상위 프레임의 숨김 상태·화면 밖 위치를 별도 필터링한 통계는 아닙니다.
- 원본은 **4px와10px 계열이 섞인 체계**입니다. 신규 프로젝트는 유지보수를 위해 4px 계열을 기본으로 하고, 원본의10px은12px으로 합칩니다. 이는 추출된 사실이 아니라 명시적인 신규 결정입니다.
- 원본의 큰 간격120/80/60은 모바일60/40/32로 줄이는 경향을 재사용합니다. 모든 값을 절반으로 만드는 규칙은 아닙니다.

## 폰트 적용 범위

BeyondC는 Helvetica Now Display + Google Sans Code, IDhair는 Pretendard Variable + GT Walsheim Trial + Apparel을 사용합니다. 이것은 프로젝트별 표현입니다. Good Measure는 기존 오픈소스 Manrope와 시스템 한국어 대체 글꼴을 유지하며 타이포의 **역할과 크기 체계**를 재사용합니다. 원본의 상용·Trial 폰트를 복사하거나 사용 권한이 있다고 가정하지 않았습니다.

## 실무 결정

1. 목적에 맞는 본문 크기를 먼저 고정합니다. 모바일 본문까지 vw로 축소하지 않습니다.
2. 구조 그리드와 컴포넌트 gap을 혼동하지 않습니다. 원본의12열 gutter0이 카드 사이 여백0이라는 뜻은 아닙니다.
3. 히어로·세리프·오브젝트는 프로젝트의 개성으로 두고, 여백·본문·버튼·메타의 반복 규칙을 공통화합니다.
4. CSS 원본은 `tokens.json`, Figma는 대응되는 변수·텍스트 스타일을 사용하는 것을 목표로 합니다. 이번에는 원본 Figma에 새 변수를 생성하거나 수정하지 않았습니다.

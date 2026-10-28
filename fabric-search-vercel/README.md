# 차트함 원단 AI 검색 — Vercel 테스트 배포용

전달한 `index.html`에서 원단668개를 분리하고 기존 검색창·표·초기화 화면을 유지했습니다. 원본 `index.html`, `style.css`, `template.html`은 수정하지 않았습니다.

AI 호출은 서버 전용입니다. 방문자는 키를 입력하지 않습니다. 키를 HTML이나 브라우저 저장소에 넣지 않고 Vercel 환경변수로 관리합니다. 기존 Claude 전용 연결과 브라우저 직접 Gemini 연결은 제거했습니다. 원단 목록은 화면 표시를 위해 `/api/catalog`로 제공되므로 이 테스트 주소에 접근하는 사람은 전체 목록을 조회할 수 있습니다.

## Vercel에 올리기

이 폴더의 **내용 전체**를 별도 GitHub 저장소에 올리고 Vercel에서 Import하세요. 기존 포트폴리오 검색 저장소를 덮어쓸 필요는 없습니다.

| 설정 | 값 |
| --- | --- |
| Application / Framework Preset | Other |
| Root Directory | 이 폴더가 저장소 루트라면 `./` |
| Build Command | 비워두기 |
| Output Directory | public |
| Install Command | npm install |
| Node.js | 22.x |

`api/index.js`, `lib/`, `data/`, `public/`, `package.json`, `vercel.json`을 함께 올려야 합니다. `index.html`만 올리면 서버 AI 검색이 동작하지 않습니다. 현재 작업공간의 상위 저장소를 사용하는 경우 Root Directory는 `fabric-search-vercel`입니다. 이 작업은 어느 저장소에도 자동 업로드하지 않았습니다.

Environment Variables에 다음 값을 추가합니다. Production과 필요한 Preview 환경을 선택하세요.

```dotenv
GEMINI_API_KEY=본인의_키
GEMINI_MODEL=gemini-3.5-flash-lite
MAX_CALLS=30
```

모델명 끝의 `lite`까지 정확하게 입력하세요. 키는 본인의 Google AI Studio에서 복사하고 `.env.example`에는 입력하지 마세요. 환경변수를 저장·변경한 다음에는 **Redeploy**가 필요합니다. `PORT`나 시작 명령은 Vercel에 입력하지 않습니다.

기본 모델은 이전 포트폴리오 검색에서 사용한 모델이며 환경변수로 교체할 수 있습니다. 현재 계정에서의 모델 접근 및 무료 등급·할당량은 Google AI Studio에서 확인하세요. 결제가 연결된 프로젝트에서는 API 사용료가 발생할 수 있습니다. 이 앱은 자동으로 모델을 전환하거나 재시도하지 않습니다.

## 로컬 확인

Node.js22 이상에서 이 폴더를 열고 실행합니다. 별도 패키지 의존성이 없습니다.

```powershell
Copy-Item .env.example .env
# .env의 GEMINI_API_KEY에 키를 입력하고 저장
npm start
```

<http://127.0.0.1:3300>에서 확인합니다. 키가 없어도 전체 표와 초기화 및 설정 안내를 확인할 수 있습니다. AI 요청은 검색 버튼을 누를 때만 전송합니다.

## 처리 흐름과 한계

1. 서버가 원본668개를 읽습니다. 검색 사전과 후보 좁히기는 원본 HTML의 규칙을 재사용했습니다.
2. 기존 규칙으로1~200개 후보가 나오면 해당 후보를, 그 외에는 전체 목록을 Gemini에 전달합니다. 전체 목록을 보내면 입력 토큰이 많을 수 있으므로 구체적인 조건부터 시험하세요.
3. 모델이 최대6개 ART NO.·추천 이유·원문 근거를 JSON으로 반환합니다. 서버가 실제 품번, 중복, 개수, 원문 인용과 기존 파서가 인식한 명시적 조건을 검증합니다.
4. 표의 품명·폭·중량·가공 등은 모델이 생성한 값을 사용하지 않고 원본 레코드에서 가져옵니다.

데이터에 없는 용도·촉감·계절·컬러·가격·재고는 추측하지 않도록 지시합니다. 원문 인용을 검증해도 모델의 모든 해석을 보장하지는 않습니다. 기존 숫자·약어 파서의 의미와 한계도 그대로 유지했습니다.

질문1~500자, 요청4KB, AI 요청60초, 출력4096토큰, 인스턴스당 분당5회·동시1개·기본총30회 제한입니다. Vercel은 여러 인스턴스를 만들 수 있으므로 이 제한과 사용량 표시는 엄격한 전체 한도나 누적 통계가 아닙니다. 메모리 값은 재시작·재배포 시 초기화될 수 있습니다. 타임아웃 등으로 API 사용량 응답을 받지 못한 호출은 토큰 합계에 포함되지 않을 수 있습니다.

## 검증

```powershell
npm test
```

테스트는 원본 보존, 검색 조건, 허위 품번·중복·근거 검증, Gemini 모의 응답, 오류 구분, HTTPS 처리, 키 미설정 및 정적 자산 제공을 검사합니다. 실제 Gemini 호출이나 유료 테스트는 실행하지 않았습니다. Vercel의 실제 배포는 사용자 계정에서 진행한 뒤 배포 주소로 확인해야 합니다.

추천 테스트 질문: `100g 이하 발수 원단`, `나일론`, `75D 타슬란`, `재고 있는 원단`(재고 데이터 없음 안내 확인).

## 데이터 갱신

`data/fabrics.json`을 같은 필드 구조의 배열로 교체하고 테스트 후 재배포합니다. 현재 원본은 ART NO.가 모두 고유합니다. 중복 품번이 생기면 별도 행 ID로 추천하도록 변경해야 합니다.

참고: [Vercel Node.js Functions](https://vercel.com/docs/functions/runtimes/node-js), [Gemini 구조화 응답](https://ai.google.dev/gemini-api/docs/structured-output).

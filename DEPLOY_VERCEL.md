# Vercel 테스트 배포

1. Vercel에서 **Add New → Project**를 선택하고 `Gazelle92/ai_search` 저장소를 Import합니다.
2. Framework Preset은 **Other**, Root Directory는 저장소 루트(`./`)를 사용합니다.
3. Build Command는 비워두고, Output Directory는 `public`, Install Command는 `npm ci`를 사용합니다. 실행 명령 `npm start`는 입력하지 않습니다. API는 Vercel Function으로 실행합니다.
4. Environment Variables에 아래 값을 추가합니다. 키 값은 로컬 `.env`에서 직접 복사하고 GitHub에 올리지 마세요.

| 이름 | 값 |
| --- | --- |
| GEMINI_API_KEY | 본인의 Gemini 키 |
| GEMINI_MODEL | gemini-3.5-flash-lite |
| MAX_CALLS | 30 |

Production 및 필요한 Preview 환경을 선택한 뒤 Deploy합니다. 환경변수를 나중에 변경하면 Redeploy가 필요합니다. `PORT` 설정은 필요하지 않습니다.

## 배포 확인

- 발급된 HTTPS 주소에서 입력 화면이 보이는지 확인합니다.
- 공개 데이터 목록 조회가 되는지 확인합니다.
- `게임 회사 홈페이지 사례 있어?`로 검색해 결과와 상세 링크를 확인합니다.
- 403이면 GitHub 최신 커밋으로 배포됐는지 확인합니다. 이번 수정에 HTTPS 요청 처리가 포함되어 있습니다.
- 503 및 호출 한도는 Vercel 함수 Logs와 Gemini AI Studio의 한도를 확인합니다. 로그나 화면에 키를 붙이지 마세요.

## 테스트 공개 범위

현재 앱에는 비밀번호가 없습니다. 주소를 아는 사람은 검색할 수 있습니다. 소수 테스트에 사용하고 Gemini 프로젝트의 무료 등급 및 한도를 확인하세요.

`MAX_CALLS`, 분당 제한, 사용량 표시는 **Vercel 함수 인스턴스별 메모리 값**입니다. 여러 인스턴스에 걸친 전체 한도·누적 통계가 아니며, 재시작 시 초기화됩니다. 엄격한 전체 사용량 제한이 필요하면 공유 저장소 또는 Gemini 측 할당량으로 관리해야 합니다.

Vercel 계정에서 배포 보호를 설정했다면 다른 사람도 접근할 수 있는 설정인지 확인하세요. 이 프로젝트는 Vercel 계정 설정이나 결제 설정을 자동 변경하지 않습니다.

로컬 실행은 기존대로 `npm start`를 사용합니다. 기존 Hummman 사이트와 CMS는 수정하지 않습니다.

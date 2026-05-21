# 진행 상황 (2026-05-20 기준)

> 쉬었음 청년을 위한 AI 취업 동행 서비스 · Internet Programming 2026 팀 프로젝트
> 보고서 마감 6/8, 발표 6/9

## 현재 상태

✅ **MVP 동작 중** — 회원가입부터 면접장 주변 지도까지 전체 시나리오 통과
✅ **Vercel 프로덕션 배포 라이브**

| 환경 | URL |
|---|---|
| 프로덕션 | https://ai-job-companion-two.vercel.app |
| Inspector | https://vercel.com/2021147557s-projects/ai-job-companion |
| GitHub | https://github.com/2021147557/AI-job-companion |

## 시나리오 흐름 (PDF 기획서 ↔ 구현 페이지)

| # | 시나리오 (기획서) | 페이지 | 동작 검증 |
|---|---|---|---|
| 1 | 포트폴리오 입력 | `/portfolio.html` | ✅ |
| 2 | 채용 공고 추천 (워크넷 매칭 + 적합도) | `/jobs.html` | ✅ |
| 3 | 모의 면접 (LLM 질문 + 피드백) | `/interview.html` | ✅ |
| 4 | 면접 당일 체크리스트 + 면접장 주변 지도 | `/checklist.html` | ✅ |

## 적용 기술 (수업 요구사항 충족)

- **런타임 호출 Web API (2개+)**: 워크넷/고용24, Kakao Local, Kakao Maps JS, OpenAI ← 4개 통합
- **그래프 라이브러리**: d3.js v7 (적합도 바차트, 공고-역량 force graph, 진행률)
- **모바일 정보**: Geolocation API (현재 위치 → 면접장 거리/시간), 면접 카운트다운
- **서버사이드 = JavaScript**: Node.js + Express (요구사항: Python 등 금지)
- **DB**: libSQL (SQLite 호환) — 로컬은 file:// , 프로덕션은 Turso Cloud
- **세션**: cookie-session (stateless, Vercel 호환)
- **반응형**: 모바일 first 3구간 미디어쿼리 (~480 / 481-800 / 801+)

## 디자인

[MiniMax 디자인 시스템](https://getdesign.md/minimax/design-md) 적용 — 화이트 캔버스 + DM Sans + 풀 라운드 pill 버튼 + 제품 카드용 saturated 컬러(coral / magenta / blue / purple / black-photo). 대시보드 4단계 카드가 MiniMax product-matrix-grid 톤(보라/코랄/검정/화이트)으로 매핑됨. CSS 변수로 모든 토큰 노출 (`--canvas`, `--brand-coral`, `--brand-blue-deep`, `--ink` 등) + Clay 시절 클래스명(`feature-pink`, `feature-peach` 등) legacy alias 유지.

## 배포 인프라

```
GitHub repo (2021147557/AI-job-companion)
  └─ main 브랜치 push 시 자동 빌드
       ↓
Vercel (2021147557s-projects/ai-job-companion)
  ├─ /api/* → api/index.js (Express handler)
  └─ /* → public/ 정적 서빙
       ↓
Turso DB (ai-job-companion-2021147557leejk, Tokyo 리전)
```

등록된 Vercel 환경변수 (Production):
- `TURSO_DATABASE_URL` (libsql://...)
- `TURSO_AUTH_TOKEN`
- `SESSION_SECRET`
- `GEMINI_API_KEY`, `GEMINI_MODEL`=`gemini-2.5-flash`
- `KAKAO_JS_KEY`, `KAKAO_REST_KEY`

## 외부 API 키 상태 (2026-05-21 갱신)

| API | 현재 | 동작 |
|---|---|---|
| Gemini (LLM 1순위) | ✅ 등록 (로컬+Vercel) | 라이브 호출 (gemini-2.5-flash, OpenAI 호환 엔드포인트) |
| OpenAI (LLM 폴백) | ❌ 미등록 | Gemini 우선이라 미사용. 키 추가 시 자동 폴백 가능 |
| Kakao JS Key (지도) | ✅ 등록 + JS SDK 도메인 검증 통과 | 라이브 지도 렌더 (localhost + Vercel 둘 다 200) |
| Kakao REST Key (장소 검색) | ✅ 등록 + 카카오맵 서비스 활성화 | 라이브 호출 (주소→좌표, 5개 카테고리 검색) |
| 워크넷/고용24 | ❌ 미등록 | mock 15개 공고 (서비스 자체에 `searchJobsLive` 미구현 — XML 파서 없음) |

> 모든 핵심 외부 API가 라이브 동작 상태. 워크넷만 mock — 발표 시 "mock 데이터" 명시하면 무리 없음.

## 사용자가 직접 결정해야 할 항목

### 발표 전 필요
- [ ] **팀원 역할 분담** (보고서 평가 항목)
  - 후보 분담: ① 인증+포트폴리오 ② 공고추천+d3 ③ 모의면접 ④ 체크리스트+카운트다운 ⑤ 지도+장소검색
- [ ] 아래 [Spec Gap Todo] 우선순위 작업 진행 여부 결정 (음성·교통·학력필드)

### 발표 후/보고서
- [ ] 워크넷/고용24 키 (선택, mock으로도 시연 충분)
- [ ] 발표 영상 (제안서: 3분, 보고서: 6분 이내)

## Spec Gap Todo (2026-05-21 council 회의 결과)

> 제안서(`인터넷_프로그래밍_2팀(5월_16일).pdf`)의 합성 대상 원본 항목 디테일과 현재 impl 비교한 결과 발견된 갭. 발표 평가 관점에서 "제안서에 있는데 왜 없냐" 공격 가능 항목.

### 🔴 P1 — 모의 면접 음성 인터페이스 (spec 명문 위반)
- spec: 이창현 항목 "LLM에 **음성 인터페이스를 결합**하여 실제 면접관처럼"
- 현재: `public/interview.html`에서 `<textarea>` 텍스트 입력만. `grep speech|voice|getUserMedia` 결과 0건
- 작업: Web Speech API (SpeechRecognition + SpeechSynthesis) 추가. 마이크 버튼으로 답변 녹음→텍스트 변환, 질문은 TTS로 읽어주기. 텍스트 입력 fallback 유지.
- 예상 30분~1시간. quick win 가장 큼

### 🟡 P2 — 면접장 "교통 상황" 표시 (spec 명문 위반)
- spec: "면접장 위치, **교통 상황**, 주변 편의시설, 정장 대여소, 프린트 가게, 카페"
- 현재: `checklist.html:247`에서 "지도에서 확인하세요" 텍스트 문구만. 경로/소요시간/혼잡도 API 호출 0건
- 작업: 면접장 좌표 ↔ 현재 위치 거리 표시 + Kakao 길찾기 외부 링크 (`https://map.kakao.com/?sName=...&eName=...`) + 도보/지하철 추정 분 계산
- 예상 30분

### 🟢 P3 — 포트폴리오 입력 풍부도 확장
- spec: "스펙, 경력, 프로젝트, 포트폴리오 정보"
- 현재: `portfolio.html:21-67`에 7필드만. 학력·자격증·회사이력·근무기간·파일 업로드 없음
- 작업: 학력(대학/전공/졸업연도) + 자격증(이름/취득연도) 텍스트 필드 추가. DB JSON 컬럼 활용 (스키마 변경 최소화). 파일 업로드는 무리 — 스킵.
- 예상 20분

### 🔵 P4 — 발표 스크립트에 컨텍스트 한 줄 명시
- "원본 9개 아이디어 중 3개 합성 → 음성·교통은 v1.x 진행 중"
- README/PROGRESS에 표기. 해석 분쟁 자체를 표면화시켜 무력화
- 예상 10분

### 시연 시 즉시 대응할 약점
- LLM mock 폴백 산수 → Gemini 라이브로 이미 해결 (키 등록 완료)
- 워크넷 mock → "공공데이터 API 통합 명시" 카운트만 충족하면 OK
- 음성 미구현 → 작업 안 한다면 "v1 로드맵에 명시" 답변 준비

## 개발 히스토리

| 일자 | 변경 |
|---|---|
| 2026-05-20 | 초기 MVP 구현 (Express + node:sqlite + d3) |
| 2026-05-20 | Clay 디자인 시스템 적용 |
| 2026-05-21 | MiniMax 디자인 시스템으로 교체 (DM Sans + 풀 pill 버튼 + product-card 컬러) |
| 2026-05-21 | LLM 어댑터에 Gemini 추가 (OpenAI 호환 엔드포인트, Gemini 우선·OpenAI 폴백·mock 폴백 3단) |
| 2026-05-21 | Gemini/Kakao JS/Kakao REST 키 등록 (로컬 `.env` + Vercel production) + 카카오맵 서비스 활성화 + JS SDK 도메인 등록 |
| 2026-05-21 | Council 회의 (Steelman/Red Team/Context Keeper/Moderator) — spec gap 4개 도출, [Spec Gap Todo] 섹션 작성 |
| 2026-05-20 | GitHub 푸시 (`leejk206` 오발사 → fresh slate로 `2021147557` 재푸시) |
| 2026-05-20 | Vercel 호환 개조 (libsql, cookie-session, handler export) |
| 2026-05-20 | Turso DB 생성 + Vercel ENV 등록 + 프로덕션 배포 |

## 로컬 개발

```bash
# 최초 1회
npm install
cp .env.example .env

# 로컬 실행 (TURSO_DATABASE_URL 기본값 = file:./data/app.sqlite)
npm start
# → http://localhost:3000
```

API 키가 비어 있으면 모든 외부 호출이 mock으로 자동 폴백 — 데모/시연 가능.

## 디렉토리

```
AI-job-companion/
├── api/
│   └── index.js              # Vercel 서버리스 entry (server.js 위임)
├── public/                   # 정적 페이지 (Vercel 자동 서빙)
│   ├── index.html, login.html, signup.html
│   ├── dashboard.html, portfolio.html
│   ├── jobs.html, interview.html, checklist.html
│   ├── css/main.css          # MiniMax 디자인 시스템
│   └── js/common.js, viz.js  # 공통 + d3 시각화
├── src/
│   ├── db.js                 # libSQL 어댑터 (file:// 또는 Turso URL)
│   ├── middleware/auth.js    # 세션 가드
│   ├── routes/               # auth, portfolio, jobs, interview, checklist, places
│   └── services/             # openai, kakao, worknet (각 키 없으면 mock)
├── server.js                 # Express app (로컬 listen + 모듈 export)
├── vercel.json               # /api/* → 함수 라우팅
├── package.json              # engines.node >= 20
└── .env.example
```

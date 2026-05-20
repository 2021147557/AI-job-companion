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

[Clay 디자인 시스템](https://getdesign.md/clay/design-md) 적용 — Clay.com 의 cream canvas + saturated 6-color feature card 톤. CSS 변수로 모든 토큰 노출 (`--canvas`, `--brand-pink`, `--ink` 등).

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

## 외부 API 키 상태

| API | 현재 | 동작 |
|---|---|---|
| OpenAI | ❌ 미등록 | 결정론적 mock (스킬 매칭 % 기반 추천, 템플릿 면접 질문, 휴리스틱 피드백) |
| Kakao JS Key (지도) | ❌ 미등록 | 지도 자리에 안내 박스 — 좌표/거리 정보는 정상 |
| Kakao REST Key (장소 검색) | ❌ 미등록 | mock 장소 데이터 (브랜드명+거리 자동 생성) |
| 워크넷/고용24 | ❌ 미등록 | mock 15개 공고 (직무/지역/기술 다양) |

> 발표 영상 찍기 전 **Kakao JS Key는 꼭 등록** 권장 — 실제 지도가 마커로 움직여야 모바일 매시업 핵심 어필 가능.

## 사용자가 직접 결정해야 할 항목

### 발표 전 필요
- [ ] **Kakao JS Key 발급 + 등록** (developers.kakao.com, 5분, 무료, 도메인 등록 시 `https://ai-job-companion-two.vercel.app` 추가)
- [ ] **OpenAI API 키 등록** (시연 시 LLM 호출이 실제 작동하면 가산점) — 선택이지만 권장
- [ ] **팀원 역할 분담** (보고서 평가 항목)
  - 후보 분담: ① 인증+포트폴리오 ② 공고추천+d3 ③ 모의면접 ④ 체크리스트+카운트다운 ⑤ 지도+장소검색

### 발표 후/보고서
- [ ] 워크넷/고용24 키 (선택, mock으로도 시연 충분)
- [ ] 발표 영상 (제안서: 3분, 보고서: 6분 이내)

## 개발 히스토리

| 일자 | 변경 |
|---|---|
| 2026-05-20 | 초기 MVP 구현 (Express + node:sqlite + d3) |
| 2026-05-20 | Clay 디자인 시스템 적용 |
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
│   ├── css/main.css          # Clay 디자인 시스템
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

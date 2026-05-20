# 쉬었음 청년을 위한 AI 취업 동행 서비스

Internet Programming 팀 프로젝트 (2026).
포트폴리오 분석 → 채용 공고 추천 → 모의 면접 → 면접 당일 체크리스트 → 면접장 주변 지도까지 이어지는 모바일 매시업 서비스.

## 빠르게 실행

```bash
cd AI-job-companion
npm install
cp .env.example .env   # 필요시 API 키 채우기
npm start              # http://localhost:3000
```

API 키가 비어 있으면 자동으로 mock 응답으로 동작한다. 데모/시연용으로 그대로 사용 가능.

## 매시업 구성

- 런타임 호출 Web API (2개 이상)
  - 워크넷/고용24 채용정보 API (공공데이터포털) — 채용 공고
  - Kakao Local API — 좌표 변환 + 주변 편의시설 검색
  - Kakao Maps JS API — 지도 렌더링
  - OpenAI API — 포트폴리오/공고 매칭 분석, 모의 면접, 체크리스트 생성
- 그래프 라이브러리: d3.js (공고-역량 매칭 그래프, 적합도 비교, 진행률 시각화)
- 모바일 정보: Geolocation API (현재 위치 → 면접장까지 거리/시간 계산)

## 디렉토리

```
src/
  db.js            SQLite 초기화 + 스키마
  routes/          Express 라우터
  services/        외부 API 어댑터 (키 없으면 mock)
  middleware/      세션 인증
public/            모바일 first 정적 페이지 + d3 시각화
data/              SQLite 파일 (런타임 생성)
```

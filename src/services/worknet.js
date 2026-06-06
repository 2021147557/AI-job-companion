/* =========================================================
   워크넷/고용24 채용정보 API 어댑터
   - 실제 API: 공공데이터포털 인증키 사용 (XML)
   - 키가 없으면 결정적 mock 공고 반환
   ========================================================= */

let XMLParser;

function getXmlParser() {
  if (!XMLParser) {
    ({ XMLParser } = require('fast-xml-parser'));
  }

  return XMLParser;
}

const MOCK_JOBS = [
    {
        key: 'wn-2026-001',
        title: '프론트엔드 개발자 (React)',
        company: '(주)코드라이즈',
        role: '프론트엔드 개발자',
        skills: ['JavaScript', 'React', 'TypeScript', 'HTML', 'CSS', 'Webpack'],
        preferred: ['Next.js', 'Storybook', 'CI/CD'],
        career: '신입',
        education: '학력무관',
        employmentType: '정규직',
        region: '서울 강남구',
        address: '서울특별시 강남구 테헤란로 145',
        deadline: '2026-06-15',
        url: 'https://www.work24.go.kr/wk/a/b/1500/wantedDtl.do?wantedId=wn-2026-001',
        summary: 'B2B SaaS 대시보드 프론트엔드. React + TS 기반 컴포넌트 개발과 디자인 시스템 구축.'
    },
    {
        key: 'wn-2026-002',
        title: '백엔드 개발자 (Node.js)',
        company: '브릭스랩',
        role: '백엔드 개발자',
        skills: ['Node.js', 'Express', 'PostgreSQL', 'AWS', 'Docker', 'REST API'],
        preferred: ['Kubernetes', 'Redis', 'GraphQL'],
        career: '신입~3년',
        education: '학력무관',
        employmentType: '정규직',
        region: '서울 성동구',
        address: '서울특별시 성동구 성수이로 113',
        deadline: '2026-06-10',
        url: 'https://www.work24.go.kr/wk/a/b/1500/wantedDtl.do?wantedId=wn-2026-002',
        summary: '실시간 결제 정산 시스템의 백엔드. Node.js + PostgreSQL 기반 API 설계 및 운영.'
    },
    {
        key: 'wn-2026-003',
        title: '풀스택 주니어 개발자',
        company: '플랜티드',
        role: '풀스택 개발자',
        skills: ['JavaScript', 'TypeScript', 'React', 'Node.js', 'MongoDB'],
        preferred: ['AWS', 'Figma', 'Jest'],
        career: '신입',
        education: '학력무관',
        employmentType: '정규직',
        region: '서울 마포구',
        address: '서울특별시 마포구 양화로 45',
        deadline: '2026-06-20',
        url: 'https://www.work24.go.kr/wk/a/b/1500/wantedDtl.do?wantedId=wn-2026-003',
        summary: '시드 단계 푸드테크 스타트업. 웹/모바일 풀스택으로 신규 기능 빠르게 출시.'
    },
    {
        key: 'wn-2026-004',
        title: '데이터 분석가 (주니어)',
        company: '루멘데이터',
        role: '데이터 분석가',
        skills: ['SQL', 'Python', 'pandas', 'Tableau', '통계'],
        preferred: ['BigQuery', 'A/B 테스트', 'Looker'],
        career: '신입',
        education: '대졸 이상',
        employmentType: '정규직',
        region: '서울 강남구',
        address: '서울특별시 강남구 강남대로 396',
        deadline: '2026-06-18',
        url: 'https://www.work24.go.kr/wk/a/b/1500/wantedDtl.do?wantedId=wn-2026-004',
        summary: '커머스 데이터 분석. SQL/Python으로 유저 행동 분석과 비즈니스 인사이트 도출.'
    },
    {
        key: 'wn-2026-005',
        title: 'AI/ML 엔지니어 (NLP)',
        company: '뉴럴웍스',
        role: 'AI/ML 엔지니어',
        skills: ['Python', 'PyTorch', 'NLP', 'Transformers', 'Linux'],
        preferred: ['LLM 파인튜닝', 'CUDA', 'MLOps'],
        career: '신입~경력',
        education: '대졸 이상',
        employmentType: '정규직',
        region: '경기 성남시 분당구',
        address: '경기도 성남시 분당구 판교로 235',
        deadline: '2026-06-25',
        url: 'https://www.work24.go.kr/wk/a/b/1500/wantedDtl.do?wantedId=wn-2026-005',
        summary: '한국어 LLM 기반 어시스턴트 개발. 데이터셋 구축부터 모델 서빙까지.'
    },
    {
        key: 'wn-2026-006',
        title: 'iOS 앱 개발자',
        company: '하루케어',
        role: 'iOS 개발자',
        skills: ['Swift', 'SwiftUI', 'iOS', 'Git'],
        preferred: ['Combine', 'XCTest', 'Firebase'],
        career: '신입',
        education: '학력무관',
        employmentType: '정규직',
        region: '서울 서초구',
        address: '서울특별시 서초구 강남대로 311',
        deadline: '2026-06-22',
        url: 'https://www.work24.go.kr/wk/a/b/1500/wantedDtl.do?wantedId=wn-2026-006',
        summary: '시니어 헬스케어 iOS 앱. SwiftUI 기반 UI/UX 개발.'
    },
    {
        key: 'wn-2026-007',
        title: 'DevOps / SRE 엔지니어',
        company: '클라우드포지',
        role: 'DevOps 엔지니어',
        skills: ['AWS', 'Kubernetes', 'Terraform', 'Linux', 'Docker', 'CI/CD'],
        preferred: ['Datadog', 'Helm', 'Python'],
        career: '경력 2년+',
        education: '학력무관',
        employmentType: '정규직',
        region: '서울 강남구',
        address: '서울특별시 강남구 영동대로 511',
        deadline: '2026-06-14',
        url: 'https://www.work24.go.kr/wk/a/b/1500/wantedDtl.do?wantedId=wn-2026-007',
        summary: 'EKS 기반 멀티테넌트 SaaS 운영. IaC와 관측성 도구 구축.'
    },
    {
        key: 'wn-2026-008',
        title: 'UX/UI 디자이너 (모바일)',
        company: '플로우디자인',
        role: 'UX/UI 디자이너',
        skills: ['Figma', '모바일 UI', '디자인 시스템', '사용자 리서치'],
        preferred: ['Lottie', 'Framer', 'HTML/CSS 이해'],
        career: '신입',
        education: '학력무관',
        employmentType: '정규직',
        region: '서울 용산구',
        address: '서울특별시 용산구 한강대로 92',
        deadline: '2026-06-28',
        url: 'https://www.work24.go.kr/wk/a/b/1500/wantedDtl.do?wantedId=wn-2026-008',
        summary: '핀테크 모바일 앱 UX 개선. 디자인 시스템 운영 및 유저 리서치 참여.'
    },
    {
        key: 'wn-2026-009',
        title: '서비스 기획자 (PM)',
        company: '리프트랩스',
        role: '서비스 기획자',
        skills: ['요구사항 정의', 'PRD 작성', 'JIRA', '데이터 기반 의사결정'],
        preferred: ['SQL', '와이어프레임', '애자일'],
        career: '신입',
        education: '대졸 이상',
        employmentType: '정규직',
        region: '서울 강남구',
        address: '서울특별시 강남구 봉은사로 524',
        deadline: '2026-06-19',
        url: 'https://www.work24.go.kr/wk/a/b/1500/wantedDtl.do?wantedId=wn-2026-009',
        summary: 'B2C 커뮤니티 서비스 신규 기능 기획. 데이터 기반 가설 검증.'
    },
    {
        key: 'wn-2026-010',
        title: 'QA 엔지니어 (자동화)',
        company: '테스트랩',
        role: 'QA 엔지니어',
        skills: ['테스트 케이스 설계', 'Selenium', 'Playwright', 'JavaScript'],
        preferred: ['Cypress', 'CI/CD', 'API 테스트'],
        career: '신입',
        education: '학력무관',
        employmentType: '정규직',
        region: '경기 성남시 분당구',
        address: '경기도 성남시 분당구 황새울로 360',
        deadline: '2026-06-30',
        url: 'https://www.work24.go.kr/wk/a/b/1500/wantedDtl.do?wantedId=wn-2026-010',
        summary: '웹/모바일 자동화 테스트 프레임워크 운영. 회귀 테스트 자동화.'
    },
    {
        key: 'wn-2026-011',
        title: '그로스 마케터',
        company: '바이럴리',
        role: '디지털 마케터',
        skills: ['퍼포먼스 마케팅', 'GA4', 'SQL', '데이터 분석'],
        preferred: ['Meta Ads', 'Google Ads', '카피라이팅'],
        career: '신입',
        education: '학력무관',
        employmentType: '정규직',
        region: '서울 성수동',
        address: '서울특별시 성동구 성수일로 56',
        deadline: '2026-07-02',
        url: 'https://www.work24.go.kr/wk/a/b/1500/wantedDtl.do?wantedId=wn-2026-011',
        summary: 'D2C 브랜드 그로스 마케팅. GA4 기반 퍼널 분석과 광고 최적화.'
    },
    {
        key: 'wn-2026-012',
        title: '백엔드 개발자 (Python/Django)',
        company: '오픈웨이브',
        role: '백엔드 개발자',
        skills: ['Python', 'Django', 'PostgreSQL', 'REST API'],
        preferred: ['Celery', 'AWS', 'Docker'],
        career: '신입',
        education: '학력무관',
        employmentType: '정규직',
        region: '인천 연수구',
        address: '인천광역시 연수구 컨벤시아대로 165',
        deadline: '2026-06-27',
        url: 'https://www.work24.go.kr/wk/a/b/1500/wantedDtl.do?wantedId=wn-2026-012',
        summary: '교육 SaaS 백엔드. Django 기반 API와 비동기 작업 시스템.'
    },
    {
        key: 'wn-2026-013',
        title: '게임 클라이언트 개발자 (Unity)',
        company: '플레이콜드',
        role: '게임 클라이언트 개발자',
        skills: ['Unity', 'C#', '게임 개발', '3D'],
        preferred: ['Shader', 'AddressableAssets', 'Photon'],
        career: '신입',
        education: '학력무관',
        employmentType: '정규직',
        region: '부산 해운대구',
        address: '부산광역시 해운대구 센텀남대로 35',
        deadline: '2026-07-05',
        url: 'https://www.work24.go.kr/wk/a/b/1500/wantedDtl.do?wantedId=wn-2026-013',
        summary: '캐주얼 모바일 게임 클라이언트 개발. Unity + C# 기반.'
    },
    {
        key: 'wn-2026-014',
        title: '데이터 엔지니어',
        company: '스트림박스',
        role: '데이터 엔지니어',
        skills: ['Python', 'SQL', 'Airflow', 'Spark', 'AWS'],
        preferred: ['Kafka', 'dbt', 'Snowflake'],
        career: '경력 1년+',
        education: '대졸 이상',
        employmentType: '정규직',
        region: '서울 강남구',
        address: '서울특별시 강남구 역삼로 132',
        deadline: '2026-06-26',
        url: 'https://www.work24.go.kr/wk/a/b/1500/wantedDtl.do?wantedId=wn-2026-014',
        summary: '실시간/배치 데이터 파이프라인 설계. dbt 기반 분석 레이어 운영.'
    },
    {
        key: 'wn-2026-015',
        title: '프론트엔드 개발자 (Vue.js)',
        company: '리프레시앱',
        role: '프론트엔드 개발자',
        skills: ['Vue.js', 'JavaScript', 'HTML', 'CSS', 'TypeScript'],
        preferred: ['Nuxt', 'Vitest', 'Tailwind'],
        career: '신입',
        education: '학력무관',
        employmentType: '정규직',
        region: '대전 유성구',
        address: '대전광역시 유성구 대학로 99',
        deadline: '2026-07-08',
        url: 'https://www.work24.go.kr/wk/a/b/1500/wantedDtl.do?wantedId=wn-2026-015',
        summary: '교육 플랫폼 웹 프론트엔드. Vue 3 + Composition API 기반.'
    }
];

function regionMatches(jobRegion, desiredRegion) {
    if (!desiredRegion) return true;
    return jobRegion && jobRegion.includes(desiredRegion);
}

function roleMatches(jobRole, desiredRole) {
    if (!desiredRole) return true;
    const j = (jobRole || '').toLowerCase();
    const d = desiredRole.toLowerCase();
    // 양방향 부분 일치
    return j.includes(d) || d.includes(j);
}

function textIncludes(source, keyword) {
  if (!keyword) return true;
  return String(source || '').toLowerCase().includes(String(keyword).toLowerCase());
}

function conditionScore(job, { skills = [], careerLevel, employmentType } = {}) {
  let score = 0;
  const jobText = [
    job.title,
    job.role,
    job.summary,
    job.career,
    job.employmentType,
    ...(job.skills || [])
  ].join(' ');

  const matchedSkills = (skills || []).filter(skill => textIncludes(jobText, skill));
  score += matchedSkills.length * 4;

  if (careerLevel && textIncludes(job.career, careerLevel)) score += 6;
  if (employmentType && textIncludes(job.employmentType, employmentType)) score += 6;

  return score;
}

function sortByUserConditions(jobs, options = {}) {
  return jobs
    .map((job, index) => ({ job, index, score: conditionScore(job, options) }))
    .sort((a, b) => (b.score - a.score) || (a.index - b.index))
    .map(item => item.job);
}

async function searchJobs({ desiredRole, desiredRegion, skills = [], careerLevel, employmentType } = {}) {
    if (process.env.WORKNET_SERVICE_KEY) {
        try {
            return await searchJobsLive({ desiredRole, desiredRegion, skills, careerLevel, employmentType });
        } catch (e) {
            console.warn('[worknet] live API 실패, mock 으로 fallback:', e.message);
        }
    }
    // mock: 직무/지역 필터 + 기술 교집합 점수로 prefilter
    let filtered = MOCK_JOBS.filter(j =>
        roleMatches(j.role, desiredRole) && regionMatches(j.region, desiredRegion)
    );
    // 최소 5개 보장: 필터로 0개면 전체 반환
    if (filtered.length < 5) filtered = MOCK_JOBS.slice();
    return sortByUserConditions(filtered, { skills, careerLevel, employmentType });
}

function asArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function pick(obj, keys, fallback = '') {
  for (const key of keys) {
    const value = obj?.[key];

    if (value !== undefined && value !== null && String(value).trim() !== '') {
      return String(value).trim();
    }
  }

  return fallback;
}

function stripHtml(value = '') {
  return String(value)
    .replace(/<[^>]*>/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function formatDate(value = '') {
  const raw = String(value).replace(/[^\d]/g, '');

  if (raw.length >= 8) {
    return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
  }

  return value || '';
}

function extractSkills(text = '') {
  const source = String(text).toLowerCase();

  const candidates = [
    'JavaScript',
    'TypeScript',
    'React',
    'Vue.js',
    'Node.js',
    'Express',
    'Java',
    'Spring',
    'Python',
    'Django',
    'SQL',
    'MySQL',
    'PostgreSQL',
    'MongoDB',
    'AWS',
    'Docker',
    'Kubernetes',
    'HTML',
    'CSS',
    'Git',
    'REST API'
  ];

  return candidates.filter(skill => source.includes(skill.toLowerCase()));
}

function findItemsDeep(node) {
  if (!node || typeof node !== 'object') return [];

  if (node.wantedRoot?.wanted) {
    return asArray(node.wantedRoot.wanted);
  }

  if (node.wanted) {
    return asArray(node.wanted);
  }

  // 공공데이터 API에서 자주 나오는 구조
  if (node.response?.body?.items?.item) {
    return asArray(node.response.body.items.item);
  }

  if (node.items?.item) {
    return asArray(node.items.item);
  }

  if (node.body?.items?.item) {
    return asArray(node.body.items.item);
  }

  if (node.item) {
    return asArray(node.item);
  }

  // 구조가 다를 때를 대비한 재귀 탐색
  for (const value of Object.values(node)) {
    const found = findItemsDeep(value);
    if (found.length) return found;
  }

  return [];
}

function worknetCareerCode(careerLevel = '') {
  const value = String(careerLevel);
  if (!value) return '';
  if (value.includes('신입')) return 'N';
  if (value.includes('경력')) return 'E';
  return 'Z';
}

function worknetEmploymentCode(employmentType = '') {
  const value = String(employmentType);
  if (!value || value.includes('무관')) return '';
  if (value.includes('정규')) return '10';
  if (value.includes('계약')) return '20';
  return '';
}

function normalizeJob(item, index = 0) {
  const title = pick(item, [
    'title',
    'recrutPbancTtl',
    'wantedTitle',
    'jobTitle',
    'wantedTitleNm',
    'recruitTitle',
    'empWantedTitle'
  ], '채용 공고');

  const company = pick(item, [
    'company',
    'instNm',
    'corpNm',
    'companyName',
    'empBusiNm',
    'wantedAuthCompany',
    'recrutInstNm'
  ], '기업명 미상');

  const role = pick(item, [
    'role',
    'ncsCdNmLst',
    'jobNm',
    'occupation',
    'recruitJob',
    'recrutSeNm',
    'jobsNm',
    'wantedJobNm'
  ], title);

  const region = pick(item, [
    'region',
    'workRegion',
    'workPlcNm',
    'workArea',
    'regionNm',
    'address',
    'workAddr'
  ], '');

  const address = pick(item, [
    'address',
    'workAddr',
    'workAddress',
    'addr',
    'workPlcNm',
    'region'
  ], region);

  const deadline = formatDate(pick(item, [
    'deadline',
    'pbancEndYmd',
    'receiptCloseDt',
    'closeDt',
    'regDt',
    'endDate',
    'wantedEndt'
  ], ''));

  const url = pick(item, [
    'url',
    'recrutPbancUrl',
    'detailUrl',
    'wantedInfoUrl',
    'homepage',
    'applyUrl'
  ], '');

  const summary = stripHtml(pick(item, [
    'summary',
    'jobCont',
    'workCont',
    'recrutCn',
    'detail',
    'description',
    'etc'
  ], `${company}의 ${title} 공고입니다.`));

  const skillText = [
    title,
    role,
    summary,
    pick(item, ['skill', 'skills', 'preferential', 'qualification', 'qfctn'])
  ].join(' ');

  return {
    key: pick(item, [
      'key',
      'recrutPblntSn',
      'wantedAuthNo',
      'id',
      'seq',
      'recruitId'
    ], `live-${Date.now()}-${index}`),
    title,
    company,
    role,
    skills: extractSkills(skillText),
    preferred: [],
    career: pick(item, [
      'career',
      'careerNm',
      'careerCond',
      'careerRequirement'
    ], '정보 없음'),
    education: pick(item, [
      'education',
      'eduNm',
      'educationNm',
      'acbgCondNm'
    ], '정보 없음'),
    employmentType: pick(item, [
      'employmentType',
      'hireTypeNm',
      'empTpNm',
      'employType',
      'recrutSeNm'
    ], '정보 없음'),
    region,
    address,
    deadline,
    url,
    summary
  };
}

async function searchJobsLive({ desiredRole, desiredRegion, skills = [], careerLevel, employmentType }) {
  const key = process.env.WORKNET_SERVICE_KEY;

  const params = new URLSearchParams({
    authKey: key,
    callTp: 'L',
    returnType: 'XML',
    startPage: '1',
    display: '20'
  });

  if (desiredRole) params.set('keyword', desiredRole);

  const career = worknetCareerCode(careerLevel);
  if (career && career !== 'Z') {
    params.set('career', career);
    params.set('minCareerM', career === 'N' ? '0' : '1');
    params.set('maxCareerM', career === 'N' ? '0' : '120');
  }

  const empTp = worknetEmploymentCode(employmentType);
  if (empTp) params.set('empTp', empTp);

  const url = `https://www.work24.go.kr/cm/openApi/call/wk/callOpenApiSvcInfo210L01.do?${params.toString()}`;

  const res = await fetch(url);
  const xml = await res.text();

  if (!res.ok) {
    throw new Error(`채용정보 API HTTP ${res.status}: ${xml.slice(0, 200)}`);
  }

  const Parser = getXmlParser();
  const parser = new Parser({
    ignoreAttributes: false,
    attributeNamePrefix: '',
    trimValues: true
  });

  const parsed = parser.parse(xml);
  const items = findItemsDeep(parsed);

  if (!items.length) {
    throw new Error(`채용정보 API 응답에서 item을 찾지 못했습니다: ${xml.slice(0, 300)}`);
  }

  let jobs = items.map(normalizeJob);

  if (desiredRegion) {
    const regionKeyword = desiredRegion.trim();
    jobs = jobs.filter(job =>
      job.region.includes(regionKeyword) ||
      job.address.includes(regionKeyword)
    );
  }

  if (!jobs.length) {
    throw new Error('검색 조건에 맞는 실시간 채용 공고가 없습니다.');
  }

  return sortByUserConditions(jobs, { skills, careerLevel, employmentType });
}

module.exports = { searchJobs, MOCK_JOBS };

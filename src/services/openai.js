/* =========================================================
   LLM 어댑터 (파일명은 openai.js 유지 — 라우터 호환)
   - Gemini (GEMINI_API_KEY) 또는 OpenAI (OPENAI_API_KEY) 자동 감지
     · Gemini 사용 시 OpenAI 호환 엔드포인트(v1beta/openai/chat/completions) 호출
   - 키 없으면 결정적 mock (스킬 매칭 % + 템플릿 기반 응답)
   - 양쪽 다 있으면 GEMINI 우선
   ========================================================= */

function hasLLMKey() {
    return !!(process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY);
}

function llmConfigs() {
    const configs = [];

    if (process.env.GEMINI_API_KEY) {
        configs.push({
            url: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
            apiKey: process.env.GEMINI_API_KEY,
            model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
            provider: 'gemini'
        });
    }

    if (process.env.OPENAI_API_KEY) {
        configs.push({
            url: 'https://api.openai.com/v1/chat/completions',
            apiKey: process.env.OPENAI_API_KEY,
            model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
            provider: 'openai'
        });
    }

    return configs;
}

const QUESTION_TEMPLATES = [
    { type: '자기소개', q: '본인을 30초 안에 소개하면서 지원 직무인 {role}와(과) 어떻게 연결되는지 설명해주세요.' },
    { type: '프로젝트', q: '포트폴리오에서 가장 자신 있는 프로젝트를 골라 본인의 역할과 기여한 점을 구체적으로 말씀해주세요.' },
    { type: '기술', q: '{skill} 을(를) 실제 프로젝트에서 어떻게 활용했는지, 선택한 이유까지 함께 설명해주세요.' },
    { type: '문제해결', q: '프로젝트 진행 중 마주친 가장 큰 기술적 문제와, 어떤 방식으로 해결했는지 설명해주세요.' },
    { type: '직무적합성', q: '여러 지원자 중 본인이 {company} 의 {role} 포지션에 적합하다고 생각하는 이유는 무엇인가요?' },
    { type: '협업', q: '팀 프로젝트에서 의견 차이가 있었던 경험과, 어떻게 합의에 이르렀는지 들려주세요.' },
    { type: '성장', q: '입사 후 1년 안에 이루고 싶은 성장 목표는 무엇이고, 그것을 위해 어떤 노력을 할 계획인가요?' }
];

function normalize(s) { return (s || '').toString().toLowerCase().trim(); }

function uniq(arr) { return Array.from(new Set(arr)); }

function tokenize(s) {
    return normalize(s)
        .split(/[\s,./()\[\]·•\-+:;|]+/)
        .filter(Boolean);
}

// ----- 매칭 점수 (결정적) -----
function scoreMatch(portfolio, job) {
    const ps = (portfolio.skills || []).map(normalize);
    const js = (job.skills || []).map(normalize);
    const intersect = ps.filter(s => js.includes(s));
    const skillScore = js.length ? (intersect.length / js.length) * 50 : 0;

    const roleScore = portfolio.desiredRole && job.role &&
        (normalize(job.role).includes(normalize(portfolio.desiredRole)) ||
            normalize(portfolio.desiredRole).includes(normalize(job.role))) ? 20 : 0;

    const regionScore = portfolio.desiredRegion && job.region &&
        normalize(job.region).includes(normalize(portfolio.desiredRegion)) ? 10 : 0;

    const careerScore = portfolio.careerLevel && job.career &&
        (normalize(job.career).includes(normalize(portfolio.careerLevel)) ||
            normalize(portfolio.careerLevel).includes(normalize(job.career))) ? 5 : 0;

    const employmentScore = portfolio.employmentType && job.employmentType &&
        (normalize(job.employmentType).includes(normalize(portfolio.employmentType)) ||
            normalize(portfolio.employmentType).includes(normalize(job.employmentType))) ? 5 : 0;

    // 프로젝트 텍스트에서 공고 스킬이 언급된 비율
    const projectText = (portfolio.projects || [])
        .map(p => `${p.name || ''} ${p.role || ''} ${(p.tech || []).join(' ')} ${p.description || ''}`)
        .join(' ');
    const tokens = tokenize(projectText);
    const projHits = js.filter(s => tokens.includes(s));
    const projectScore = js.length ? (projHits.length / js.length) * 10 : 0;

    const total = Math.round((skillScore + roleScore + regionScore + projectScore + careerScore + employmentScore) * 10) / 10;
    return {
        score: Math.min(100, total),
        matchedSkills: uniq(intersect),
        missingSkills: js.filter(s => !ps.includes(s) && !tokens.includes(s)).map(s => {
            // 원래 표기 복원
            return job.skills.find(x => normalize(x) === s) || s;
        })
    };
}

function buildReason(portfolio, job, breakdown) {
    const matched = breakdown.matchedSkills.slice(0, 4)
        .map(s => job.skills.find(x => normalize(x) === s) || s);
    const matchedStr = matched.length ? matched.join(', ') : '관심 분야 공통점';
    const projectHint = (portfolio.projects && portfolio.projects[0] && portfolio.projects[0].name) || '본인 프로젝트';
    return `포트폴리오의 ${matchedStr} 경험이 ${job.company}의 ${job.role} 요구사항과 직접 맞닿아 있습니다. 특히 "${projectHint}" 프로젝트에서 보인 문제 해결 흐름이 이 공고 업무에 자연스럽게 이어집니다.`;
}

function buildMissing(missingSkills) {
    if (!missingSkills.length) return '추가 보완이 필요한 핵심 기술은 보이지 않습니다. 면접에서는 경험의 깊이를 강조하세요.';
    return `${missingSkills.slice(0, 5).join(', ')} 관련 경험을 짧게라도 보강하면 합격 가능성이 더 올라갑니다.`;
}

async function analyzeMatch(portfolio, job) {
    if (hasLLMKey()) {
        try { return await callOpenAIMatch(portfolio, job); }
        catch (e) { console.warn('[llm] match live 실패, mock 사용:', e.message); }
    }
    const b = scoreMatch(portfolio, job);
    return {
        score: b.score,
        matchedSkills: b.matchedSkills,
        missingSkills: b.missingSkills,
        reason: buildReason(portfolio, job, b),
        missingNote: buildMissing(b.missingSkills)
    };
}

async function generateInterviewQuestions(portfolio, job, n = 6) {
    if (hasLLMKey()) {
        try { return await callOpenAIQuestions(portfolio, job, n); }
        catch (e) { console.warn('[llm] questions live 실패, mock 사용:', e.message); }
    }
    const primarySkill = (job.skills && job.skills[0]) || (portfolio.skills && portfolio.skills[0]) || '관련 기술';
    return QUESTION_TEMPLATES.slice(0, n).map((t, i) => ({
        id: `q-${i + 1}`,
        type: t.type,
        question: t.q
            .replace('{role}', job.role || '해당 직무')
            .replace('{skill}', primarySkill)
            .replace('{company}', job.company || '회사')
    }));
}

function answerHeuristics(answer) {
    const len = (answer || '').trim().length;
    const sentences = (answer || '').split(/[.!?。]+/).filter(s => s.trim().length > 0).length;
    const numbers = (answer.match(/\d+(\.\d+)?%?/g) || []).length;
    const concreteWords = ['예를 들어', '결과', '성과', '도입', '구현', '해결', '%', '개선'];
    const concrete = concreteWords.filter(w => answer.includes(w)).length;
    return { len, sentences, numbers, concrete };
}

async function evaluateAnswer(question, answer, portfolio, job) {
    if (hasLLMKey()) {
        try { return await callOpenAIEvaluate(question, answer, portfolio, job); }
        catch (e) { console.warn('[llm] evaluate live 실패, mock 사용:', e.message); }
    }
    const h = answerHeuristics(answer);

    const concreteness = h.len < 80 ? 2 : h.len < 200 ? 3 : 4 + Math.min(1, h.concrete * 0.5);
    const logic = h.sentences < 2 ? 2 : h.sentences < 4 ? 3 : 4;
    const relevance = (job.skills || []).some(s => normalize(answer).includes(normalize(s))) ? 4 : 3;
    const techExpression = h.numbers >= 1 ? 4 : (h.concrete >= 1 ? 3 : 2);

    const overall = Math.round(((concreteness + logic + relevance + techExpression) / 4) * 10) / 10;

    const suggestions = [];
    if (h.len < 200) suggestions.push('답변 길이가 짧습니다. STAR(상황-과제-행동-결과) 구조로 더 구체화해보세요.');
    if (h.numbers === 0) suggestions.push('성과를 수치(예: 30% 개선, 1000명 사용자)로 표현하면 설득력이 올라갑니다.');
    if (relevance < 4) suggestions.push(`공고에서 강조하는 ${(job.skills || ['핵심 기술']).slice(0, 2).join(', ')}와의 연결을 더 명확히 하세요.`);
    if (!suggestions.length) suggestions.push('전반적으로 좋은 답변입니다. 동일한 톤을 유지하세요.');

    return {
        scores: {
            concreteness: Math.min(5, concreteness),
            logic: Math.min(5, logic),
            relevance: Math.min(5, relevance),
            techExpression: Math.min(5, techExpression),
            overall: Math.min(5, overall)
        },
        strengths: h.concrete >= 1 ? '구체적 표현이 포함되어 있고 논리 흐름이 자연스럽습니다.' : '답변의 출발이 좋습니다.',
        improvements: suggestions
    };
}

async function generateChecklist({ job, interviewAt, currentLocation, hasPortfolioPrint } = {}) {
    if (hasLLMKey()) {
        try { return await callOpenAIChecklist({ job, interviewAt, currentLocation, hasPortfolioPrint }); }
        catch (e) { console.warn('[llm] checklist live 실패, mock 사용:', e.message); }
    }
    const items = [
        '신분증(주민등록증/운전면허증) 휴대',
        '이력서/포트폴리오 출력본 2부 준비',
        '면접장 30분 전 도착',
        '복장 점검 (정장 또는 비즈니스 캐주얼)',
        '예상 질문 마지막 복습 (5문항)',
        '휴대폰 보조배터리/필기구',
        `${job && job.company ? job.company + ' ' : ''}회사 최근 뉴스 1~2개 확인`,
        '자기소개 30초 / 1분 / 3분 버전 점검'
    ];
    if (interviewAt) {
        const dt = new Date(interviewAt);
        if (!isNaN(dt.getTime())) {
            items.unshift(`면접 시간: ${dt.toLocaleString('ko-KR')} — 도착 권장 ${new Date(dt.getTime() - 30 * 60000).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}`);
        }
    }
    if (currentLocation) {
        items.push('현재 위치에서 면접장까지 이동 경로/소요시간 재확인');
        items.push(`현재 위치 좌표 확인: ${currentLocation.lat ?? currentLocation.y}, ${currentLocation.lng ?? currentLocation.x}`);
    }
    if (!hasPortfolioPrint) {
        items.push('출력본이 없다면 면접장 주변 프린트 가게 위치 확인');
    }
    if (interviewAt) {
        const dt = new Date(interviewAt);
        if (!isNaN(dt.getTime())) {
            const minutesLeft = Math.round((dt.getTime() - Date.now()) / 60000);
            if (minutesLeft <= 30) {
                items.unshift('면접까지 30분 이내입니다. 면접장 도착, 신분증, 휴대폰 무음 설정을 최우선으로 확인하세요.');
            } else if (minutesLeft <= 120) {
                items.unshift('면접까지 2시간 이내입니다. 출력물과 복장을 빠르게 점검하고 가까운 카페/편의점 위주로 이동하세요.');
            } else {
                items.unshift('면접까지 여유가 있습니다. 포트폴리오 출력, 정장 대여, 이동 경로 확인을 먼저 처리하세요.');
            }
        }
    }
    return items;
}

// ----- 실제 LLM 호출 (Gemini OpenAI-compat 또는 OpenAI) -----
async function callOpenAI(messages, options = {}) {
    const configs = llmConfigs();
    let lastError = null;

    for (let i = 0; i < configs.length; i++) {
        const cfg = configs[i];

        try {
            const res = await fetch(cfg.url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${cfg.apiKey}`
                },
                body: JSON.stringify({
                    model: cfg.model,
                    messages,
                    temperature: options.temperature ?? 0.7,
                    response_format: options.json ? { type: 'json_object' } : undefined
                })
            });

            if (!res.ok) {
                const body = await res.text().catch(() => '');
                throw new Error(`${cfg.provider} HTTP ${res.status} ${body.slice(0, 200)}`);
            }

            const data = await res.json();
            const content = data.choices?.[0]?.message?.content || '';
            if (!options.json) return content;
            // 일부 모델이 json_object 모드에서도 ```json ... ``` fence를 두르는 경우 방어
            const cleaned = content.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '');
            return JSON.parse(cleaned);
        } catch (e) {
            lastError = e;
            const nextProvider = configs[i + 1]?.provider;
            if (nextProvider) {
                console.warn(`[llm] ${cfg.provider} 실패, ${nextProvider} 재시도:`, e.message);
            }
        }
    }

    throw lastError || new Error('LLM API key가 설정되지 않았습니다.');
}

async function callOpenAIMatch(portfolio, job) {
    const sys = '너는 한국어 채용 컨설턴트다. JSON 으로만 답한다. 키: score(0~100), matchedSkills, missingSkills, reason, missingNote';
    const user = `포트폴리오: ${JSON.stringify(portfolio)}\n공고: ${JSON.stringify(job)}`;
    return await callOpenAI([
        { role: 'system', content: sys },
        { role: 'user', content: user }
    ], { json: true, temperature: 0.3 });
}

async function callOpenAIQuestions(portfolio, job, n) {
    const sys = `너는 한국어 면접관이다. JSON 배열로만 답한다. 각 원소: {id, type, question}. ${n}개.`;
    const user = `공고: ${JSON.stringify(job)}\n포트폴리오: ${JSON.stringify(portfolio)}`;
    const r = await callOpenAI([
        { role: 'system', content: sys },
        { role: 'user', content: user }
    ], { json: true, temperature: 0.5 });
    return Array.isArray(r) ? r : (r.questions || []);
}

async function callOpenAIEvaluate(question, answer, portfolio, job) {
    const sys = '너는 한국어 면접 코치다. JSON 으로만 답한다. 키: scores{concreteness,logic,relevance,techExpression,overall(0~5)}, strengths, improvements(배열)';
    const user = `질문: ${question}\n답변: ${answer}\n공고: ${JSON.stringify(job)}\n포트폴리오: ${JSON.stringify(portfolio)}`;
    return await callOpenAI([
        { role: 'system', content: sys },
        { role: 'user', content: user }
    ], { json: true, temperature: 0.3 });
}

async function callOpenAIChecklist({ job, interviewAt, currentLocation, hasPortfolioPrint }) {
    const sys = '너는 한국어 면접 코치다. 면접 당일 체크리스트를 JSON 배열(문자열만)으로 반환한다.';
    const user = `면접: ${interviewAt}\n공고: ${JSON.stringify(job)}\n현재 위치: ${JSON.stringify(currentLocation)}\n포트폴리오 출력본: ${hasPortfolioPrint}`;
    const r = await callOpenAI([
        { role: 'system', content: sys },
        { role: 'user', content: user }
    ], { json: true, temperature: 0.4 });
    return Array.isArray(r) ? r : (r.items || []);
}

module.exports = {
    analyzeMatch,
    generateInterviewQuestions,
    evaluateAnswer,
    generateChecklist
};

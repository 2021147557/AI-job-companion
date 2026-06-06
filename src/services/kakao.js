/* =========================================================
   Kakao Local REST API 어댑터
   - 주소 → 좌표, 좌표 주변 카페/편의점/프린트가게/지하철역/정장대여
   - 키 없으면 결정적 mock 좌표 + 주변 장소 데이터
   ========================================================= */

const ADDR_MOCK = {
    // 주소 일부 키워드 → 대략의 위경도 (시연용)
    '강남': { x: 127.0276, y: 37.4979 },
    '성수': { x: 127.0556, y: 37.5447 },
    '판교': { x: 127.1086, y: 37.4019 },
    '용산': { x: 126.9651, y: 37.5333 },
    '서초': { x: 127.0257, y: 37.4837 },
    '마포': { x: 126.9015, y: 37.5638 },
    '연수': { x: 126.6786, y: 37.4106 },
    '해운대': { x: 129.1631, y: 35.1631 },
    '유성': { x: 127.3441, y: 36.3623 },
    '성동': { x: 127.0386, y: 37.5634 },
    '분당': { x: 127.1086, y: 37.4019 },
    '서울': { x: 126.9784, y: 37.5666 }
};

const CATEGORIES = {
    cafe: { name: '카페', code: 'CE7' },
    cvs: { name: '편의점', code: 'CS2' },
    subway: { name: '지하철역', code: 'SW8' },
    print: { name: '프린트 가게', code: '' },          // 키워드 검색
    suit: { name: '정장 대여소', code: '' }            // 키워드 검색
};

function addrToCoord(address) {
    for (const k of Object.keys(ADDR_MOCK)) {
        if (address && address.includes(k)) return { ...ADDR_MOCK[k], matched: k };
    }
    // default: 강남역
    return { ...ADDR_MOCK['강남'], matched: 'default' };
}

// 약 100m -> 0.0009 위도 변화 가정 → 시연용 더미 분산
function jitter(base, idx, type) {
    const offsets = [
        [+0.0007, +0.0009], [-0.0006, +0.0012], [+0.0014, -0.0004],
        [-0.0011, -0.0010], [+0.0003, +0.0017], [+0.0019, +0.0006]
    ];
    const [dx, dy] = offsets[idx % offsets.length];
    return {
        x: +(base.x + dx * (type === 'subway' ? 1.6 : 1)).toFixed(6),
        y: +(base.y + dy * (type === 'subway' ? 1.6 : 1)).toFixed(6)
    };
}

function distMeters(a, b) {
    const R = 6371000;
    const toRad = d => d * Math.PI / 180;
    const dLat = toRad(b.y - a.y);
    const dLon = toRad(b.x - a.x);
    const lat1 = toRad(a.y);
    const lat2 = toRad(b.y);
    const x = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
    return Math.round(2 * R * Math.asin(Math.sqrt(x)));
}

function minutesUntil(interviewAt) {
    if (!interviewAt) return null;
    const dt = new Date(interviewAt);
    if (isNaN(dt.getTime())) return null;
    return Math.round((dt.getTime() - Date.now()) / 60000);
}

function typePriority(type, minutesLeft) {
    if (minutesLeft == null) {
        return { weight: 3, reason: '면접장과 가까운 순서로 추천' };
    }
    if (minutesLeft <= 30) {
        const weights = { cvs: 7, cafe: 6, subway: 5, print: 2, suit: 1 };
        return { weight: weights[type] || 1, reason: '면접 시간이 가까워 빠르게 들를 수 있는 장소 우선' };
    }
    if (minutesLeft <= 120) {
        const weights = { print: 7, cvs: 6, cafe: 5, subway: 4, suit: 3 };
        return { weight: weights[type] || 1, reason: '출력물/간단한 대기 장소를 우선 확인' };
    }
    const weights = { suit: 7, print: 6, cafe: 5, cvs: 4, subway: 3 };
    return { weight: weights[type] || 1, reason: '시간 여유가 있어 정장 대여와 출력 준비까지 추천' };
}

function applyRecommendationPriority(grouped, { interviewAt } = {}) {
    const minutesLeft = minutesUntil(interviewAt);
    for (const [type, places] of Object.entries(grouped || {})) {
        const priority = typePriority(type, minutesLeft);
        places.forEach(place => {
            place.minutesLeft = minutesLeft;
            place.recommendationScore = Math.round((priority.weight * 1000 - Number(place.distance || 0)) * 10) / 10;
            place.recommendationReason = priority.reason;
        });
        places.sort((a, b) => (b.recommendationScore - a.recommendationScore) || (a.distance - b.distance));
    }
    return grouped;
}

const PLACE_NAMES = {
    cafe: ['스타벅스', '투썸플레이스', '메가커피', '이디야커피', '폴바셋', '커피빈'],
    cvs: ['CU', 'GS25', '세븐일레븐', '이마트24', 'CU', 'GS25'],
    subway: ['1번출구', '2번출구', '3번출구', '4번출구', '5번출구', '6번출구'],
    print: ['디스카운트프린트', '킹스카피', '프린트포유', '복사천국', '24시 프린트샵', '인쇄소'],
    suit: ['더수트하우스', '체인지룩', '슈트마스터', '레날코리아', '드레스코드', '슈트빌리지']
};

function genMockPlaces(coord, type, n = 6, anchorName) {
    const list = [];
    for (let i = 0; i < n; i++) {
        const loc = jitter(coord, i, type);
        const dist = distMeters(coord, loc);
        const baseName = PLACE_NAMES[type][i % PLACE_NAMES[type].length];
        const name = type === 'subway' ? `${anchorName || '강남역'} ${baseName}` : `${baseName} ${anchorName || '강남'}점`;
        list.push({
            id: `${type}-${i}`,
            type,
            typeLabel: CATEGORIES[type].name,
            name,
            address: `${anchorName || '강남'} 인근`,
            phone: '',
            x: loc.x,
            y: loc.y,
            distance: dist
        });
    }
    list.sort((a, b) => a.distance - b.distance);
    return list;
}

async function geocode(address) {
    if (process.env.KAKAO_REST_KEY) {
        try { return await geocodeLive(address); }
        catch (e) { console.warn('[kakao] geocode live 실패, mock 사용:', e.message); }
    }
    const c = addrToCoord(address);
    return { x: c.x, y: c.y, address };
}

async function geocodeLive(address) {
    const url = `https://dapi.kakao.com/v2/local/search/address.json?query=${encodeURIComponent(address)}`;
    const res = await fetch(url, {
        headers: { Authorization: `KakaoAK ${process.env.KAKAO_REST_KEY}` }
    });
    if (!res.ok) throw new Error(`Kakao geocode HTTP ${res.status}`);
    const data = await res.json();
    if (!data.documents || !data.documents.length) throw new Error('주소 조회 결과 없음');
    const d = data.documents[0];
    return { x: Number(d.x), y: Number(d.y), address: d.address_name };
}

async function searchNearby({ x, y, types = ['cafe', 'cvs', 'subway', 'print', 'suit'], radius = 800, anchorName, interviewAt } = {}) {
    if (process.env.KAKAO_REST_KEY) {
        try { return applyRecommendationPriority(await searchNearbyLive({ x, y, types, radius }), { interviewAt }); }
        catch (e) { console.warn('[kakao] nearby live 실패, mock 사용:', e.message); }
    }
    const result = {};
    for (const t of types) result[t] = genMockPlaces({ x, y }, t, 6, anchorName);
    return applyRecommendationPriority(result, { interviewAt });
}

async function searchNearbyLive({ x, y, types, radius }) {
    const out = {};
    for (const t of types) {
        const cat = CATEGORIES[t];
        let url;
        if (cat.code) {
            url = `https://dapi.kakao.com/v2/local/search/category.json?category_group_code=${cat.code}&x=${x}&y=${y}&radius=${radius}&sort=distance&size=10`;
        } else {
            url = `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(cat.name)}&x=${x}&y=${y}&radius=${radius}&sort=distance&size=10`;
        }
        const res = await fetch(url, {
            headers: { Authorization: `KakaoAK ${process.env.KAKAO_REST_KEY}` }
        });
        if (!res.ok) { out[t] = []; continue; }
        const data = await res.json();
        out[t] = (data.documents || []).map(d => ({
            id: d.id,
            type: t,
            typeLabel: cat.name,
            name: d.place_name,
            address: d.address_name || d.road_address_name,
            phone: d.phone || '',
            x: Number(d.x),
            y: Number(d.y),
            distance: Number(d.distance || 0)
        }));
    }
    return out;
}

module.exports = { geocode, searchNearby };

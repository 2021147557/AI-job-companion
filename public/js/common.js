// 공통 유틸: API fetch, 인증 확인, 네비, 토스트
(() => {
    window.API = {
        async req(method, url, body) {
            const opts = { method, headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin' };
            if (body !== undefined) opts.body = JSON.stringify(body);
            const res = await fetch(url, opts);
            const txt = await res.text();
            let data;
            try { data = txt ? JSON.parse(txt) : {}; } catch { data = { raw: txt }; }
            if (!res.ok) { const err = new Error(data.error || res.statusText); err.status = res.status; err.data = data; throw err; }
            return data;
        },
        get(url) { return this.req('GET', url); },
        post(url, body) { return this.req('POST', url, body); },
        put(url, body) { return this.req('PUT', url, body); },
        patch(url, body) { return this.req('PATCH', url, body); },
        del(url) { return this.req('DELETE', url); }
    };

    window.toast = (msg, ms = 1800) => {
        let t = document.querySelector('.toast');
        if (!t) {
            t = document.createElement('div');
            t.className = 'toast';
            document.body.appendChild(t);
        }
        t.textContent = msg;
        t.classList.add('show');
        clearTimeout(window._toastTimer);
        window._toastTimer = setTimeout(() => t.classList.remove('show'), ms);
    };

    window.escapeHtml = (s) => String(s ?? '')
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

    window.formatDateTime = (iso) => {
        if (!iso) return '미정';
        const d = new Date(iso);
        if (isNaN(d.getTime())) return iso;
        return d.toLocaleString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
    };

    window.requireLogin = async () => {
        try {
            const me = await API.get('/api/auth/me');
            if (!me.loggedIn) { location.href = '/login.html'; return null; }
            return me;
        } catch {
            location.href = '/login.html';
            return null;
        }
    };

    window.renderNav = (active, user) => {
        const links = [
            ['/dashboard.html', '대시보드'],
            ['/portfolio.html', '포트폴리오'],
            ['/jobs.html', '추천 공고'],
            ['/interview.html', '모의 면접'],
            ['/checklist.html', '면접 당일']
        ];
        const nav = document.querySelector('.navigation');
        if (!nav) return;
        const linksHtml = links.map(([h, n]) =>
            `<a href="${h}" class="nav-item${active === h ? ' active' : ''}">${n}</a>`
        ).join('');
        const right = user
            ? `<span class="nav-spacer"></span><span class="nav-user">${escapeHtml(user.name)} 님</span><a href="#" class="nav-item" id="nav-logout">로그아웃</a>`
            : `<span class="nav-spacer"></span><a href="/login.html" class="nav-item">로그인</a><a href="/signup.html" class="nav-item">회원가입</a>`;
        nav.innerHTML = linksHtml + right;
        const lo = document.getElementById('nav-logout');
        if (lo) lo.addEventListener('click', async (e) => {
            e.preventDefault();
            await API.post('/api/auth/logout');
            location.href = '/login.html';
        });
    };
})();

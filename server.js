/* =========================================================
   쉬었음 청년을 위한 AI 취업 동행 서비스 - 메인 서버
   - 로컬: `node server.js` 로 직접 실행
   - Vercel: api/index.js 가 이 모듈을 require → handler 로 사용
   ========================================================= */
require('dotenv').config();

const path = require('path');
const express = require('express');
const cookieSession = require('cookie-session');

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.set('trust proxy', 1);

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

app.use(cookieSession({
    name: 'sess',
    keys: [process.env.SESSION_SECRET || 'dev-secret-please-change'],
    maxAge: 7 * 24 * 60 * 60 * 1000,
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production'
}));

app.get('/api/config', (req, res) => {
    res.json({
        kakaoJsKey: process.env.KAKAO_JS_KEY || '',
        loggedIn: !!(req.session && req.session.userId),
        userName: (req.session && req.session.name) || null
    });
});

app.use('/api/auth', require('./src/routes/auth'));
app.use('/api/portfolio', require('./src/routes/portfolio'));
app.use('/api/jobs', require('./src/routes/jobs'));
app.use('/api/interview', require('./src/routes/interview'));
app.use('/api/checklist', require('./src/routes/checklist'));
app.use('/api/places', require('./src/routes/places'));

// 로컬 dev 에서만 static + HTML fallback 사용.
// Vercel 에서는 public/ 이 자동으로 root 에 서빙되므로 아래는 발동 안 함.
app.use(express.static(path.join(__dirname, 'public'), { extensions: ['html'] }));
app.use((req, res, next) => {
    if (req.method === 'GET' && req.accepts('html') && !req.path.startsWith('/api/')) {
        return res.sendFile(path.join(__dirname, 'public', 'index.html'));
    }
    next();
});

app.use((err, req, res, _next) => {
    console.error('[ERR]', err);
    res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' });
});

if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`AI 취업 동행 서버 실행: http://localhost:${PORT}`);
    });
}

module.exports = app;

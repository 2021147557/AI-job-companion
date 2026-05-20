/* =========================================================
   쉬었음 청년을 위한 AI 취업 동행 서비스 - 메인 서버
   Internet Programming 팀 프로젝트 (2026)
   ========================================================= */
require('dotenv').config();

const path = require('path');
const express = require('express');
const session = require('express-session');

const { initDb } = require('./src/db');

const app = express();
const PORT = Number(process.env.PORT) || 3000;

initDb();

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

app.use(session({
    name: 'sid',
    secret: process.env.SESSION_SECRET || 'dev-secret-please-change',
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000
    }
}));

// 모든 페이지에서 Kakao JS 키를 inline 으로 받기 위한 작은 엔드포인트
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

app.use(express.static(path.join(__dirname, 'public'), { extensions: ['html'] }));

// 알려지지 않은 라우트는 SPA 처럼 index 로 fallback (HTML 요청만)
app.use((req, res, next) => {
    if (req.method === 'GET' && req.accepts('html')) {
        return res.sendFile(path.join(__dirname, 'public', 'index.html'));
    }
    next();
});

app.use((err, req, res, _next) => {
    console.error('[ERR]', err);
    res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' });
});

app.listen(PORT, () => {
    console.log(`AI 취업 동행 서버 실행: http://localhost:${PORT}`);
});

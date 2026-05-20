const express = require('express');
const bcrypt = require('bcryptjs');
const { get, run } = require('../db');

const router = express.Router();

router.post('/signup', async (req, res, next) => {
    try {
        const { userid, password, name, email } = req.body || {};
        if (!userid || !password || !name) {
            return res.status(400).json({ error: '아이디, 비밀번호, 이름은 필수입니다.' });
        }
        if (String(password).length < 6) {
            return res.status(400).json({ error: '비밀번호는 6자 이상이어야 합니다.' });
        }
        const exists = await get('SELECT id FROM users WHERE userid = ?', userid);
        if (exists) return res.status(409).json({ error: '이미 사용 중인 아이디입니다.' });

        const hash = await bcrypt.hash(password, 10);
        const info = await run(
            'INSERT INTO users (userid, password_hash, name, email) VALUES (?, ?, ?, ?)',
            userid, hash, name, email || null
        );

        req.session.userId = info.lastInsertRowid;
        req.session.name = name;
        res.json({ ok: true, userId: info.lastInsertRowid, name });
    } catch (e) { next(e); }
});

router.post('/login', async (req, res, next) => {
    try {
        const { userid, password } = req.body || {};
        if (!userid || !password) return res.status(400).json({ error: '아이디와 비밀번호를 입력하세요.' });
        const user = await get('SELECT id, name, password_hash FROM users WHERE userid = ?', userid);
        if (!user) return res.status(401).json({ error: '아이디 또는 비밀번호가 일치하지 않습니다.' });
        const ok = await bcrypt.compare(password, user.password_hash);
        if (!ok) return res.status(401).json({ error: '아이디 또는 비밀번호가 일치하지 않습니다.' });
        req.session.userId = user.id;
        req.session.name = user.name;
        res.json({ ok: true, userId: user.id, name: user.name });
    } catch (e) { next(e); }
});

router.post('/logout', (req, res) => {
    req.session = null;
    res.json({ ok: true });
});

router.get('/me', (req, res) => {
    if (!req.session || !req.session.userId) return res.json({ loggedIn: false });
    res.json({ loggedIn: true, userId: req.session.userId, name: req.session.name });
});

module.exports = router;

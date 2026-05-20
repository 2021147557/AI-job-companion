const express = require('express');
const { getDb } = require('../db');
const { requireLogin } = require('../middleware/auth');
const { geocode, searchNearby } = require('../services/kakao');

const router = express.Router();

router.post('/geocode', requireLogin, async (req, res, next) => {
    try {
        const { address } = req.body || {};
        if (!address) return res.status(400).json({ error: '주소가 필요합니다.' });
        const r = await geocode(address);
        res.json(r);
    } catch (e) { next(e); }
});

router.post('/nearby', requireLogin, async (req, res, next) => {
    try {
        const { x, y, types, radius, anchorName } = req.body || {};
        if (x == null || y == null) return res.status(400).json({ error: '좌표가 필요합니다.' });
        const r = await searchNearby({ x: Number(x), y: Number(y), types, radius, anchorName });
        res.json(r);
    } catch (e) { next(e); }
});

router.get('/for-selected/:selectedJobId', requireLogin, async (req, res, next) => {
    try {
        const db = getDb();
        const r = db.prepare('SELECT * FROM selected_jobs WHERE id = ? AND user_id = ?')
            .get(req.params.selectedJobId, req.session.userId);
        if (!r) return res.status(404).json({ error: '선택된 공고가 없습니다.' });
        const job = JSON.parse(r.job_json);
        const address = r.interview_address || job.address;
        const geo = await geocode(address);
        const nearby = await searchNearby({ x: geo.x, y: geo.y, anchorName: job.region || '면접장' });
        res.json({ address, geo, nearby });
    } catch (e) { next(e); }
});

module.exports = router;

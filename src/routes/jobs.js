const express = require('express');
const { getDb, lastId } = require('../db');
const { requireLogin } = require('../middleware/auth');
const { searchJobs } = require('../services/worknet');
const { analyzeMatch } = require('../services/openai');
const { parsePortfolio } = require('./portfolio');

const router = express.Router();

function loadPortfolio(userId) {
    const db = getDb();
    const row = db.prepare('SELECT * FROM portfolios WHERE user_id = ?').get(userId);
    return parsePortfolio(row) || { desiredRole: '', desiredRegion: '', skills: [], projects: [] };
}

// 추천 공고: 워크넷 검색 + OpenAI/heuristic 으로 매칭 점수 부여
router.get('/recommend', requireLogin, async (req, res, next) => {
    try {
        const portfolio = loadPortfolio(req.session.userId);
        const jobs = await searchJobs({
            desiredRole: portfolio.desiredRole,
            desiredRegion: portfolio.desiredRegion,
            skills: portfolio.skills,
            careerLevel: portfolio.careerLevel
        });
        const analyzed = await Promise.all(jobs.map(async (job) => {
            const m = await analyzeMatch(portfolio, job);
            return { ...job, match: m };
        }));
        analyzed.sort((a, b) => (b.match.score || 0) - (a.match.score || 0));
        res.json({ portfolio, jobs: analyzed.slice(0, 12) });
    } catch (e) { next(e); }
});

// 특정 공고 선택 → DB 저장
router.post('/select', requireLogin, async (req, res, next) => {
    try {
        const { job, match, interviewAt, interviewAddress } = req.body || {};
        if (!job || !job.key) return res.status(400).json({ error: 'job.key 가 필요합니다.' });
        const db = getDb();
        const existing = db.prepare('SELECT id FROM selected_jobs WHERE user_id = ? AND job_key = ?')
            .get(req.session.userId, job.key);
        if (existing) {
            db.prepare(`UPDATE selected_jobs SET
                job_json = ?, match_score = ?, match_reason = ?, missing_skills = ?,
                interview_at = ?, interview_address = ?
                WHERE id = ?`)
                .run(JSON.stringify(job), match?.score || null, match?.reason || null,
                    JSON.stringify(match?.missingSkills || []),
                    interviewAt || null, interviewAddress || job.address || null,
                    existing.id);
            return res.json({ ok: true, selectedJobId: existing.id });
        }
        const info = db.prepare(`INSERT INTO selected_jobs
            (user_id, job_key, job_json, match_score, match_reason, missing_skills, interview_at, interview_address)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
            .run(req.session.userId, job.key, JSON.stringify(job),
                match?.score || null, match?.reason || null,
                JSON.stringify(match?.missingSkills || []),
                interviewAt || null, interviewAddress || job.address || null);
        res.json({ ok: true, selectedJobId: lastId(info) });
    } catch (e) { next(e); }
});

// 사용자가 선택한 공고 목록
router.get('/selected', requireLogin, (req, res) => {
    const db = getDb();
    const rows = db.prepare('SELECT * FROM selected_jobs WHERE user_id = ? ORDER BY selected_at DESC')
        .all(req.session.userId);
    res.json(rows.map(r => ({
        id: r.id,
        job: JSON.parse(r.job_json),
        match: { score: r.match_score, reason: r.match_reason, missingSkills: r.missing_skills ? JSON.parse(r.missing_skills) : [] },
        interviewAt: r.interview_at,
        interviewAddress: r.interview_address,
        selectedAt: r.selected_at
    })));
});

router.get('/selected/:id', requireLogin, (req, res) => {
    const db = getDb();
    const r = db.prepare('SELECT * FROM selected_jobs WHERE id = ? AND user_id = ?')
        .get(req.params.id, req.session.userId);
    if (!r) return res.status(404).json({ error: '선택된 공고를 찾을 수 없습니다.' });
    res.json({
        id: r.id,
        job: JSON.parse(r.job_json),
        match: { score: r.match_score, reason: r.match_reason, missingSkills: r.missing_skills ? JSON.parse(r.missing_skills) : [] },
        interviewAt: r.interview_at,
        interviewAddress: r.interview_address,
        selectedAt: r.selected_at
    });
});

router.patch('/selected/:id', requireLogin, (req, res) => {
    const db = getDb();
    const { interviewAt, interviewAddress } = req.body || {};
    const r = db.prepare('SELECT id FROM selected_jobs WHERE id = ? AND user_id = ?')
        .get(req.params.id, req.session.userId);
    if (!r) return res.status(404).json({ error: '선택된 공고를 찾을 수 없습니다.' });
    db.prepare('UPDATE selected_jobs SET interview_at = COALESCE(?, interview_at), interview_address = COALESCE(?, interview_address) WHERE id = ?')
        .run(interviewAt || null, interviewAddress || null, req.params.id);
    res.json({ ok: true });
});

router.delete('/selected/:id', requireLogin, (req, res) => {
    const db = getDb();
    db.prepare('DELETE FROM selected_jobs WHERE id = ? AND user_id = ?')
        .run(req.params.id, req.session.userId);
    res.json({ ok: true });
});

module.exports = router;

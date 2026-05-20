const express = require('express');
const { get, all, run } = require('../db');
const { requireLogin } = require('../middleware/auth');
const { searchJobs } = require('../services/worknet');
const { analyzeMatch } = require('../services/openai');
const { parsePortfolio } = require('./portfolio');

const router = express.Router();

async function loadPortfolio(userId) {
    const row = await get('SELECT * FROM portfolios WHERE user_id = ?', userId);
    return parsePortfolio(row) || { desiredRole: '', desiredRegion: '', skills: [], projects: [] };
}

router.get('/recommend', requireLogin, async (req, res, next) => {
    try {
        const portfolio = await loadPortfolio(req.session.userId);
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

router.post('/select', requireLogin, async (req, res, next) => {
    try {
        const { job, match, interviewAt, interviewAddress } = req.body || {};
        if (!job || !job.key) return res.status(400).json({ error: 'job.key 가 필요합니다.' });
        const existing = await get(
            'SELECT id FROM selected_jobs WHERE user_id = ? AND job_key = ?',
            req.session.userId, job.key
        );
        if (existing) {
            await run(
                `UPDATE selected_jobs SET
                    job_json = ?, match_score = ?, match_reason = ?, missing_skills = ?,
                    interview_at = ?, interview_address = ?
                 WHERE id = ?`,
                JSON.stringify(job), match?.score || null, match?.reason || null,
                JSON.stringify(match?.missingSkills || []),
                interviewAt || null, interviewAddress || job.address || null,
                existing.id
            );
            return res.json({ ok: true, selectedJobId: existing.id });
        }
        const info = await run(
            `INSERT INTO selected_jobs
                (user_id, job_key, job_json, match_score, match_reason, missing_skills, interview_at, interview_address)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            req.session.userId, job.key, JSON.stringify(job),
            match?.score || null, match?.reason || null,
            JSON.stringify(match?.missingSkills || []),
            interviewAt || null, interviewAddress || job.address || null
        );
        res.json({ ok: true, selectedJobId: info.lastInsertRowid });
    } catch (e) { next(e); }
});

router.get('/selected', requireLogin, async (req, res, next) => {
    try {
        const rows = await all(
            'SELECT * FROM selected_jobs WHERE user_id = ? ORDER BY selected_at DESC',
            req.session.userId
        );
        res.json(rows.map(r => ({
            id: r.id,
            job: JSON.parse(r.job_json),
            match: { score: r.match_score, reason: r.match_reason, missingSkills: r.missing_skills ? JSON.parse(r.missing_skills) : [] },
            interviewAt: r.interview_at,
            interviewAddress: r.interview_address,
            selectedAt: r.selected_at
        })));
    } catch (e) { next(e); }
});

router.get('/selected/:id', requireLogin, async (req, res, next) => {
    try {
        const r = await get('SELECT * FROM selected_jobs WHERE id = ? AND user_id = ?',
            req.params.id, req.session.userId);
        if (!r) return res.status(404).json({ error: '선택된 공고를 찾을 수 없습니다.' });
        res.json({
            id: r.id,
            job: JSON.parse(r.job_json),
            match: { score: r.match_score, reason: r.match_reason, missingSkills: r.missing_skills ? JSON.parse(r.missing_skills) : [] },
            interviewAt: r.interview_at,
            interviewAddress: r.interview_address,
            selectedAt: r.selected_at
        });
    } catch (e) { next(e); }
});

router.patch('/selected/:id', requireLogin, async (req, res, next) => {
    try {
        const { interviewAt, interviewAddress } = req.body || {};
        const r = await get('SELECT id FROM selected_jobs WHERE id = ? AND user_id = ?',
            req.params.id, req.session.userId);
        if (!r) return res.status(404).json({ error: '선택된 공고를 찾을 수 없습니다.' });
        await run(
            'UPDATE selected_jobs SET interview_at = COALESCE(?, interview_at), interview_address = COALESCE(?, interview_address) WHERE id = ?',
            interviewAt || null, interviewAddress || null, req.params.id
        );
        res.json({ ok: true });
    } catch (e) { next(e); }
});

router.delete('/selected/:id', requireLogin, async (req, res, next) => {
    try {
        await run('DELETE FROM selected_jobs WHERE id = ? AND user_id = ?',
            req.params.id, req.session.userId);
        res.json({ ok: true });
    } catch (e) { next(e); }
});

module.exports = router;

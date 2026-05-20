const express = require('express');
const { get, all, run, batch } = require('../db');
const { requireLogin } = require('../middleware/auth');
const { generateInterviewQuestions, evaluateAnswer } = require('../services/openai');
const { parsePortfolio } = require('./portfolio');

const router = express.Router();

async function getSelectedJob(userId, selectedJobId) {
    const r = await get('SELECT * FROM selected_jobs WHERE id = ? AND user_id = ?',
        selectedJobId, userId);
    if (!r) return null;
    return { id: r.id, job: JSON.parse(r.job_json) };
}

async function getPortfolio(userId) {
    const row = await get('SELECT * FROM portfolios WHERE user_id = ?', userId);
    return parsePortfolio(row) || { desiredRole: '', skills: [], projects: [] };
}

router.get('/:selectedJobId/questions', requireLogin, async (req, res, next) => {
    try {
        const sj = await getSelectedJob(req.session.userId, req.params.selectedJobId);
        if (!sj) return res.status(404).json({ error: '선택된 공고가 없습니다.' });
        let rows = await all('SELECT * FROM interview_qna WHERE selected_job_id = ? ORDER BY id', sj.id);
        if (rows.length === 0) {
            const portfolio = await getPortfolio(req.session.userId);
            const qs = await generateInterviewQuestions(portfolio, sj.job, 6);
            const stmts = qs.map(q => ({
                sql: 'INSERT INTO interview_qna (selected_job_id, question, question_type) VALUES (?, ?, ?)',
                args: [sj.id, q.question, q.type]
            }));
            await batch(stmts);
            rows = await all('SELECT * FROM interview_qna WHERE selected_job_id = ? ORDER BY id', sj.id);
        }
        res.json(rows.map(r => ({
            id: r.id,
            question: r.question,
            type: r.question_type,
            answer: r.answer || '',
            feedback: r.feedback_json ? JSON.parse(r.feedback_json) : null
        })));
    } catch (e) { next(e); }
});

router.post('/:selectedJobId/questions/regenerate', requireLogin, async (req, res, next) => {
    try {
        const sj = await getSelectedJob(req.session.userId, req.params.selectedJobId);
        if (!sj) return res.status(404).json({ error: '선택된 공고가 없습니다.' });
        await run('DELETE FROM interview_qna WHERE selected_job_id = ?', sj.id);
        const portfolio = await getPortfolio(req.session.userId);
        const qs = await generateInterviewQuestions(portfolio, sj.job, 6);
        const stmts = qs.map(q => ({
            sql: 'INSERT INTO interview_qna (selected_job_id, question, question_type) VALUES (?, ?, ?)',
            args: [sj.id, q.question, q.type]
        }));
        await batch(stmts);
        const rows = await all('SELECT * FROM interview_qna WHERE selected_job_id = ? ORDER BY id', sj.id);
        res.json(rows.map(r => ({ id: r.id, question: r.question, type: r.question_type, answer: '', feedback: null })));
    } catch (e) { next(e); }
});

router.post('/answer/:qnaId', requireLogin, async (req, res, next) => {
    try {
        const { answer } = req.body || {};
        if (typeof answer !== 'string' || !answer.trim()) {
            return res.status(400).json({ error: '답변을 입력하세요.' });
        }
        const qna = await get(
            `SELECT q.id AS q_id, q.question, q.question_type, s.user_id, s.job_json
             FROM interview_qna q
             JOIN selected_jobs s ON s.id = q.selected_job_id
             WHERE q.id = ?`,
            req.params.qnaId
        );
        if (!qna || qna.user_id !== req.session.userId) {
            return res.status(404).json({ error: '질문을 찾을 수 없습니다.' });
        }
        const portfolio = await getPortfolio(req.session.userId);
        const job = JSON.parse(qna.job_json);
        const feedback = await evaluateAnswer(qna.question, answer, portfolio, job);
        await run('UPDATE interview_qna SET answer = ?, feedback_json = ? WHERE id = ?',
            answer, JSON.stringify(feedback), req.params.qnaId);
        res.json({ ok: true, feedback });
    } catch (e) { next(e); }
});

module.exports = router;

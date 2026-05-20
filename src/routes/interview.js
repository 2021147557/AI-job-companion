const express = require('express');
const { getDb } = require('../db');
const { requireLogin } = require('../middleware/auth');
const { generateInterviewQuestions, evaluateAnswer } = require('../services/openai');
const { parsePortfolio } = require('./portfolio');

const router = express.Router();

function getSelectedJob(userId, selectedJobId) {
    const db = getDb();
    const r = db.prepare('SELECT * FROM selected_jobs WHERE id = ? AND user_id = ?')
        .get(selectedJobId, userId);
    if (!r) return null;
    return { id: r.id, job: JSON.parse(r.job_json) };
}

function getPortfolio(userId) {
    const db = getDb();
    const row = db.prepare('SELECT * FROM portfolios WHERE user_id = ?').get(userId);
    return parsePortfolio(row) || { desiredRole: '', skills: [], projects: [] };
}

// 모의 면접 질문 생성/조회
router.get('/:selectedJobId/questions', requireLogin, async (req, res, next) => {
    try {
        const db = getDb();
        const sj = getSelectedJob(req.session.userId, req.params.selectedJobId);
        if (!sj) return res.status(404).json({ error: '선택된 공고가 없습니다.' });
        let rows = db.prepare('SELECT * FROM interview_qna WHERE selected_job_id = ? ORDER BY id').all(sj.id);
        if (rows.length === 0) {
            const portfolio = getPortfolio(req.session.userId);
            const qs = await generateInterviewQuestions(portfolio, sj.job, 6);
            const insert = db.prepare('INSERT INTO interview_qna (selected_job_id, question, question_type) VALUES (?, ?, ?)');
            db.exec('BEGIN');
            try {
                for (const q of qs) insert.run(sj.id, q.question, q.type);
                db.exec('COMMIT');
            } catch (e) { db.exec('ROLLBACK'); throw e; }
            rows = db.prepare('SELECT * FROM interview_qna WHERE selected_job_id = ? ORDER BY id').all(sj.id);
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
        const db = getDb();
        const sj = getSelectedJob(req.session.userId, req.params.selectedJobId);
        if (!sj) return res.status(404).json({ error: '선택된 공고가 없습니다.' });
        db.prepare('DELETE FROM interview_qna WHERE selected_job_id = ?').run(sj.id);
        const portfolio = getPortfolio(req.session.userId);
        const qs = await generateInterviewQuestions(portfolio, sj.job, 6);
        const insert = db.prepare('INSERT INTO interview_qna (selected_job_id, question, question_type) VALUES (?, ?, ?)');
        db.exec('BEGIN');
        try {
            for (const q of qs) insert.run(sj.id, q.question, q.type);
            db.exec('COMMIT');
        } catch (e) { db.exec('ROLLBACK'); throw e; }
        const rows = db.prepare('SELECT * FROM interview_qna WHERE selected_job_id = ? ORDER BY id').all(sj.id);
        res.json(rows.map(r => ({ id: r.id, question: r.question, type: r.question_type, answer: '', feedback: null })));
    } catch (e) { next(e); }
});

// 답변 제출 → 피드백
router.post('/answer/:qnaId', requireLogin, async (req, res, next) => {
    try {
        const { answer } = req.body || {};
        if (typeof answer !== 'string' || !answer.trim()) {
            return res.status(400).json({ error: '답변을 입력하세요.' });
        }
        const db = getDb();
        const qna = db.prepare(`SELECT q.*, s.user_id, s.job_json FROM interview_qna q
            JOIN selected_jobs s ON s.id = q.selected_job_id
            WHERE q.id = ?`).get(req.params.qnaId);
        if (!qna || qna.user_id !== req.session.userId) {
            return res.status(404).json({ error: '질문을 찾을 수 없습니다.' });
        }
        const portfolio = getPortfolio(req.session.userId);
        const job = JSON.parse(qna.job_json);
        const feedback = await evaluateAnswer(qna.question, answer, portfolio, job);
        db.prepare('UPDATE interview_qna SET answer = ?, feedback_json = ? WHERE id = ?')
            .run(answer, JSON.stringify(feedback), req.params.qnaId);
        res.json({ ok: true, feedback });
    } catch (e) { next(e); }
});

module.exports = router;

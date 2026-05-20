const express = require('express');
const { getDb, lastId } = require('../db');
const { requireLogin } = require('../middleware/auth');
const { generateChecklist } = require('../services/openai');

const router = express.Router();

function getSelectedJob(userId, selectedJobId) {
    const db = getDb();
    const r = db.prepare('SELECT * FROM selected_jobs WHERE id = ? AND user_id = ?')
        .get(selectedJobId, userId);
    if (!r) return null;
    return r;
}

router.get('/:selectedJobId', requireLogin, async (req, res, next) => {
    try {
        const db = getDb();
        const sj = getSelectedJob(req.session.userId, req.params.selectedJobId);
        if (!sj) return res.status(404).json({ error: '선택된 공고가 없습니다.' });
        let rows = db.prepare('SELECT * FROM checklist_items WHERE selected_job_id = ? ORDER BY id').all(sj.id);
        if (rows.length === 0) {
            const job = JSON.parse(sj.job_json);
            const items = await generateChecklist({
                job,
                interviewAt: sj.interview_at,
                hasPortfolioPrint: false
            });
            const insert = db.prepare('INSERT INTO checklist_items (selected_job_id, text) VALUES (?, ?)');
            db.exec('BEGIN');
            try {
                for (const t of items) insert.run(sj.id, t);
                db.exec('COMMIT');
            } catch (e) { db.exec('ROLLBACK'); throw e; }
            rows = db.prepare('SELECT * FROM checklist_items WHERE selected_job_id = ? ORDER BY id').all(sj.id);
        }
        res.json(rows.map(r => ({ id: r.id, text: r.text, done: !!r.done })));
    } catch (e) { next(e); }
});

router.patch('/item/:id', requireLogin, (req, res) => {
    const { done } = req.body || {};
    const db = getDb();
    const row = db.prepare(`SELECT c.id, s.user_id FROM checklist_items c
        JOIN selected_jobs s ON s.id = c.selected_job_id WHERE c.id = ?`).get(req.params.id);
    if (!row || row.user_id !== req.session.userId) return res.status(404).json({ error: '항목을 찾을 수 없습니다.' });
    db.prepare('UPDATE checklist_items SET done = ? WHERE id = ?').run(done ? 1 : 0, req.params.id);
    res.json({ ok: true });
});

router.post('/:selectedJobId/item', requireLogin, (req, res) => {
    const { text } = req.body || {};
    if (!text || !text.trim()) return res.status(400).json({ error: '내용을 입력하세요.' });
    const sj = getSelectedJob(req.session.userId, req.params.selectedJobId);
    if (!sj) return res.status(404).json({ error: '선택된 공고가 없습니다.' });
    const db = getDb();
    const info = db.prepare('INSERT INTO checklist_items (selected_job_id, text) VALUES (?, ?)').run(sj.id, text.trim());
    res.json({ ok: true, id: lastId(info) });
});

router.delete('/item/:id', requireLogin, (req, res) => {
    const db = getDb();
    const row = db.prepare(`SELECT c.id, s.user_id FROM checklist_items c
        JOIN selected_jobs s ON s.id = c.selected_job_id WHERE c.id = ?`).get(req.params.id);
    if (!row || row.user_id !== req.session.userId) return res.status(404).json({ error: '항목을 찾을 수 없습니다.' });
    db.prepare('DELETE FROM checklist_items WHERE id = ?').run(req.params.id);
    res.json({ ok: true });
});

router.post('/:selectedJobId/regenerate', requireLogin, async (req, res, next) => {
    try {
        const db = getDb();
        const sj = getSelectedJob(req.session.userId, req.params.selectedJobId);
        if (!sj) return res.status(404).json({ error: '선택된 공고가 없습니다.' });
        const { currentLocation, hasPortfolioPrint } = req.body || {};
        db.prepare('DELETE FROM checklist_items WHERE selected_job_id = ?').run(sj.id);
        const job = JSON.parse(sj.job_json);
        const items = await generateChecklist({
            job, interviewAt: sj.interview_at, currentLocation, hasPortfolioPrint
        });
        const insert = db.prepare('INSERT INTO checklist_items (selected_job_id, text) VALUES (?, ?)');
        db.exec('BEGIN');
        try {
            for (const t of items) insert.run(sj.id, t);
            db.exec('COMMIT');
        } catch (e) { db.exec('ROLLBACK'); throw e; }
        const rows = db.prepare('SELECT * FROM checklist_items WHERE selected_job_id = ? ORDER BY id').all(sj.id);
        res.json(rows.map(r => ({ id: r.id, text: r.text, done: !!r.done })));
    } catch (e) { next(e); }
});

module.exports = router;

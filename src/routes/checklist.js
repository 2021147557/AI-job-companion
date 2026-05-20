const express = require('express');
const { get, all, run, batch } = require('../db');
const { requireLogin } = require('../middleware/auth');
const { generateChecklist } = require('../services/openai');

const router = express.Router();

async function getSelectedJob(userId, selectedJobId) {
    return await get('SELECT * FROM selected_jobs WHERE id = ? AND user_id = ?',
        selectedJobId, userId);
}

router.get('/:selectedJobId', requireLogin, async (req, res, next) => {
    try {
        const sj = await getSelectedJob(req.session.userId, req.params.selectedJobId);
        if (!sj) return res.status(404).json({ error: '선택된 공고가 없습니다.' });
        let rows = await all('SELECT * FROM checklist_items WHERE selected_job_id = ? ORDER BY id', sj.id);
        if (rows.length === 0) {
            const job = JSON.parse(sj.job_json);
            const items = await generateChecklist({
                job, interviewAt: sj.interview_at, hasPortfolioPrint: false
            });
            const stmts = items.map(t => ({
                sql: 'INSERT INTO checklist_items (selected_job_id, text) VALUES (?, ?)',
                args: [sj.id, t]
            }));
            await batch(stmts);
            rows = await all('SELECT * FROM checklist_items WHERE selected_job_id = ? ORDER BY id', sj.id);
        }
        res.json(rows.map(r => ({ id: r.id, text: r.text, done: !!r.done })));
    } catch (e) { next(e); }
});

router.patch('/item/:id', requireLogin, async (req, res, next) => {
    try {
        const { done } = req.body || {};
        const row = await get(
            `SELECT c.id, s.user_id FROM checklist_items c
             JOIN selected_jobs s ON s.id = c.selected_job_id WHERE c.id = ?`,
            req.params.id
        );
        if (!row || row.user_id !== req.session.userId) return res.status(404).json({ error: '항목을 찾을 수 없습니다.' });
        await run('UPDATE checklist_items SET done = ? WHERE id = ?', done ? 1 : 0, req.params.id);
        res.json({ ok: true });
    } catch (e) { next(e); }
});

router.post('/:selectedJobId/item', requireLogin, async (req, res, next) => {
    try {
        const { text } = req.body || {};
        if (!text || !text.trim()) return res.status(400).json({ error: '내용을 입력하세요.' });
        const sj = await getSelectedJob(req.session.userId, req.params.selectedJobId);
        if (!sj) return res.status(404).json({ error: '선택된 공고가 없습니다.' });
        const info = await run('INSERT INTO checklist_items (selected_job_id, text) VALUES (?, ?)', sj.id, text.trim());
        res.json({ ok: true, id: info.lastInsertRowid });
    } catch (e) { next(e); }
});

router.delete('/item/:id', requireLogin, async (req, res, next) => {
    try {
        const row = await get(
            `SELECT c.id, s.user_id FROM checklist_items c
             JOIN selected_jobs s ON s.id = c.selected_job_id WHERE c.id = ?`,
            req.params.id
        );
        if (!row || row.user_id !== req.session.userId) return res.status(404).json({ error: '항목을 찾을 수 없습니다.' });
        await run('DELETE FROM checklist_items WHERE id = ?', req.params.id);
        res.json({ ok: true });
    } catch (e) { next(e); }
});

router.post('/:selectedJobId/regenerate', requireLogin, async (req, res, next) => {
    try {
        const sj = await getSelectedJob(req.session.userId, req.params.selectedJobId);
        if (!sj) return res.status(404).json({ error: '선택된 공고가 없습니다.' });
        const { currentLocation, hasPortfolioPrint } = req.body || {};
        await run('DELETE FROM checklist_items WHERE selected_job_id = ?', sj.id);
        const job = JSON.parse(sj.job_json);
        const items = await generateChecklist({
            job, interviewAt: sj.interview_at, currentLocation, hasPortfolioPrint
        });
        const stmts = items.map(t => ({
            sql: 'INSERT INTO checklist_items (selected_job_id, text) VALUES (?, ?)',
            args: [sj.id, t]
        }));
        await batch(stmts);
        const rows = await all('SELECT * FROM checklist_items WHERE selected_job_id = ? ORDER BY id', sj.id);
        res.json(rows.map(r => ({ id: r.id, text: r.text, done: !!r.done })));
    } catch (e) { next(e); }
});

module.exports = router;

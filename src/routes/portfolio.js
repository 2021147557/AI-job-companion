const express = require('express');
const { get, run } = require('../db');
const { requireLogin } = require('../middleware/auth');

const router = express.Router();

function parsePortfolio(row) {
    if (!row) return null;
    return {
        desiredRole: row.desired_role || '',
        desiredRegion: row.desired_region || '',
        careerLevel: row.career_level || '',
        employmentType: row.employment_type || '',
        skills: row.skills_json ? JSON.parse(row.skills_json) : [],
        projects: row.projects_json ? JSON.parse(row.projects_json) : [],
        selfIntro: row.self_intro || '',
        updatedAt: row.updated_at
    };
}

router.get('/', requireLogin, async (req, res, next) => {
    try {
        const row = await get('SELECT * FROM portfolios WHERE user_id = ?', req.session.userId);
        res.json(parsePortfolio(row) || {
            desiredRole: '', desiredRegion: '', careerLevel: '', employmentType: '',
            skills: [], projects: [], selfIntro: ''
        });
    } catch (e) { next(e); }
});

router.put('/', requireLogin, async (req, res, next) => {
    try {
        const { desiredRole, desiredRegion, careerLevel, employmentType, skills, projects, selfIntro } = req.body || {};
        const skillsJson = JSON.stringify(Array.isArray(skills) ? skills : []);
        const projectsJson = JSON.stringify(Array.isArray(projects) ? projects : []);
        const existing = await get('SELECT id FROM portfolios WHERE user_id = ?', req.session.userId);
        if (existing) {
            await run(
                `UPDATE portfolios SET
                    desired_role = ?, desired_region = ?, career_level = ?, employment_type = ?,
                    skills_json = ?, projects_json = ?, self_intro = ?, updated_at = CURRENT_TIMESTAMP
                 WHERE user_id = ?`,
                desiredRole || '', desiredRegion || '', careerLevel || '', employmentType || '',
                skillsJson, projectsJson, selfIntro || '', req.session.userId
            );
        } else {
            await run(
                `INSERT INTO portfolios
                    (user_id, desired_role, desired_region, career_level, employment_type, skills_json, projects_json, self_intro)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                req.session.userId, desiredRole || '', desiredRegion || '', careerLevel || '',
                employmentType || '', skillsJson, projectsJson, selfIntro || ''
            );
        }
        res.json({ ok: true });
    } catch (e) { next(e); }
});

module.exports = router;
module.exports.parsePortfolio = parsePortfolio;

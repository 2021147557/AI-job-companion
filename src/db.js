/* =========================================================
   DB 어댑터: @libsql/client (SQLite 호환)
   - 로컬: file:./data/app.sqlite (TURSO_DATABASE_URL 미설정 시 기본값)
   - 배포: Turso (libSQL 클라우드, https URL + auth token)
   ========================================================= */

const path = require('path');
const fs = require('fs');
const { createClient } = require('@libsql/client');

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userid TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    email TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS portfolios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER UNIQUE NOT NULL,
    desired_role TEXT,
    desired_region TEXT,
    career_level TEXT,
    employment_type TEXT,
    skills_json TEXT,
    projects_json TEXT,
    self_intro TEXT,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS selected_jobs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    job_key TEXT NOT NULL,
    job_json TEXT NOT NULL,
    match_score REAL,
    match_reason TEXT,
    missing_skills TEXT,
    interview_at TEXT,
    interview_address TEXT,
    selected_at TEXT DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, job_key),
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS interview_qna (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    selected_job_id INTEGER NOT NULL,
    question TEXT NOT NULL,
    question_type TEXT,
    answer TEXT,
    feedback_json TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(selected_job_id) REFERENCES selected_jobs(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS checklist_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    selected_job_id INTEGER NOT NULL,
    text TEXT NOT NULL,
    done INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(selected_job_id) REFERENCES selected_jobs(id) ON DELETE CASCADE
);
`;

let _client = null;
let _initPromise = null;

function getClient() {
    if (_client) return _client;
    const url = process.env.TURSO_DATABASE_URL || 'file:./data/app.sqlite';
    if (url.startsWith('file:')) {
        const localPath = url.replace(/^file:/, '');
        const dir = path.dirname(path.resolve(localPath));
        if (dir && !fs.existsSync(dir)) {
            try { fs.mkdirSync(dir, { recursive: true }); } catch {}
        }
    }
    _client = createClient({
        url,
        authToken: process.env.TURSO_AUTH_TOKEN || undefined
    });
    return _client;
}

async function initDb() {
    if (_initPromise) return _initPromise;
    _initPromise = (async () => {
        const db = getClient();
        // libsql executeMultiple: 다중 DDL 일괄 실행 (args 없음)
        await db.executeMultiple(SCHEMA);
    })();
    return _initPromise;
}

// BigInt → Number 변환 (JSON 직렬화 호환)
function normalize(row) {
    if (!row) return null;
    const out = {};
    for (const k of Object.keys(row)) {
        const v = row[k];
        out[k] = typeof v === 'bigint' ? Number(v) : v;
    }
    return out;
}

async function get(sql, ...args) {
    await initDb();
    const r = await getClient().execute({ sql, args });
    return normalize(r.rows[0]);
}

async function all(sql, ...args) {
    await initDb();
    const r = await getClient().execute({ sql, args });
    return r.rows.map(normalize);
}

async function run(sql, ...args) {
    await initDb();
    const r = await getClient().execute({ sql, args });
    const lastInsertRowid = typeof r.lastInsertRowid === 'bigint' ? Number(r.lastInsertRowid) : r.lastInsertRowid;
    return { lastInsertRowid, rowsAffected: Number(r.rowsAffected) };
}

// 여러 statement 를 단일 트랜잭션으로 실행
async function batch(statements) {
    await initDb();
    return await getClient().batch(statements, 'write');
}

module.exports = { initDb, getClient, get, all, run, batch };

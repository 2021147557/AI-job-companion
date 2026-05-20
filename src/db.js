const path = require('path');
const fs = require('fs');
const { DatabaseSync } = require('node:sqlite');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_PATH = path.join(DATA_DIR, 'app.sqlite');

let db;

function initDb() {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    db = new DatabaseSync(DB_PATH);
    db.exec('PRAGMA journal_mode = WAL');
    db.exec('PRAGMA foreign_keys = ON');

    db.exec(`
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
    `);
}

function getDb() {
    if (!db) initDb();
    return db;
}

// node:sqlite 는 lastInsertRowid 를 BigInt 로 반환한다.
// session/JSON 직렬화 호환을 위해 Number 로 변환하는 헬퍼.
function lastId(info) {
    const v = info.lastInsertRowid;
    return typeof v === 'bigint' ? Number(v) : v;
}

module.exports = { initDb, getDb, lastId };

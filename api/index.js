// Vercel serverless function entry.
// 모든 /api/* 요청을 server.js (Express app) 으로 위임한다.
module.exports = require('../server');

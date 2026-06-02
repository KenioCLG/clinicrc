/**
 * auth.routes.js — Rotas de Autenticação
 */

const express = require('express');
const router = express.Router();
const { login, getSupportLink } = require('../auth');

// Rate limiter simples para login
const loginAttempts = new Map();
const WINDOW_MS = 60 * 1000; // 1 minuto
const MAX_ATTEMPTS = 5;

function rateLimit(req, res, next) {
  const ip = req.ip;
  const now = Date.now();
  const attempts = loginAttempts.get(ip) || [];
  const recent = attempts.filter(t => now - t < WINDOW_MS);

  if (recent.length >= MAX_ATTEMPTS) {
    return res.status(429).json({
      error: 'Muitas tentativas de login. Aguarde 1 minuto.'
    });
  }

  recent.push(now);
  loginAttempts.set(ip, recent);
  next();
}

// POST /auth/login
router.post('/login', rateLimit, async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Usuário e senha são obrigatórios.' });
  }

  try {
    const result = await login(username.trim(), password);

    if (!result) {
      return res.status(401).json({
        error: 'Usuário ou senha incorretos.',
        support: `Precisa de ajuda? Fale comigo: ${getSupportLink()}`,
      });
    }

    return res.json(result);
  } catch (err) {
    console.error('Erro no login:', err);
    return res.status(500).json({ error: 'Erro interno. Tente novamente.' });
  }
});

module.exports = router;

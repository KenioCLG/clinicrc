/**
 * auth.routes.js — Rotas de Autenticação
 */

const express = require('express');
const { body, validationResult } = require('express-validator');
const router = express.Router();
const { login, createUser, getSupportLink } = require('../auth');

// ─── Rate limiter in-memory para registro (max 5 por IP a cada 15min) ────────
const registerAttempts = new Map();
const REGISTER_WINDOW_MS = 15 * 60 * 1000;
const REGISTER_MAX = 5;

function registerRateLimit(req, res, next) {
  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip;
  const now = Date.now();
  const entry = registerAttempts.get(ip);

  if (entry && now - entry.start < REGISTER_WINDOW_MS) {
    if (entry.count >= REGISTER_MAX) {
      return res.status(429).json({ error: 'Muitas tentativas de cadastro. Tente novamente em 15 minutos.' });
    }
    entry.count++;
  } else {
    registerAttempts.set(ip, { count: 1, start: now });
  }

  // Limpeza periodica (a cada 100 entries)
  if (registerAttempts.size > 100) {
    for (const [key, val] of registerAttempts) {
      if (now - val.start > REGISTER_WINDOW_MS) registerAttempts.delete(key);
    }
  }

  next();
}

// POST /auth/login
router.post('/login', [
  body('username')
    .trim()
    .notEmpty().withMessage('Usuário é obrigatório.')
    .escape(),
  body('password')
    .notEmpty().withMessage('Senha é obrigatória.')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: errors.array()[0].msg });
  }

  const { username, password } = req.body;

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
    if (err.message && err.message.startsWith('Conta bloqueada')) {
      return res.status(429).json({ error: err.message });
    }
    console.error('Erro no login:', err);
    return res.status(500).json({ error: 'Erro interno. Tente novamente.' });
  }
});

// GET /auth/support
router.get('/support', (req, res) => {
  res.json({ whatsapp: getSupportLink() });
});

// POST /auth/register (rate limited: 5 por IP a cada 15min)
router.post('/register', registerRateLimit, [
  body('clinic_name').trim().notEmpty().withMessage('Nome da clínica é obrigatório.').escape(),
  body('username').trim().notEmpty().withMessage('Usuário é obrigatório.').isLength({ min: 3 }).withMessage('Usuário deve ter no mínimo 3 caracteres.').escape(),
  body('email').trim().isEmail().withMessage('E-mail inválido.').normalizeEmail(),
  body('password').isLength({ min: 6 }).withMessage('A senha deve ter no mínimo 6 caracteres.'),
  body('confirm_password').custom((value, { req }) => {
    if (value !== req.body.password) throw new Error('As senhas não coincidem.');
    return true;
  }),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: errors.array()[0].msg });
  }

  const { clinic_name, username, email, password } = req.body;

  try {
    await createUser(clinic_name, username, password, '', email);
    return res.status(201).json({ message: 'Conta criada com sucesso! Faça login para continuar.' });
  } catch (err) {
    if (err.code === '23505' || (err.message && err.message.includes('UNIQUE'))) {
      return res.status(409).json({ error: 'Usuário ou e-mail já cadastrado.' });
    }
    console.error('Erro no registro:', err);
    return res.status(500).json({ error: 'Erro interno. Tente novamente.' });
  }
});

module.exports = router;

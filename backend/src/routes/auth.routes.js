/**
 * auth.routes.js — Rotas de Autenticação
 */

const express = require('express');
const { body, validationResult } = require('express-validator');
const router = express.Router();
const { login, getSupportLink } = require('../auth');

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

module.exports = router;

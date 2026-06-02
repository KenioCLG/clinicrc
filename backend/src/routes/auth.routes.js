/**
 * auth.routes.js — Rotas de Autenticação
 *
 * ANALOGIA: Esta é a "portaria" do prédio.
 * POST /auth/login  → Entra com usuário e senha, recebe o crachá (JWT)
 */

const express = require('express');
const router = express.Router();
const { login, getSupportLink } = require('../auth');

// POST /auth/login
router.post('/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Usuário e senha são obrigatórios.' });
  }

  const result = login(username.trim(), password);

  if (!result) {
    return res.status(401).json({
      error: 'Usuário ou senha incorretos.',
      support: `Precisa de ajuda? Fale comigo: ${getSupportLink()}`,
    });
  }

  return res.json(result);
});

module.exports = router;

/**
 * auth.middleware.js — Middleware de Autenticação
 *
 * ANALOGIA: É o "detector de crachá" na entrada de cada sala.
 * Toda rota protegida passa por aqui primeiro.
 * Se o token for válido, libera a passagem e injeta os dados do usuário.
 * Se for inválido, bloqueia com 401.
 */

const { verifyToken } = require('../auth');
const { queryOne } = require('../db-helpers');

async function authMiddleware(req, res, next) {
  // Extrai o token do header Authorization: Bearer <token>
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token de autenticação não fornecido.' });
  }

  const payload = verifyToken(token);

  if (!payload) {
    return res.status(401).json({ error: 'Token inválido ou expirado. Faça login novamente.' });
  }

  // system_source vem no JWT (adicionado no login); fallback ao DB para tokens antigos
  let systemSource = payload.system_source || null;
  if (!systemSource) {
    try {
      const user = await queryOne('SELECT system_source FROM users WHERE id = ?', [payload.clinic_id]);
      systemSource = user?.system_source || 'cliniccorp';
    } catch {
      systemSource = 'cliniccorp';
    }
  }

  req.clinic = {
    id: payload.clinic_id,
    name: payload.clinic_name,
    username: payload.username,
    system_source: systemSource,
  };

  next();
}

module.exports = authMiddleware;


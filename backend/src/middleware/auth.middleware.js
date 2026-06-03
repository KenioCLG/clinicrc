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

  // Busca o system_source do usuário no banco (definido no onboarding)
  let systemSource = 'cliniccorp'; // fallback seguro
  try {
    const user = await queryOne('SELECT system_source FROM users WHERE id = ?', [payload.clinic_id]);
    if (user && user.system_source) {
      systemSource = user.system_source;
    }
  } catch {
    // Em caso de erro, usa o fallback — não bloqueia a request
  }

  // Injeta dados da clínica na request para uso nas rotas
  req.clinic = {
    id: payload.clinic_id,
    name: payload.clinic_name,
    username: payload.username,
    system_source: systemSource,
  };

  next();
}

module.exports = authMiddleware;


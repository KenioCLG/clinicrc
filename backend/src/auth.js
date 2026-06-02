/**
 * auth.js — Autenticação JWT (async — SQLite + PostgreSQL)
 *
 * ANALOGIA: O "porteiro" do sistema.
 * Recebe o crachá (username + senha), valida, e emite o passe JWT.
 */

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { queryOne, run } = require('./db-helpers');

// Chave secreta para assinar os tokens — em produção vem do .env
let JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  if (process.env.NODE_ENV === 'production') {
    console.error('❌ FATAL: JWT_SECRET não está definida. Configure a variável de ambiente.');
    process.exit(1);
  }
  // Em desenvolvimento, usa secret local (NÃO usar em produção!)
  console.warn('⚠️  JWT_SECRET não definida — usando secret de desenvolvimento.');
  JWT_SECRET = 'dev_only_clinicrc_secret_2024';
}
const WHATSAPP_SUPPORT = process.env.WHATSAPP_SUPPORT || 'https://wa.me/5581999999999';

/**
 * Cria um novo usuário/clínica
 */
async function createUser(clinicName, username, password, whatsapp = '') {
  const hash = bcrypt.hashSync(password, 10);
  return run(
    'INSERT INTO users (clinic_name, username, password, whatsapp) VALUES (?, ?, ?, ?)',
    [clinicName, username, hash, whatsapp]
  );
}

/**
 * Autentica e retorna JWT (ou null se credenciais inválidas)
 */
async function login(username, password) {
  const user = await queryOne('SELECT * FROM users WHERE username = ?', [username]);

  if (!user || !bcrypt.compareSync(password, user.password)) {
    return null;
  }

  const token = jwt.sign(
    { clinic_id: user.id, username: user.username, clinic_name: user.clinic_name },
    JWT_SECRET,
    { expiresIn: '24h' }
  );

  return { token, clinic_name: user.clinic_name, username: user.username };
}

/**
 * Verifica e decodifica um JWT
 */
function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

function getSupportLink() {
  return WHATSAPP_SUPPORT;
}

module.exports = { createUser, login, verifyToken, getSupportLink };

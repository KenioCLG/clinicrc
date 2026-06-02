/**
 * auth.js — Autenticação JWT
 *
 * ANALOGIA: Este módulo é o "porteiro" do sistema.
 * Ele recebe o crachá (username + senha), verifica se é válido,
 * e emite um passe temporário (JWT token) válido por 24h.
 * Qualquer porta protegida só abre com esse passe.
 */

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('./db');

// Chave secreta para assinar os tokens — em produção vem do .env
const JWT_SECRET = process.env.JWT_SECRET || 'clinicrc_secret_2024_change_in_production';
const WHATSAPP_SUPPORT = process.env.WHATSAPP_SUPPORT || 'https://wa.me/5581999999999';

/**
 * Cria um novo usuário/clínica
 * Usado pelo admin para cadastrar novos clientes
 */
function createUser(clinicName, username, password, whatsapp = '') {
  const hash = bcrypt.hashSync(password, 10);
  const stmt = db.prepare(`
    INSERT INTO users (clinic_name, username, password, whatsapp)
    VALUES (?, ?, ?, ?)
  `);
  return stmt.run(clinicName, username, hash, whatsapp);
}

/**
 * Autentica um usuário e retorna um JWT
 * Retorna null se credenciais inválidas
 */
function login(username, password) {
  // Busca o usuário pelo nome de acesso
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);

  // Usuário não existe ou senha incorreta
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return null;
  }

  // Gera o token com dados da clínica (expira em 24h)
  const token = jwt.sign(
    {
      clinic_id: user.id,
      username: user.username,
      clinic_name: user.clinic_name,
    },
    JWT_SECRET,
    { expiresIn: '24h' }
  );

  return {
    token,
    clinic_name: user.clinic_name,
    username: user.username,
  };
}

/**
 * Verifica e decodifica um JWT
 * Retorna o payload ou null se inválido/expirado
 */
function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

/**
 * Retorna o link de suporte WhatsApp
 */
function getSupportLink() {
  return WHATSAPP_SUPPORT;
}

module.exports = { createUser, login, verifyToken, getSupportLink };

/**
 * server.js — Entry Point do Servidor Express
 *
 * ANALOGIA: Este é o "centro de controle" do prédio.
 * Ele abre as portas (porta 3000), define as regras de entrada (CORS, JSON),
 * e direciona cada visitante para o departamento certo (rotas).
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const authRoutes = require('./routes/auth.routes');
const patientRoutes = require('./routes/patient.routes');
const uploadRoutes = require('./routes/upload.routes');
const { createUser } = require('./auth');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

// ─────────────────────────────────────────────
// MIDDLEWARES GLOBAIS
// ─────────────────────────────────────────────

// Permite requisições do frontend (CORS)
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Interpreta JSON no body das requisições
app.use(express.json());

// Serve os arquivos estáticos do frontend
app.use(express.static(path.join(__dirname, '..', '..', 'frontend', 'public')));

// ─────────────────────────────────────────────
// ROTAS DA API
// ─────────────────────────────────────────────
app.use('/auth', authRoutes);
app.use('/patients', patientRoutes);
app.use('/upload', uploadRoutes);

// Rota de health check (Railway usa isso para verificar se o app está vivo)
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Qualquer outra rota → serve o frontend (SPA fallback)
app.get('/{*path}', (req, res) => {
  res.sendFile(path.join(__dirname, '..', '..', 'frontend', 'public', 'index.html'));
});

// ─────────────────────────────────────────────
// INICIALIZAÇÃO
// ─────────────────────────────────────────────

// Cria usuário admin padrão se o banco estiver vazio
function seedAdminUser() {
  const count = db.prepare('SELECT COUNT(*) as cnt FROM users').get();
  if (count.cnt === 0) {
    createUser(
      'Administrador',
      process.env.ADMIN_USER || 'admin',
      process.env.ADMIN_PASS || 'admin123',
      process.env.WHATSAPP_SUPPORT || ''
    );
    console.log('👤 Usuário admin criado: admin / admin123');
    console.log('⚠️  Altere a senha em produção via /auth/login');
  }
}

app.listen(PORT, () => {
  console.log(`\n🚀 ClinicRC Server rodando em http://localhost:${PORT}`);
  console.log(`📁 Banco de dados: backend/data/clinicrc.db`);
  seedAdminUser();
});

module.exports = app;

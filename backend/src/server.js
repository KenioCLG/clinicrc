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

// Inicializa o banco (SQLite ou PostgreSQL via db.js)
require('./db');


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
app.use((req, res) => {
  res.sendFile(path.join(__dirname, '..', '..', 'frontend', 'public', 'index.html'));
});

// ─────────────────────────────────────────────
// INICIALIZAÇÃO
// ─────────────────────────────────────────────

// Cria usuário admin padrão se o banco estiver vazio
async function seedAdminUser() {
  const { queryOne } = require('./db-helpers');
  const count = await queryOne('SELECT COUNT(*) as cnt FROM users', []);
  const cnt = parseInt(count?.cnt || count?.count || 0);
  if (cnt === 0) {
    await createUser(
      'Administrador',
      process.env.ADMIN_USER || 'admin',
      process.env.ADMIN_PASS || 'admin123',
      process.env.WHATSAPP_SUPPORT || ''
    );
    console.log('👤 Usuário admin criado: ' + (process.env.ADMIN_USER || 'admin'));
  }
}

app.listen(PORT, () => {
  console.log(`\n🚀 ClinicRC Server rodando em http://localhost:${PORT}`);
  console.log(`📁 Banco de dados: backend/data/clinicrc.db`);
  seedAdminUser();
});

module.exports = app;

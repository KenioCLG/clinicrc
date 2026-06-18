/**
 * server.js — Entry Point do Servidor Express
 *
 * ANALOGIA: Este é o "centro de controle" do prédio.
 * Ele abre as portas (porta 3000), define as regras de entrada (CORS, JSON),
 * e direciona cada visitante para o departamento certo (rotas).
 */

const express = require('express');
const cors = require('cors');
const path = require('path');

const envPath = path.join(__dirname, '..', '..', '.env');
if (require('fs').existsSync(envPath)) {
  require('dotenv').config({ path: envPath });
}

const authRoutes = require('./routes/auth.routes');
const patientRoutes = require('./routes/patient.routes');
const uploadRoutes = require('./routes/upload.routes');
const scriptRoutes = require('./routes/script.routes');
const settingsRoutes = require('./routes/settings.routes');
const { createUser } = require('./auth');

// Inicializa o banco (SQLite ou PostgreSQL via db.js)
require('./db-postgres');


const app = express();
const PORT = process.env.PORT || 3000;

// ─────────────────────────────────────────────
// MIDDLEWARES GLOBAIS
// ─────────────────────────────────────────────

// Permite requisições do frontend (CORS)
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'https://clinicrc.vercel.app',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Interpreta JSON no body das requisições
app.use(express.json());

// Serve os arquivos estáticos do frontend — SEM CACHE agressivo
app.use(express.static(path.join(__dirname, '..', '..', 'frontend', 'public'), {
  etag: false,
  lastModified: false,
  setHeaders: (res, filePath) => {
    // HTML: nunca guardar na memória
    if (filePath.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    } else {
      // CSS/JS: revalidar sempre
      res.setHeader('Cache-Control', 'no-cache, must-revalidate');
    }
  }
}));

// ─────────────────────────────────────────────
// ROTAS DA API
// ─────────────────────────────────────────────
app.use('/auth', authRoutes);
app.use('/patients', patientRoutes);
app.use('/upload', uploadRoutes);
app.use('/api/scripts', scriptRoutes);
app.use('/settings', settingsRoutes);

// Rota de health check (também testa a conexão com o banco)
app.get('/health', async (req, res) => {
  try {
    const dbModule = require('./db-postgres');
    if (dbModule.ready) await dbModule.ready;
    res.json({ status: 'ok', database: 'connected', timestamp: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ status: 'error', database: 'failed', error: err.message });
  }
});

// Qualquer outra rota → serve o frontend (SPA fallback)
app.use((req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.sendFile(path.join(__dirname, '..', '..', 'frontend', 'public', 'index.html'));
});

// ─────────────────────────────────────────────
// MIDDLEWARE GLOBAL DE ERRO (A Rede de Segurança)
// ─────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('🚨 [Erro Global]', err.stack || err.message);
  res.status(500).json({
    error: 'Ocorreu um erro interno no servidor.',
    details: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// ─────────────────────────────────────────────
// INICIALIZAÇÃO
// ─────────────────────────────────────────────

// Cria usuário admin padrão se o banco estiver vazio
async function seedAdminUser() {
  const dbModule = require('./db-postgres');
  if (dbModule.ready) await dbModule.ready; // Aguarda Supabase criar tabelas

  const { queryOne } = require('./db-helpers');
  const count = await queryOne('SELECT COUNT(*) as cnt FROM users', []);
  const cnt = parseInt(count?.cnt || count?.count || 0);
  if (cnt === 0) {
    const { createUser } = require('./auth');
    await createUser(
      'Administrador',
      process.env.ADMIN_USER || 'admin',
      process.env.ADMIN_PASS || 'admin123',
      process.env.WHATSAPP_SUPPORT || ''
    );
    console.log('👤 Usuário admin criado: ' + (process.env.ADMIN_USER || 'admin'));
  }
}

// Inicia o servidor apenas se NÃO estiver rodando no Vercel (onde ele gerencia a porta sozinho)
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`\n🚀 ClinicRC Server rodando em http://localhost:${PORT}`);
    seedAdminUser().catch(console.error);
  });
} else {
  // No Vercel, apenas tenta garantir a tabela de admin na inicialização de forma async
  seedAdminUser().catch(err => console.error('SeedAdmin fail:', err.message));
}

module.exports = app;

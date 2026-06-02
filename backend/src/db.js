/**
 * db.js — Roteador de Banco de Dados
 *
 * ANALOGIA: É o "garçom" que olha o ambiente (local ou produção)
 * e serve o banco certo sem que o cliente precise saber qual é.
 *
 * LOCAL      → SQLite  (nenhuma configuração extra)
 * PRODUÇÃO   → PostgreSQL via Supabase  (DATABASE_URL no .env)
 */

const USE_POSTGRES = !!process.env.DATABASE_URL;

if (USE_POSTGRES) {
  console.log('🐘 Banco: PostgreSQL (Supabase)');
  module.exports = require('./db-postgres');
} else {
  console.log('🗃️  Banco: SQLite (local)');
  module.exports = require('./db-sqlite');
}

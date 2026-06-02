/**
 * db.js — Conexão e Schema do SQLite
 *
 * ANALOGIA: Este arquivo é o "almoxarifado" do sistema.
 * Ele abre a gaveta (banco de dados), organiza as prateleiras (tabelas)
 * e disponibiliza as ferramentas (funções) para todos os outros módulos.
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Garante que a pasta /data existe
const DATA_DIR = path.join(__dirname, '..', 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = path.join(DATA_DIR, 'clinicrc.db');

// Abre (ou cria) o banco de dados
const db = new Database(DB_PATH);

// Ativa WAL mode para melhor performance com múltiplos acessos
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ─────────────────────────────────────────────
// SCHEMA — Cria as tabelas se não existirem
// ─────────────────────────────────────────────
db.exec(`
  -- Tabela de usuários (1 usuário = 1 clínica)
  CREATE TABLE IF NOT EXISTS users (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    clinic_name  TEXT NOT NULL,
    username     TEXT NOT NULL UNIQUE,
    password     TEXT NOT NULL,
    whatsapp     TEXT DEFAULT '',
    created_at   DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- Tabela de pacientes (multi-tenant por clinic_id)
  CREATE TABLE IF NOT EXISTS patients (
    id              TEXT NOT NULL,
    clinic_id       INTEGER NOT NULL REFERENCES users(id),
    nome            TEXT NOT NULL,
    tel             TEXT NOT NULL,         -- apenas dígitos, chave de merge
    proc            TEXT NOT NULL DEFAULT '',
    valor           TEXT NOT NULL DEFAULT 'R$ 0,00',
    col             TEXT NOT NULL DEFAULT 'ligar',
    tent            INTEGER NOT NULL DEFAULT 0,
    obs             TEXT DEFAULT '',
    res             TEXT DEFAULT NULL,
    dt              TEXT DEFAULT NULL,

    -- Rastreabilidade da origem
    source          TEXT DEFAULT 'manual',    -- 'cliniccorp' | 'simples_dental' | 'manual'
    source_status   TEXT DEFAULT NULL,        -- status original da planilha
    profissional    TEXT DEFAULT NULL,
    data_orcamento  TEXT DEFAULT NULL,

    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id, clinic_id),
    UNIQUE(clinic_id, tel)  -- mesmo telefone = mesmo paciente na clínica
  );

  -- Histórico de uploads
  CREATE TABLE IF NOT EXISTS uploads (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    clinic_id    INTEGER NOT NULL REFERENCES users(id),
    filename     TEXT NOT NULL,
    source       TEXT NOT NULL,            -- 'cliniccorp' | 'simples_dental'
    total_rows   INTEGER DEFAULT 0,
    new_rows     INTEGER DEFAULT 0,
    updated_rows INTEGER DEFAULT 0,
    skipped_rows INTEGER DEFAULT 0,
    uploaded_at  DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// ─────────────────────────────────────────────
// Exporta o banco para uso nos outros módulos
// ─────────────────────────────────────────────
module.exports = db;

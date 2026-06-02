/**
 * db-sqlite.js — SQLite local (desenvolvimento)
 *
 * ANALOGIA: É o "caderno de rascunho" do desenvolvedor.
 * Funciona offline, sem precisar de conta em nenhum serviço.
 * Zero configuração — abre o arquivo e pronto.
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DATA_DIR = path.join(__dirname, '..', 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const DB_PATH = path.join(DATA_DIR, 'clinicrc.db');
const db = new Database(DB_PATH);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    clinic_name  TEXT NOT NULL,
    username     TEXT NOT NULL UNIQUE,
    password     TEXT NOT NULL,
    whatsapp     TEXT DEFAULT '',
    created_at   DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS patients (
    id              TEXT NOT NULL,
    clinic_id       INTEGER NOT NULL REFERENCES users(id),
    nome            TEXT NOT NULL,
    tel             TEXT NOT NULL,
    proc            TEXT NOT NULL DEFAULT '',
    valor           TEXT NOT NULL DEFAULT 'R$ 0,00',
    col             TEXT NOT NULL DEFAULT 'ligar',
    tent            INTEGER NOT NULL DEFAULT 0,
    obs             TEXT DEFAULT '',
    res             TEXT DEFAULT NULL,
    dt              TEXT DEFAULT NULL,
    source          TEXT DEFAULT 'manual',
    source_status   TEXT DEFAULT NULL,
    profissional    TEXT DEFAULT NULL,
    data_orcamento  TEXT DEFAULT NULL,
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id, clinic_id),
    UNIQUE(clinic_id, tel)
  );

  CREATE TABLE IF NOT EXISTS uploads (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    clinic_id    INTEGER NOT NULL REFERENCES users(id),
    filename     TEXT NOT NULL,
    source       TEXT NOT NULL,
    total_rows   INTEGER DEFAULT 0,
    new_rows     INTEGER DEFAULT 0,
    updated_rows INTEGER DEFAULT 0,
    skipped_rows INTEGER DEFAULT 0,
    uploaded_at  DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

module.exports = db;

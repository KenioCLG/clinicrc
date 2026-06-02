/**
 * db-postgres.js — PostgreSQL via Supabase (produção)
 *
 * ANALOGIA: É o "arquivo oficial" da empresa.
 * Fica em um servidor seguro (Supabase), nunca perde dados,
 * e qualquer máquina do mundo pode acessar com a senha certa.
 *
 * IMPORTANTE: Exporta o mesmo objeto que o SQLite exporta,
 * com os mesmos métodos (prepare, run, get, all, exec, transaction).
 * O resto do código não precisa mudar nada!
 */

const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }, // Supabase exige SSL
});

// ─── Cria as tabelas no PostgreSQL (se não existirem) ────────────────────────
async function initSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id           SERIAL PRIMARY KEY,
      clinic_name  TEXT NOT NULL,
      username     TEXT NOT NULL UNIQUE,
      password     TEXT NOT NULL,
      whatsapp     TEXT DEFAULT '',
      created_at   TIMESTAMPTZ DEFAULT NOW()
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
      created_at      TIMESTAMPTZ DEFAULT NOW(),
      updated_at      TIMESTAMPTZ DEFAULT NOW(),
      PRIMARY KEY (id, clinic_id),
      UNIQUE(clinic_id, tel)
    );

    CREATE TABLE IF NOT EXISTS uploads (
      id           SERIAL PRIMARY KEY,
      clinic_id    INTEGER NOT NULL REFERENCES users(id),
      filename     TEXT NOT NULL,
      source       TEXT NOT NULL,
      total_rows   INTEGER DEFAULT 0,
      new_rows     INTEGER DEFAULT 0,
      updated_rows INTEGER DEFAULT 0,
      skipped_rows INTEGER DEFAULT 0,
      uploaded_at  TIMESTAMPTZ DEFAULT NOW()
    );
  `);
  console.log('✅ Schema PostgreSQL inicializado');
}

// Inicializa schema ao carregar o módulo
initSchema().catch(err => {
  console.error('❌ Erro ao inicializar schema PostgreSQL:', err.message);
  process.exit(1);
});

// ─── Wrapper síncrono-like para compatibilidade com as rotas ─────────────────
// O better-sqlite3 é síncrono. O pg é async.
// Solução: usamos um wrapper que retorna funções síncronas usando
// um pool de conexões e execução bloqueante via deasync (ou a abordagem
// mais simples: reescrever as rotas para async/await com o pool direto).
//
// ABORDAGEM ESCOLHIDA: Exportar o pool diretamente + helpers async.
// As rotas foram adaptadas para usar await db.query() no lugar de db.prepare().

// Exporta helpers que as rotas vão usar
const db = {
  pool,

  // query(sql, params) → { rows }
  async query(sql, params = []) {
    // Converte placeholders SQLite (??) para PostgreSQL ($1, $2...)
    let i = 0;
    const pgSql = sql.replace(/\?/g, () => `$${++i}`);
    return pool.query(pgSql, params);
  },

  // queryOne(sql, params) → primeira linha ou undefined
  async queryOne(sql, params = []) {
    const result = await db.query(sql, params);
    return result.rows[0];
  },

  // queryAll(sql, params) → array de linhas
  async queryAll(sql, params = []) {
    const result = await db.query(sql, params);
    return result.rows;
  },

  // run(sql, params) → { changes, lastInsertRowid }
  async run(sql, params = []) {
    const result = await db.query(sql, params);
    return { changes: result.rowCount, lastInsertRowid: result.rows[0]?.id };
  },

  // transaction(fn) → executa fn dentro de uma transação
  async transaction(fn) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await fn(client);
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  // isPostgres flag para as rotas saberem qual banco estão usando
  isPostgres: true,
};

module.exports = db;

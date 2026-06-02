/**
 * db-helpers.js — Funções de acesso ao banco (SQLite ou PostgreSQL)
 *
 * ANALOGIA: É um "garçom bilíngue" — fala com SQLite e PostgreSQL
 * usando a mesma linguagem. As rotas chamam sempre as mesmas funções
 * e nunca precisam saber qual banco está por baixo.
 */

const db = require('./db');

// Detecta se está no modo PostgreSQL
const isPG = !!process.env.DATABASE_URL;

/**
 * Executa uma query e retorna TODOS os resultados
 */
async function queryAll(sql, params = []) {
  if (isPG) {
    return db.queryAll(sql, params);
  }
  // SQLite: prepare().all() é síncrono
  return db.prepare(sql).all(...params);
}

/**
 * Executa uma query e retorna O PRIMEIRO resultado
 */
async function queryOne(sql, params = []) {
  if (isPG) {
    return db.queryOne(sql, params);
  }
  return db.prepare(sql).get(...params);
}

/**
 * Executa uma query de escrita (INSERT/UPDATE/DELETE)
 * Retorna { changes }
 */
async function run(sql, params = []) {
  if (isPG) {
    return db.run(sql, params);
  }
  const result = db.prepare(sql).run(...params);
  return { changes: result.changes, lastInsertRowid: result.lastInsertRowid };
}

/**
 * Executa múltiplas operações em uma transação atômica
 * fn recebe um objeto com { queryAll, queryOne, run } dentro da transação
 */
async function transaction(fn) {
  if (isPG) {
    return db.transaction(async (client) => {
      const tx = {
        queryOne: async (sql, params = []) => {
          let i = 0;
          const pgSql = sql.replace(/\?/g, () => `$${++i}`);
          const r = await client.query(pgSql, params);
          return r.rows[0];
        },
        run: async (sql, params = []) => {
          let i = 0;
          const pgSql = sql.replace(/\?/g, () => `$${++i}`);
          const r = await client.query(pgSql, params);
          return { changes: r.rowCount };
        },
      };
      return fn(tx);
    });
  }
  // SQLite: transaction é síncrono
  return db.transaction(() => fn({
    queryOne: (sql, params) => db.prepare(sql).get(...params),
    run: (sql, params) => {
      const r = db.prepare(sql).run(...params);
      return { changes: r.changes };
    },
  }))();
}

module.exports = { queryAll, queryOne, run, transaction };

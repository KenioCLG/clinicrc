require('dotenv').config({ path: './.env' });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function run() {
  try {
    console.log('Buscando IDs dos usuários andreza e thames...');
    const usersRes = await pool.query(`SELECT id, username FROM users WHERE username IN ('andreza', 'thames')`);
    const users = usersRes.rows;
    
    if (users.length === 0) {
      console.log('Nenhum usuário encontrado.');
      return;
    }

    const userIds = users.map(u => u.id);
    console.log('Usuários encontrados:', users);

    console.log('Resetando tentativas para 0...');
    const updateRes = await pool.query(`
      UPDATE patients 
      SET tent = 0, col = 'ligar', status = NULL
      WHERE user_id = ANY($1) AND (tent > 0 OR col != 'ligar' OR status IS NOT NULL)
    `, [userIds]);

    console.log(`Sucesso! ${updateRes.rowCount} pacientes foram resetados e voltaram para fila (ligar).`);
  } catch (err) {
    console.error('Erro:', err);
  } finally {
    await pool.end();
  }
}

run();

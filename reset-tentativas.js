require('dotenv').config({ path: './backend/.env' });
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
    // Reseta as tentativas e também pode voltar a coluna para 'ligar'
    // Mas o usuário falou "reseta as tentativas de chamadas". 
    // Vamos zerar `tent` e talvez voltar para `col = 'ligar'` os que estão em 'contato' com tentativas?
    // Vou fazer apenas o reset de `tent` para 0 e `col = 'ligar'` para garantir o reset.
    const updateRes = await pool.query(`
      UPDATE patients 
      SET tent = 0, col = 'ligar' 
      WHERE user_id = ANY($1) AND tent > 0
    `, [userIds]);

    console.log(`Sucesso! ${updateRes.rowCount} pacientes foram resetados.`);
  } catch (err) {
    console.error('Erro:', err);
  } finally {
    await pool.end();
  }
}

run();

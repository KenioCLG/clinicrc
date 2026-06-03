/**
 * seed-clientes.js
 * Cria as contas das clínicas clientes no banco de dados.
 * Executar UMA VEZ: node seed-clientes.js
 */

// Removemos o chdir para evitar quebra de require no Windows
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
require('./backend/node_modules/dotenv').config({ path: './.env.vercel' }); 
require('./backend/node_modules/dotenv').config({ path: './backend/.env' });

const { createUser } = require('./backend/src/auth');
const { queryOne, queryAll } = require('./backend/src/db-helpers');

const clientes = [
  {
    clinic_name: 'Clínica Andreza Paz',
    username:    'andreza',
    password:    'Andreza@2025',
    whatsapp:    'https://wa.me/5581999999999', // ⚠️ TODO: SUBSTITUIR pelo número real antes do deploy!
  },
  {
    clinic_name: 'COP — Thames Bruno',
    username:    'thames',
    password:    'Thames@2025',
    whatsapp:    'https://wa.me/5581999999999', // ⚠️ TODO: SUBSTITUIR pelo número real antes do deploy!
  },
];

async function runSeed() {
  console.log('\n🌱 Criando contas das clínicas no banco de dados...\n');
  const dbModule = require('./backend/src/db');
  if (dbModule.ready) await dbModule.ready;

  for (const c of clientes) {
    // Verifica se o usuário já existe
    const existing = await queryOne('SELECT id FROM users WHERE username = ?', [c.username]);

    if (existing) {
      console.log(`⚠️  Usuário "${c.username}" já existe. Pulando.`);
      continue;
    }

    await createUser(c.clinic_name, c.username, c.password, c.whatsapp);
    console.log(`✅ Conta criada:`);
    console.log(`   Clínica : ${c.clinic_name}`);
    console.log(`   Usuário : ${c.username}`);
    console.log(`   Senha   : ${c.password}`);
    console.log('');
  }

  // Confirma no banco
  const all = await queryAll('SELECT id, clinic_name, username, created_at FROM users');
  console.log('📋 Usuários no banco agora:');
  console.table(all);
  process.exit(0);
}

runSeed().catch(err => {
  console.error('❌ Erro no seed:', err);
  process.exit(1);
});

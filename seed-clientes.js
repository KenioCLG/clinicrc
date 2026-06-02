/**
 * seed-clientes.js
 * Cria as contas das clínicas clientes no banco de dados.
 * Executar UMA VEZ: node seed-clientes.js
 */

// Muda para o diretório backend para resolver os módulos corretamente
process.chdir(__dirname + '/backend');
require('dotenv').config();
const { createUser } = require('./src/auth');
const db = require('./src/db');

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

console.log('\n🌱 Criando contas das clínicas...\n');

for (const c of clientes) {
  // Verifica se o usuário já existe
  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(c.username);

  if (existing) {
    console.log(`⚠️  Usuário "${c.username}" já existe. Pulando.`);
    continue;
  }

  createUser(c.clinic_name, c.username, c.password, c.whatsapp);
  console.log(`✅ Conta criada:`);
  console.log(`   Clínica : ${c.clinic_name}`);
  console.log(`   Usuário : ${c.username}`);
  console.log(`   Senha   : ${c.password}`);
  console.log('');
}

// Confirma no banco
const all = db.prepare('SELECT id, clinic_name, username, created_at FROM users').all();
console.log('📋 Usuários no banco agora:');
console.table(all);

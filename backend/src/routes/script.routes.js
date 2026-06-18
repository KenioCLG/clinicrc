const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth.middleware');
const db = require('../db-postgres'); // Alterado para usar apenas o PG em prod/dev

// ─── Default Scripts (Fallback) ──────────────────────────────────────────────
const defaultScripts = {
  1: `# Abordagem Inicial (1ª Tentativa)

> [!TIP]
> **COMPORTAMENTO E MOMENTO:** O paciente está frio. O objetivo é aquecer e criar curiosidade. Sorriso na voz!

Olá **#nome**, tudo bem? Aqui é da [Nome da sua Clínica].
Estou entrando em contato pois vi que você tem interesse no procedimento de **#procedimento**.

Temos uma condição especial liberada hoje: de #valor por #promo(30%).
Podemos agendar uma avaliação sem compromisso para você conhecer nossa estrutura?`,

  2: `# Quebra de Objeções (2ª Tentativa)

> [!WARNING]
> **COMPORTAMENTO E MOMENTO:** Paciente já sabe quem somos, mas está procrastinando. Aumentar o senso de urgência.

Oi **#nome**, tentei falar com você anteriormente sobre o seu tratamento de **#procedimento**.
Como os horários desta semana estão se esgotando rápido, reservei uma vaga prévia para você não perder a condição especial (de #valor por #promo(30%)).

Qual o melhor horário para você vir aqui na clínica? Manhã ou tarde?`,

  3: `# Prova Social (3ª Tentativa)

> [!TIP]
> **COMPORTAMENTO E MOMENTO:** O paciente precisa de confiança. Cite exemplos genéricos de sucesso.

Oi **#nome**, tudo bem?
Muitos pacientes que nos procuram para **#procedimento** tinham a mesma dúvida que você e hoje estão com a autoestima renovada!

Lembrando que o valor da tabela é #valor, mas conseguimos segurar a sua vaga promocional. Podemos confirmar?`,

  4: `# Escassez Real (4ª Tentativa)

> [!IMPORTANT]
> **COMPORTAMENTO E MOMENTO:** Última chamada antes de arquivar. Retirar a oferta da mesa para gerar medo de perda (FOMO).

Olá **#nome**.
Esta é a última semana que consigo manter a condição especial para o seu **#procedimento** (saindo de #valor por #promo(30%)). 

A partir de segunda-feira o valor volta ao normal. Você prefere garantir sua vaga agora ou deixamos para um próximo momento?`,

  5: `# Fechamento ou Arquivamento (5ª Tentativa)

> [!CAUTION]
> **COMPORTAMENTO E MOMENTO:** Desapego. Mostrar que você valoriza o tempo de ambos.

Oi **#nome**. Tentei contato algumas vezes sem sucesso.
Estou encerrando o seu protocolo de atendimento para o **#procedimento** e liberando a sua vaga promocional para outro paciente.

Caso tenha interesse no futuro, os valores voltarão ao normal de tabela (#valor). Um abraço e ficamos à disposição!`
};

router.use(authMiddleware);

// GET /config
router.get('/config', async (req, res) => {
  try {
    const row = await db.queryOne('SELECT max_attempts FROM users WHERE id = ?', [req.clinic.id]);
    res.json({ max_attempts: row ? row.max_attempts : 1 });
  } catch (err) {
    console.error('Erro ao buscar config:', err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// POST /config/add-attempt
router.post('/config/add-attempt', async (req, res) => {
  try {
    // Atomico: incrementa e retorna em uma unica query (sem race condition)
    const row = await db.queryOne(
      'UPDATE users SET max_attempts = max_attempts + 1 WHERE id = ? RETURNING max_attempts',
      [req.clinic.id]
    );
    res.json({ max_attempts: row ? row.max_attempts : 2 });
  } catch (err) {
    console.error('Erro ao adicionar tentativa:', err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// GET /scripts/:attempt_num
router.get('/:attempt_num', async (req, res) => {
  const attemptNum = parseInt(req.params.attempt_num, 10);
  if (isNaN(attemptNum) || attemptNum < 1) {
    return res.status(400).json({ error: 'Tentativa inválida.' });
  }

  try {
    const row = await db.queryOne(
      'SELECT content FROM scripts WHERE clinic_id = ? AND attempt_num = ?',
      [req.clinic.id, attemptNum]
    );

    if (row && row.content) {
      return res.json({ content: row.content });
    }

    // Retorna fallback
    return res.json({ content: defaultScripts[attemptNum] || '' });
  } catch (err) {
    console.error('Erro ao buscar script:', err);
    res.status(500).json({ error: 'Erro ao buscar o roteiro' });
  }
});

// PUT /scripts/:attempt_num
router.put('/:attempt_num', async (req, res) => {
  const attemptNum = parseInt(req.params.attempt_num, 10);
  const { content } = req.body;

  if (isNaN(attemptNum) || attemptNum < 1) {
    return res.status(400).json({ error: 'Tentativa inválida.' });
  }

  try {
    // Upsert (Insere ou atualiza)
    await db.run(`
      INSERT INTO scripts (clinic_id, attempt_num, content, updated_at)
      VALUES (?, ?, ?, NOW())
      ON CONFLICT (clinic_id, attempt_num) 
      DO UPDATE SET content = EXCLUDED.content, updated_at = NOW()
    `, [req.clinic.id, attemptNum, content || '']);

    res.json({ success: true });
  } catch (err) {
    console.error('Erro ao salvar script:', err);
    res.status(500).json({ error: 'Erro ao salvar o roteiro' });
  }
});

// DELETE /scripts/:attempt_num
router.delete('/:attempt_num', async (req, res) => {
  const attemptNum = parseInt(req.params.attempt_num, 10);
  if (isNaN(attemptNum) || attemptNum < 1) {
    return res.status(400).json({ error: 'Tentativa inválida.' });
  }

  try {
    const row = await db.queryOne('SELECT max_attempts FROM users WHERE id = ?', [req.clinic.id]);
    let currentMax = row ? row.max_attempts : 1;
    if (currentMax <= 1) {
      return res.status(400).json({ error: 'Você deve ter pelo menos 1 tentativa.' });
    }

    const novoMax = currentMax - 1;

    // Todas as operacoes em uma unica transacao para evitar estado inconsistente
    await db.transaction(async (tx) => {
      await tx.run('DELETE FROM scripts WHERE clinic_id = ? AND attempt_num = ?', [req.clinic.id, attemptNum]);
      await tx.run('UPDATE scripts SET attempt_num = attempt_num - 1 WHERE clinic_id = ? AND attempt_num > ?', [req.clinic.id, attemptNum]);
      await tx.run('UPDATE users SET max_attempts = ? WHERE id = ?', [novoMax, req.clinic.id]);
      await tx.run('UPDATE patients SET tent = tent - 1 WHERE clinic_id = ? AND tent >= ?', [req.clinic.id, attemptNum]);
    });

    res.json({ success: true, max_attempts: novoMax });
  } catch (err) {
    console.error('Erro ao apagar script:', err);
    res.status(500).json({ error: 'Erro interno ao apagar' });
  }
});

module.exports = router;

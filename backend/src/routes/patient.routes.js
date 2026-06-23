/**
 * patient.routes.js — Rotas de Pacientes (Multi-Tenant, async)
 */

const express = require('express');
const router = express.Router();
const { queryAll, queryOne, run } = require('../db-helpers');
const authMiddleware = require('../middleware/auth.middleware');

router.use(authMiddleware);

// POST /patients — Cadastra um novo Lead/Paciente manual
router.post('/', async (req, res) => {
  const clinicId = req.clinic.id;
  const { id, nome, tel, proc, valor, col, source, lead_temperature, strategy, obs, odonto_state, procedimentos_abertos } = req.body;

  if (!nome || !tel) {
    return res.status(400).json({ error: 'Nome e Telefone são obrigatórios.' });
  }

  try {
    // Verifica se já existe um paciente com este telefone na clínica
    const existing = await queryOne(
      'SELECT id FROM patients WHERE clinic_id = ? AND tel = ?',
      [clinicId, tel]
    );

    if (existing) {
      return res.status(400).json({ error: 'Já existe um paciente cadastrado com este telefone.' });
    }

    const newId = id || require('crypto').randomUUID();
    const finalCol = col || 'ligar';
    const finalSource = source || 'manual';
    const finalTemp = lead_temperature || 'warm';
    const finalStrategy = strategy || 'default';
    const finalValor = valor || 'R$ 0,00';
    const finalProc = proc || '';
    const finalObs = obs || '';
    const finalOdonto = odonto_state || '{}';
    const finalProcs = procedimentos_abertos || '[]';

    await run(
      `INSERT INTO patients (id, clinic_id, nome, tel, proc, valor, col, tent, obs, source, lead_temperature, strategy, odonto_state, procedimentos_abertos)
       VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?)`,
      [newId, clinicId, nome, tel, finalProc, finalValor, finalCol, finalObs, finalSource, finalTemp, finalStrategy, finalOdonto, finalProcs]
    );

    const created = await queryOne(
      'SELECT id, nome, tel, proc, valor, col, tent, obs, res, dt, source, source_status, profissional, data_orcamento, lead_temperature, strategy, odonto_state, procedimentos_abertos, created_at FROM patients WHERE clinic_id = ? AND id = ?',
      [clinicId, newId]
    );

    return res.status(201).json(created);
  } catch (err) {
    console.error('POST /patients erro:', err);
    return res.status(500).json({ error: 'Erro ao cadastrar lead.' });
  }
});

// GET /patients — Lista pacientes da clínica logada
router.get('/', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit) || 200));
    const offset = (page - 1) * limit;

    const totalRow = await queryOne('SELECT COUNT(*) as cnt FROM patients WHERE clinic_id = ?', [req.clinic.id]);
    const total = totalRow.cnt;

    const patients = await queryAll(
      'SELECT id, nome, tel, proc, valor, col, tent, obs, res, dt, source, source_status, profissional, data_orcamento, lead_temperature, strategy, odonto_state, procedimentos_abertos, created_at FROM patients WHERE clinic_id = ? ORDER BY created_at ASC LIMIT ? OFFSET ?',
      [req.clinic.id, limit, offset]
    );

    if (req.query.page || req.query.limit) {
      return res.json({ patients, total, page, limit });
    }
    return res.json(patients);
  } catch (err) {
    console.error('GET /patients erro:', err);
    return res.status(500).json({ error: 'Erro ao buscar pacientes.' });
  }
});

// PUT /patients/:tel — Atualiza dados Kanban de um paciente
router.put('/:tel', async (req, res) => {
  const clinicId = req.clinic.id;
  const tel = req.params.tel;
  const { col, tent, obs, res: resultado, dt, lead_temperature, strategy, source, nome, tel: newTel, proc, valor, odonto_state, procedimentos_abertos } = req.body || {};

  // Validação flexível de coluna do Kanban (para suportar colunas personalizadas)
  if (col !== undefined && (typeof col !== 'string' || col.length > 50)) {
    return res.status(400).json({ error: 'col deve ser uma string de no máximo 50 caracteres.' });
  }

  // Validação de tentativa (>= 0)
  if (tent !== undefined && (typeof tent !== 'number' || tent < 0)) {
    return res.status(400).json({ error: 'tent deve ser um número maior ou igual a 0.' });
  }

  try {
    const existing = await queryOne(
      'SELECT id FROM patients WHERE clinic_id = ? AND tel = ?',
      [clinicId, tel]
    );

    if (!existing) {
      return res.status(404).json({ error: 'Paciente não encontrado.' });
    }

    // Se o telefone foi atualizado, verifica se já existe outro paciente com esse novo telefone
    if (newTel && newTel !== tel) {
      const dupe = await queryOne(
        'SELECT id FROM patients WHERE clinic_id = ? AND tel = ? AND id != ?',
        [clinicId, newTel, existing.id]
      );
      if (dupe) {
        return res.status(400).json({ error: 'Já existe outro paciente cadastrado com este telefone novo.' });
      }
    }

    // Monta SET dinamico para evitar COALESCE (que ignora 0 e '')
    const sets = [];
    const params = [];
    if (col !== undefined)              { sets.push('col = ?');  params.push(col); }
    if (tent !== undefined)             { sets.push('tent = ?'); params.push(tent); }
    if (obs !== undefined)              { sets.push('obs = ?');  params.push(obs); }
    if (lead_temperature !== undefined) { sets.push('lead_temperature = ?'); params.push(lead_temperature); }
    if (strategy !== undefined)         { sets.push('strategy = ?'); params.push(strategy); }
    if (source !== undefined)           { sets.push('source = ?'); params.push(source); }
    if (nome !== undefined)             { sets.push('nome = ?'); params.push(nome); }
    if (newTel !== undefined)           { sets.push('tel = ?'); params.push(newTel); }
    if (proc !== undefined)             { sets.push('proc = ?'); params.push(proc); }
    if (valor !== undefined)            { sets.push('valor = ?'); params.push(valor); }
    if (odonto_state !== undefined)     { sets.push('odonto_state = ?'); params.push(odonto_state); }
    if (procedimentos_abertos !== undefined) { sets.push('procedimentos_abertos = ?'); params.push(procedimentos_abertos); }
    if (resultado !== undefined)            { sets.push('res = ?'); params.push(resultado ?? null); }
    if (dt !== undefined)                   { sets.push('dt = ?');  params.push(dt ?? null); }
    sets.push('updated_at = CURRENT_TIMESTAMP');
    params.push(clinicId, tel);

    await run(
      `UPDATE patients SET ${sets.join(', ')} WHERE clinic_id = ? AND tel = ?`,
      params
    );

    const targetTel = newTel || tel;
    const updated = await queryOne(
      'SELECT id, nome, tel, proc, valor, col, tent, obs, res, dt, source, source_status, profissional, data_orcamento, lead_temperature, strategy, odonto_state, procedimentos_abertos FROM patients WHERE clinic_id = ? AND tel = ?',
      [clinicId, targetTel]
    );
    return res.json(updated);
  } catch (err) {
    console.error('PUT /patients erro:', err);
    return res.status(500).json({ error: 'Erro ao atualizar paciente.' });
  }
});

// DELETE /patients/:tel
router.delete('/:tel', async (req, res) => {
  const clinicId = req.clinic.id;
  const tel = req.params.tel;

  try {
    const result = await run(
      'DELETE FROM patients WHERE clinic_id = ? AND tel = ?',
      [clinicId, tel]
    );

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Paciente não encontrado.' });
    }
    return res.json({ success: true });
  } catch (err) {
    console.error('DELETE /patients erro:', err);
    return res.status(500).json({ error: 'Erro ao remover paciente.' });
  }
});

// POST /patients/dev/reset — Reset Kanban (protegido por env var)
router.post('/dev/reset', async (req, res) => {
  const devPassword = process.env.DEV_RESET_PASSWORD;
  if (!devPassword) {
    return res.status(404).json({ error: 'Rota não disponível.' });
  }

  const clinicId = req.clinic.id;
  const { password } = req.body;

  if (!password || password !== devPassword) {
    return res.status(403).json({ error: 'Senha de desenvolvedor incorreta.' });
  }

  try {
    const result = await run(`
      UPDATE patients
      SET tent = 0, col = 'ligar', source_status = NULL
      WHERE clinic_id = ? AND (tent > 0 OR col != 'ligar')
    `, [clinicId]);

    return res.json({ success: true, changes: result.changes });
  } catch (err) {
    console.error('POST /patients/dev/reset erro:', err);
    return res.status(500).json({ error: 'Erro ao resetar tentativas.' });
  }
});

module.exports = router;

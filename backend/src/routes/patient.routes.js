/**
 * patient.routes.js — Rotas de Pacientes (Multi-Tenant, async)
 */

const express = require('express');
const router = express.Router();
const { queryAll, queryOne, run } = require('../db-helpers');
const authMiddleware = require('../middleware/auth.middleware');

router.use(authMiddleware);

// GET /patients — Lista pacientes da clínica logada
router.get('/', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit) || 200));
    const offset = (page - 1) * limit;

    const totalRow = await queryOne('SELECT COUNT(*) as cnt FROM patients WHERE clinic_id = ?', [req.clinic.id]);
    const total = totalRow.cnt;

    const patients = await queryAll(
      'SELECT id, nome, tel, proc, valor, col, tent, obs, res, dt, source, source_status, profissional, data_orcamento, created_at FROM patients WHERE clinic_id = ? ORDER BY created_at ASC LIMIT ? OFFSET ?',
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
  const { col, tent, obs, res: resultado, dt } = req.body;

  // Validação de coluna do Kanban
  const VALID_COLS = ['ligar', 'contato', 'agendado', 'final'];
  if (col !== undefined && !VALID_COLS.includes(col)) {
    return res.status(400).json({ error: `col inválida. Valores aceitos: ${VALID_COLS.join(', ')}` });
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

    // Monta SET dinamico para evitar COALESCE (que ignora 0 e '')
    const sets = [];
    const params = [];
    if (col !== undefined)       { sets.push('col = ?');  params.push(col); }
    if (tent !== undefined)      { sets.push('tent = ?'); params.push(tent); }
    if (obs !== undefined)       { sets.push('obs = ?');  params.push(obs); }
    sets.push('res = ?');  params.push(resultado ?? null);
    sets.push('dt = ?');   params.push(dt ?? null);
    sets.push('updated_at = CURRENT_TIMESTAMP');
    params.push(clinicId, tel);

    await run(
      `UPDATE patients SET ${sets.join(', ')} WHERE clinic_id = ? AND tel = ?`,
      params
    );

    const updated = await queryOne(
      'SELECT id, nome, tel, proc, valor, col, tent, obs, res, dt, source, source_status, profissional, data_orcamento FROM patients WHERE clinic_id = ? AND tel = ?',
      [clinicId, tel]
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

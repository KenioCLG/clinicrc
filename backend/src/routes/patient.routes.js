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
      'SELECT * FROM patients WHERE clinic_id = ? ORDER BY created_at ASC LIMIT ? OFFSET ?',
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

  // Validação de tentativa (0 a 5)
  if (tent !== undefined && (typeof tent !== 'number' || tent < 0 || tent > 5)) {
    return res.status(400).json({ error: 'tent deve ser um número entre 0 e 5.' });
  }

  try {
    const existing = await queryOne(
      'SELECT id FROM patients WHERE clinic_id = ? AND tel = ?',
      [clinicId, tel]
    );

    if (!existing) {
      return res.status(404).json({ error: 'Paciente não encontrado.' });
    }

    await run(
      `UPDATE patients
       SET col = COALESCE(?, col),
           tent = COALESCE(?, tent),
           obs = COALESCE(?, obs),
           res = ?,
           dt = ?,
           updated_at = CURRENT_TIMESTAMP
       WHERE clinic_id = ? AND tel = ?`,
      [col, tent, obs, resultado ?? null, dt ?? null, clinicId, tel]
    );

    const updated = await queryOne(
      'SELECT * FROM patients WHERE clinic_id = ? AND tel = ?',
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

module.exports = router;

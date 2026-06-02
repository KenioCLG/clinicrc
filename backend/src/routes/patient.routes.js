/**
 * patient.routes.js — Rotas de Pacientes (Multi-Tenant)
 *
 * ANALOGIA: É o "arquivo de prontuários" do sistema.
 * Cada médico (clínica) só consegue ver os prontuários dos seus próprios pacientes.
 * O authMiddleware garante que a clínica_id correto filtre os dados.
 *
 * GET  /patients          → Lista todos os pacientes da clínica logada
 * PUT  /patients/:tel     → Atualiza dados de um paciente (progresso no Kanban)
 * DELETE /patients/:tel   → Remove um paciente
 */

const express = require('express');
const router = express.Router();
const db = require('../db');
const authMiddleware = require('../middleware/auth.middleware');

// Todas as rotas aqui exigem autenticação
router.use(authMiddleware);

// ─────────────────────────────────────────────
// GET /patients — Lista pacientes da clínica
// ─────────────────────────────────────────────
router.get('/', (req, res) => {
  const clinicId = req.clinic.id;

  const patients = db.prepare(`
    SELECT * FROM patients
    WHERE clinic_id = ?
    ORDER BY created_at ASC
  `).all(clinicId);

  return res.json(patients);
});

// ─────────────────────────────────────────────
// PUT /patients/:tel — Atualiza um paciente
// ─────────────────────────────────────────────
router.put('/:tel', (req, res) => {
  const clinicId = req.clinic.id;
  const tel = req.params.tel;
  const { col, tent, obs, res: resultado, dt } = req.body;

  // Verifica se o paciente pertence a esta clínica
  const existing = db.prepare(`
    SELECT id FROM patients WHERE clinic_id = ? AND tel = ?
  `).get(clinicId, tel);

  if (!existing) {
    return res.status(404).json({ error: 'Paciente não encontrado.' });
  }

  // Atualiza apenas os campos do Kanban (preserva dados de origem)
  const stmt = db.prepare(`
    UPDATE patients
    SET col = COALESCE(?, col),
        tent = COALESCE(?, tent),
        obs = COALESCE(?, obs),
        res = ?,
        dt = ?,
        updated_at = CURRENT_TIMESTAMP
    WHERE clinic_id = ? AND tel = ?
  `);

  stmt.run(col, tent, obs, resultado ?? null, dt ?? null, clinicId, tel);

  const updated = db.prepare('SELECT * FROM patients WHERE clinic_id = ? AND tel = ?').get(clinicId, tel);
  return res.json(updated);
});

// ─────────────────────────────────────────────
// DELETE /patients/:tel — Remove um paciente
// ─────────────────────────────────────────────
router.delete('/:tel', (req, res) => {
  const clinicId = req.clinic.id;
  const tel = req.params.tel;

  const result = db.prepare(`
    DELETE FROM patients WHERE clinic_id = ? AND tel = ?
  `).run(clinicId, tel);

  if (result.changes === 0) {
    return res.status(404).json({ error: 'Paciente não encontrado.' });
  }

  return res.json({ success: true });
});

module.exports = router;

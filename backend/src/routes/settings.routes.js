/**
 * settings.routes.js — Configurações da clínica (cores white-label)
 */

const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth.middleware');
const db = require('../db-postgres');

// GET /settings — Carrega configurações da clínica logada
router.get('/', authMiddleware, async (req, res) => {
  try {
    const row = await db.queryOne(
      'SELECT settings FROM clinic_settings WHERE clinic_id = ?',
      [req.clinic.id]
    );
    const settings = row?.settings || {};
    return res.json({ settings });
  } catch (err) {
    console.error('Erro ao carregar settings:', err);
    return res.status(500).json({ error: 'Erro ao carregar configurações.' });
  }
});

// PUT /settings — Salva configurações da clínica logada
router.put('/', authMiddleware, async (req, res) => {
  try {
    const { settings } = req.body;
    if (!settings || typeof settings !== 'object') {
      return res.status(400).json({ error: 'settings deve ser um objeto JSON.' });
    }

    // Upsert: insere ou atualiza
    await db.query(
      `INSERT INTO clinic_settings (clinic_id, settings, updated_at)
       VALUES (?, ?::jsonb, NOW())
       ON CONFLICT (clinic_id)
       DO UPDATE SET settings = ?::jsonb, updated_at = NOW()`,
      [req.clinic.id, JSON.stringify(settings), JSON.stringify(settings)]
    );

    return res.json({ ok: true, settings });
  } catch (err) {
    console.error('Erro ao salvar settings:', err);
    return res.status(500).json({ error: 'Erro ao salvar configurações.' });
  }
});

module.exports = router;

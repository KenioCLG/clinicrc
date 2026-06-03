/**
 * upload.routes.js — Upload de Planilhas XLSX (async, multi-banco)
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const { queryOne, queryAll, run, transaction } = require('../db-helpers');
const authMiddleware = require('../middleware/auth.middleware');
const { parseClinicCorp } = require('../parsers/cliniccorp.parser');
const { parseSimplesDental } = require('../parsers/simples-dental.parser');

const storage = multer.memoryStorage(); // Vercel-friendly (não usa disco)

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (path.extname(file.originalname).toLowerCase() !== '.xlsx') {
      return cb(new Error('Apenas arquivos .xlsx são aceitos.'));
    }
    cb(null, true);
  },
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

router.use(authMiddleware);

// POST /upload — Processa planilha xlsx
router.post('/', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo enviado.' });

  // ── SOURCE é detectado automaticamente pelo perfil da clínica ────────────
  const source = req.clinic.system_source || 'cliniccorp';

  const clinicId = req.clinic.id;
  const filename = req.file.originalname;

  let patients = [];
  try {
    patients = source === 'cliniccorp'
      ? parseClinicCorp(req.file.buffer)
      : parseSimplesDental(req.file.buffer);
  } catch (err) {
    return res.status(422).json({ error: `Erro ao ler planilha: ${err.message}` });
  }

  const MAX_ROWS = 10000;
  if (patients.length > MAX_ROWS) {
    return res.status(422).json({
      error: `Planilha excede o limite de ${MAX_ROWS} pacientes (encontrados: ${patients.length}).`
    });
  }

  let newRows = 0, updatedRows = 0, skippedRows = 0;

  try {
    // ── MERGE TRANSACTION ────────────────────────────────────────────────────
    await transaction(async (tx) => {
      for (const p of patients) {
        const existing = await tx.queryOne(
          'SELECT id, proc, valor, source_status FROM patients WHERE clinic_id = ? AND tel = ?',
          [clinicId, p.tel]
        );

        if (!existing) {
          const newId = crypto.randomUUID();
          await tx.run(
            `INSERT INTO patients (id, clinic_id, nome, tel, proc, valor, source, source_status, profissional, data_orcamento)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [newId, clinicId, p.nome, p.tel, p.proc, p.valor, p.source, p.source_status, p.profissional, p.data_orcamento]
          );
          newRows++;
        } else {
          const changed = existing.proc !== p.proc || existing.valor !== p.valor || existing.source_status !== p.source_status;
          if (changed) {
            await tx.run(
              `UPDATE patients SET proc = ?, valor = ?, source_status = ?, updated_at = CURRENT_TIMESTAMP
               WHERE clinic_id = ? AND tel = ?`,
              [p.proc, p.valor, p.source_status, clinicId, p.tel]
            );
            updatedRows++;
          } else {
            skippedRows++;
          }
        }
      }
    });

    // Registra no histórico
    await run(
      `INSERT INTO uploads (clinic_id, filename, source, total_rows, new_rows, updated_rows, skipped_rows)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [clinicId, filename, source, patients.length, newRows, updatedRows, skippedRows]
    );

    return res.json({
      success: true,
      summary: { total: patients.length, new: newRows, updated: updatedRows, unchanged: skippedRows },
      message: `✅ ${newRows} novos, ${updatedRows} atualizados, ${skippedRows} sem mudança.`,
    });
  } catch (err) {
    console.error('Upload erro:', err);
    return res.status(500).json({ error: 'Erro ao processar planilha: ' + err.message });
  }
});

// GET /upload/history
router.get('/history', async (req, res) => {
  try {
    const history = await queryAll(
      'SELECT * FROM uploads WHERE clinic_id = ? ORDER BY uploaded_at DESC LIMIT 20',
      [req.clinic.id]
    );
    return res.json(history);
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao buscar histórico.' });
  }
});

module.exports = router;

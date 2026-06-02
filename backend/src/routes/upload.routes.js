/**
 * upload.routes.js — Rota de Upload de Planilhas XLSX
 *
 * ANALOGIA: É a "doca de carga" do sistema.
 * Recebe o arquivo xlsx, chama o parser correto (ClinicCorp ou Simples Dental),
 * e executa a lógica de merge: novos entram, existentes são atualizados se necessário.
 *
 * POST /upload — Envia a planilha xlsx
 *   Form-data:
 *     file   → o arquivo .xlsx
 *     source → 'cliniccorp' | 'simples_dental'
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const db = require('../db');
const authMiddleware = require('../middleware/auth.middleware');
const { parseClinicCorp } = require('../parsers/cliniccorp.parser');
const { parseSimplesDental } = require('../parsers/simples-dental.parser');

// Pasta temporária para uploads
const UPLOAD_DIR = path.join(__dirname, '..', '..', 'data', 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Configuração do Multer (aceita apenas .xlsx)
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e6);
    cb(null, unique + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext !== '.xlsx') {
      return cb(new Error('Apenas arquivos .xlsx são aceitos.'));
    }
    cb(null, true);
  },
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB máximo
});

router.use(authMiddleware);

// ─────────────────────────────────────────────
// POST /upload — Processa a planilha
// ─────────────────────────────────────────────
router.post('/', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
  }

  const source = req.body.source;
  if (!['cliniccorp', 'simples_dental'].includes(source)) {
    return res.status(400).json({ error: 'source deve ser "cliniccorp" ou "simples_dental".' });
  }

  const clinicId = req.clinic.id;
  const filepath = req.file.path;
  const filename = req.file.originalname;

  let patients = [];

  try {
    // Chama o parser correto baseado na origem
    if (source === 'cliniccorp') {
      patients = parseClinicCorp(filepath);
    } else {
      patients = parseSimplesDental(filepath);
    }
  } catch (err) {
    return res.status(422).json({ error: `Erro ao ler planilha: ${err.message}` });
  }

  // ─── LÓGICA DE MERGE ───────────────────────────────────────────────
  // Para cada paciente da planilha:
  //   - Se NÃO existe no banco (pelo telefone) → INSERE
  //   - Se JÁ existe → ATUALIZA apenas proc, valor e source_status
  //     mantendo o progresso do Kanban (col, tent, obs, res, dt)
  // ───────────────────────────────────────────────────────────────────

  let newRows = 0;
  let updatedRows = 0;
  let skippedRows = 0;

  // Usa uma transação para performance (tudo ou nada)
  const mergeTransaction = db.transaction((patientList) => {
    for (const p of patientList) {
      const existing = db.prepare(`
        SELECT id, proc, valor, source_status FROM patients
        WHERE clinic_id = ? AND tel = ?
      `).get(clinicId, p.tel);

      if (!existing) {
        // NOVO paciente — insere com status inicial
        const newId = crypto.randomUUID().split('-')[0].toUpperCase();
        db.prepare(`
          INSERT INTO patients (id, clinic_id, nome, tel, proc, valor, source, source_status, profissional, data_orcamento)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(newId, clinicId, p.nome, p.tel, p.proc, p.valor, p.source, p.source_status, p.profissional, p.data_orcamento);
        newRows++;
      } else {
        // EXISTENTE — atualiza dados do orçamento, preserva Kanban
        const changed = existing.proc !== p.proc ||
                        existing.valor !== p.valor ||
                        existing.source_status !== p.source_status;

        if (changed) {
          db.prepare(`
            UPDATE patients
            SET proc = ?, valor = ?, source_status = ?, updated_at = CURRENT_TIMESTAMP
            WHERE clinic_id = ? AND tel = ?
          `).run(p.proc, p.valor, p.source_status, clinicId, p.tel);
          updatedRows++;
        } else {
          skippedRows++;
        }
      }
    }
  });

  mergeTransaction(patients);

  // Registra o upload no histórico
  db.prepare(`
    INSERT INTO uploads (clinic_id, filename, source, total_rows, new_rows, updated_rows, skipped_rows)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(clinicId, filename, source, patients.length, newRows, updatedRows, skippedRows);

  // Remove arquivo temporário
  fs.unlink(filepath, () => {});

  return res.json({
    success: true,
    summary: {
      total: patients.length,
      new: newRows,
      updated: updatedRows,
      unchanged: skippedRows,
    },
    message: `✅ ${newRows} novos, ${updatedRows} atualizados, ${skippedRows} sem mudança.`,
  });
});

// GET /upload/history — Histórico de uploads da clínica
router.get('/history', (req, res) => {
  const clinicId = req.clinic.id;
  const history = db.prepare(`
    SELECT * FROM uploads WHERE clinic_id = ? ORDER BY uploaded_at DESC LIMIT 20
  `).all(clinicId);
  return res.json(history);
});

module.exports = router;

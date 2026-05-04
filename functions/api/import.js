const admin = require("firebase-admin");
const { XMLParser } = require("fast-xml-parser");
const XLSX = require("xlsx");
const Busboy = require("busboy");
const db = admin.firestore();

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_ROWS = 500;

// Parse uploaded file from multipart form
function parseUpload(req) {
  return new Promise((resolve, reject) => {
    const busboy = Busboy({
      headers: req.headers,
      limits: { fileSize: MAX_FILE_SIZE, files: 1 }
    });

    let fileBuffer = null;
    let fileName = "";
    let mimeType = "";

    busboy.on("file", (fieldname, file, info) => {
      fileName = info.filename || "";
      mimeType = info.mimeType || "";
      const chunks = [];

      file.on("data", (chunk) => chunks.push(chunk));
      file.on("end", () => { fileBuffer = Buffer.concat(chunks); });
      file.on("limit", () => reject(new Error("Arquivo muito grande (max 5MB)")));
    });

    busboy.on("finish", () => {
      if (!fileBuffer) return reject(new Error("Nenhum arquivo enviado"));
      resolve({ buffer: fileBuffer, name: fileName, mime: mimeType });
    });

    busboy.on("error", reject);
    busboy.end(req.rawBody);
  });
}

// Detect format and parse to array of objects
function parseFile(buffer, fileName) {
  const ext = fileName.toLowerCase().split(".").pop();

  if (ext === "xml") {
    return parseXML(buffer);
  } else if (["xlsx", "xls", "csv"].includes(ext)) {
    return parseSpreadsheet(buffer, ext);
  }

  throw new Error("Formato nao suportado. Use: XML, XLSX, XLS ou CSV");
}

function parseXML(buffer) {
  const parser = new XMLParser({
    ignoreAttributes: false,
    trimValues: true
  });

  const parsed = parser.parse(buffer.toString("utf-8"));

  // Try common XML structures
  let rows = [];

  if (parsed.patients && parsed.patients.patient) {
    rows = Array.isArray(parsed.patients.patient)
      ? parsed.patients.patient
      : [parsed.patients.patient];
  } else if (parsed.pacientes && parsed.pacientes.paciente) {
    rows = Array.isArray(parsed.pacientes.paciente)
      ? parsed.pacientes.paciente
      : [parsed.pacientes.paciente];
  } else if (parsed.data && parsed.data.row) {
    rows = Array.isArray(parsed.data.row)
      ? parsed.data.row
      : [parsed.data.row];
  } else {
    // Try to find first array in the structure
    for (const key of Object.keys(parsed)) {
      const val = parsed[key];
      if (typeof val === "object") {
        for (const subKey of Object.keys(val)) {
          if (Array.isArray(val[subKey])) {
            rows = val[subKey];
            break;
          }
        }
      }
      if (rows.length > 0) break;
    }
  }

  if (rows.length === 0) {
    throw new Error("Nenhum registro encontrado no XML");
  }

  return rows;
}

function parseSpreadsheet(buffer, ext) {
  const options = ext === "csv"
    ? { type: "buffer", codepage: 65001 }
    : { type: "buffer" };

  const workbook = XLSX.read(buffer, options);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });

  if (rows.length === 0) {
    throw new Error("Planilha vazia");
  }

  return rows;
}

function parseCurrency(value) {
  const clean = String(value || "0").replace(/[^\d.,-]/g, "");
  if (clean.includes(",") && clean.includes(".")) {
    return Number(clean.replace(/\./g, "").replace(",", ".")) || 0;
  }
  return Number(clean.replace(",", ".")) || 0;
}

function normalizeStatus(status) {
  const map = {
    ligar: "para_ligar",
    contato: "em_contato",
    final: "finalizado"
  };
  const value = map[status] || status;
  return ["para_ligar", "em_contato", "agendado", "finalizado"].includes(value)
    ? value
    : "para_ligar";
}

// Map raw data to patient schema
function mapToPatient(row) {
  // Flexible field mapping (supports PT and EN column names)
  const name = row.nome || row.name || row.Nome || row.Name || row.NOME || "";
  const phone = row.telefone || row.phone || row.tel || row.Phone || row.Telefone || row.TELEFONE || row.cel || row.celular || "";
  const procedure = row.procedimento || row.procedure || row.proc || row.Procedimento || row.Procedure || row.PROCEDIMENTO || row.servico || "";
  const value = row.valor || row.value || row.Value || row.Valor || row.VALOR || row.preco || 0;
  const notes = row.observacao || row.notes || row.Notes || row.obs || row.Obs || row.OBS || row.notas || "";
  const status = row.status || row.Status || row.col || "para_ligar";
  const attempts = row.tent || row.attempts || row.tentativas || 0;
  const result = row.res || row.result || null;

  if (!name || !phone) return null;

  return {
    name: String(name).trim(),
    phone: String(phone).trim().replace(/[^\d+()-\s]/g, ""),
    procedure: String(procedure).trim(),
    value: parseCurrency(value),
    notes: String(notes).trim(),
    status: normalizeStatus(status),
    attempts: Math.max(0, Math.min(5, Number(attempts) || 0)),
    result: ["agendou", "procedimento", "sem-interesse", "sem-resposta"].includes(result) ? result : null,
    finalizedAt: null,
    finalizedAtText: null,
    importedAt: admin.firestore.FieldValue.serverTimestamp(),
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  };
}

async function importPatients(req, res) {
  try {
    const file = await parseUpload(req);
    const rawRows = parseFile(file.buffer, file.name);

    if (rawRows.length > MAX_ROWS) {
      return res.status(400).json({
        error: `Maximo ${MAX_ROWS} registros por importacao. Arquivo tem ${rawRows.length}.`
      });
    }

    const patients = rawRows.map(mapToPatient).filter(Boolean);

    if (patients.length === 0) {
      return res.status(400).json({
        error: "Nenhum paciente valido encontrado. Colunas obrigatorias: nome/name, telefone/phone"
      });
    }

    // Batch write (max 500 per batch)
    const batch = db.batch();
    const collRef = db.collection("clinics").doc(req.uid).collection("patients");

    patients.forEach(p => {
      const docRef = collRef.doc();
      batch.set(docRef, p);
    });

    await batch.commit();

    res.status(201).json({
      imported: patients.length,
      skipped: rawRows.length - patients.length,
      total: rawRows.length,
      message: `${patients.length} pacientes importados com sucesso`
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

module.exports = { importPatients };

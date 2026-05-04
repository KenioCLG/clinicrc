const admin = require("firebase-admin");
const db = admin.firestore();

const VALID_STATUS = ["para_ligar", "em_contato", "agendado", "finalizado"];
const VALID_RESULTS = ["agendou", "procedimento", "sem-interesse", "sem-resposta"];

function validatePatient(data) {
  const errors = [];
  if (!data.name || typeof data.name !== "string" || data.name.trim().length < 2) {
    errors.push("Nome obrigatorio (min 2 caracteres)");
  }
  if (!data.phone || typeof data.phone !== "string" || data.phone.trim().length < 8) {
    errors.push("Telefone obrigatorio (min 8 digitos)");
  }
  return errors;
}

function normalizeStatus(status) {
  const map = {
    ligar: "para_ligar",
    contato: "em_contato",
    final: "finalizado"
  };
  const value = map[status] || status;
  return VALID_STATUS.includes(value) ? value : "para_ligar";
}

function sanitize(data) {
  const status = normalizeStatus(data.status || data.col);
  const result = VALID_RESULTS.includes(data.result || data.res) ? (data.result || data.res) : null;

  return {
    name: (data.name || data.nome || "").trim(),
    phone: (data.phone || data.tel || "").trim().replace(/[^\d+()-\s]/g, ""),
    procedure: (data.procedure || data.proc || "").trim(),
    value: Number(data.value) || 0,
    notes: (data.notes || data.obs || "").trim(),
    status,
    attempts: Math.max(0, Math.min(5, Number(data.attempts ?? data.tent) || 0)),
    result: status === "finalizado" ? result : null
  };
}

async function listPatients(req, res) {
  const { status } = req.query;
  let query = db.collection("clinics").doc(req.uid).collection("patients");

  if (status && VALID_STATUS.includes(status)) {
    query = query.where("status", "==", status);
  }

  const snap = await query.orderBy("createdAt", "desc").get();
  const patients = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  res.json(patients);
}

async function createPatient(req, res) {
  const errors = validatePatient(req.body);
  if (errors.length > 0) {
    return res.status(400).json({ errors });
  }

  const data = sanitize(req.body);
  data.createdAt = admin.firestore.FieldValue.serverTimestamp();
  data.updatedAt = admin.firestore.FieldValue.serverTimestamp();
  data.finalizedAt = null;
  data.finalizedAtText = null;

  const ref = await db.collection("clinics").doc(req.uid).collection("patients").add(data);
  res.status(201).json({ id: ref.id, ...data });
}

async function updatePatient(req, res) {
  const { patientId } = req.params;

  if (!patientId) {
    return res.status(400).json({ error: "ID do paciente obrigatorio" });
  }

  const ref = db.collection("clinics").doc(req.uid).collection("patients").doc(patientId);
  const doc = await ref.get();

  if (!doc.exists) {
    return res.status(404).json({ error: "Paciente nao encontrado" });
  }

  const data = sanitize({ ...doc.data(), ...req.body });
  data.updatedAt = admin.firestore.FieldValue.serverTimestamp();

  if (data.status === "finalizado") {
    data.finalizedAt = admin.firestore.FieldValue.serverTimestamp();
    data.finalizedAtText = new Date().toLocaleDateString("pt-BR");
  } else {
    data.finalizedAt = null;
    data.finalizedAtText = null;
    data.result = null;
  }

  await ref.update(data);
  res.json({ id: patientId, ...data });
}

async function deletePatient(req, res) {
  const { patientId } = req.params;

  const ref = db.collection("clinics").doc(req.uid).collection("patients").doc(patientId);
  const doc = await ref.get();

  if (!doc.exists) {
    return res.status(404).json({ error: "Paciente nao encontrado" });
  }

  await ref.delete();
  res.json({ deleted: patientId });
}

module.exports = { listPatients, createPatient, updatePatient, deletePatient };

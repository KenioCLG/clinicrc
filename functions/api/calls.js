const admin = require("firebase-admin");
const db = admin.firestore();

async function registerCall(req, res) {
  const { patientId, outcome, notes } = req.body;

  if (!patientId || typeof patientId !== "string") {
    return res.status(400).json({ error: "ID do paciente obrigatorio" });
  }

  const validOutcomes = ["atendeu", "nao_atendeu", "ocupado", "agendou", "recusou", "retornar"];
  if (!outcome || !validOutcomes.includes(outcome)) {
    return res.status(400).json({
      error: "Resultado obrigatorio: " + validOutcomes.join(", ")
    });
  }

  const patientRef = db.collection("clinics").doc(req.uid).collection("patients").doc(patientId);
  const patientDoc = await patientRef.get();

  if (!patientDoc.exists) {
    return res.status(404).json({ error: "Paciente nao encontrado" });
  }

  const patient = patientDoc.data();

  // Registrar a ligacao
  const call = {
    patientId,
    patientName: patient.name,
    outcome,
    notes: (notes || "").trim(),
    attemptNumber: (patient.attempts || 0) + 1,
    calledAt: admin.firestore.FieldValue.serverTimestamp()
  };

  await db.collection("clinics").doc(req.uid).collection("calls").add(call);

  // Atualizar status do paciente com base no resultado
  const statusMap = {
    agendou: "agendado",
    recusou: "finalizado",
    atendeu: "em_contato",
    nao_atendeu: "para_ligar",
    ocupado: "para_ligar",
    retornar: "em_contato"
  };

  await patientRef.update({
    attempts: (patient.attempts || 0) + 1,
    status: statusMap[outcome],
    lastCallOutcome: outcome,
    lastCallAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  });

  res.status(201).json(call);
}

async function listCalls(req, res) {
  const { patientId } = req.query;
  let query = db.collection("clinics").doc(req.uid).collection("calls");

  if (patientId) {
    query = query.where("patientId", "==", patientId);
  }

  const snap = await query.orderBy("calledAt", "desc").limit(100).get();
  const calls = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  res.json(calls);
}

async function getStats(req, res) {
  const patientsSnap = await db.collection("clinics").doc(req.uid).collection("patients").get();
  const callsSnap = await db.collection("clinics").doc(req.uid).collection("calls").get();

  const stats = {
    totalPatients: patientsSnap.size,
    totalCalls: callsSnap.size,
    byStatus: { para_ligar: 0, em_contato: 0, agendado: 0, finalizado: 0 },
    byOutcome: {}
  };

  patientsSnap.docs.forEach(d => {
    const s = d.data().status || "para_ligar";
    if (stats.byStatus[s] !== undefined) stats.byStatus[s]++;
  });

  callsSnap.docs.forEach(d => {
    const o = d.data().outcome || "unknown";
    stats.byOutcome[o] = (stats.byOutcome[o] || 0) + 1;
  });

  res.json(stats);
}

module.exports = { registerCall, listCalls, getStats };

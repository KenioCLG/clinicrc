const admin = require("firebase-admin");
const db = admin.firestore();

async function createClinic(req, res) {
  const { name } = req.body;

  if (!name || typeof name !== "string" || name.trim().length < 2) {
    return res.status(400).json({ error: "Nome da clinica obrigatorio (min 2 caracteres)" });
  }

  const existing = await db.collection("clinics").doc(req.uid).get();
  if (existing.exists) {
    return res.status(409).json({ error: "Clinica ja cadastrada para este usuario" });
  }

  const clinic = {
    name: name.trim(),
    ownerId: req.uid,
    email: req.email,
    plan: "free",
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  };

  await db.collection("clinics").doc(req.uid).set(clinic);
  res.status(201).json({ id: req.uid, ...clinic });
}

async function getClinic(req, res) {
  const doc = await db.collection("clinics").doc(req.uid).get();

  if (!doc.exists) {
    return res.status(404).json({ error: "Clinica nao encontrada" });
  }

  res.json({ id: doc.id, ...doc.data() });
}

async function updateClinic(req, res) {
  const { name } = req.body;
  const updates = {};

  if (name && typeof name === "string" && name.trim().length >= 2) {
    updates.name = name.trim();
  }

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: "Nenhum campo valido para atualizar" });
  }

  updates.updatedAt = admin.firestore.FieldValue.serverTimestamp();

  const doc = await db.collection("clinics").doc(req.uid).get();
  if (!doc.exists) {
    return res.status(404).json({ error: "Clinica nao encontrada" });
  }

  await db.collection("clinics").doc(req.uid).update(updates);
  res.json({ id: req.uid, ...updates });
}

module.exports = { createClinic, getClinic, updateClinic };

const admin = require("firebase-admin");
const functions = require("firebase-functions");
const cors = require("cors");

// Init Firebase Admin (backend has full access)
admin.initializeApp();

// Express-like handler using onRequest
const { verifyAuth } = require("./middleware/auth");
const { createClinic, getClinic, updateClinic } = require("./api/clinics");
const { listPatients, createPatient, updatePatient, deletePatient } = require("./api/patients");
const { registerCall, listCalls, getStats } = require("./api/calls");
const { importPatients } = require("./api/import");

// CORS config
const corsHandler = cors({ origin: true });

// Helper: wrap route with CORS + Auth + method check
function apiRoute(methods, handler) {
  return functions.https.onRequest((req, res) => {
    corsHandler(req, res, async () => {
      // Handle preflight
      if (req.method === "OPTIONS") return res.status(204).send("");

      // Check allowed methods
      if (!methods.includes(req.method)) {
        return res.status(405).json({ error: "Metodo nao permitido" });
      }

      // Verify auth
      await verifyAuth(req, res, async () => {
        try {
          await handler(req, res);
        } catch (err) {
          console.error("API Error:", err);
          res.status(500).json({ error: "Erro interno do servidor" });
        }
      });
    });
  });
}

// === ROUTES ===

// Clinics
exports.clinicCreate = apiRoute(["POST"], createClinic);
exports.clinicGet = apiRoute(["GET"], getClinic);
exports.clinicUpdate = apiRoute(["PUT", "PATCH"], updateClinic);

// Patients
exports.patientsList = apiRoute(["GET"], listPatients);
exports.patientsCreate = apiRoute(["POST"], createPatient);
exports.patientsUpdate = apiRoute(["PUT", "PATCH"], (req, res) => {
  req.params = { patientId: req.query.id };
  return updatePatient(req, res);
});
exports.patientsDelete = apiRoute(["DELETE"], (req, res) => {
  req.params = { patientId: req.query.id };
  return deletePatient(req, res);
});

// Calls
exports.callRegister = apiRoute(["POST"], registerCall);
exports.callsList = apiRoute(["GET"], listCalls);

// Stats
exports.stats = apiRoute(["GET"], getStats);

// Import (XML, XLSX, CSV)
exports.importPatients = apiRoute(["POST"], importPatients);

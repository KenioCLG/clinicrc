const admin = require("firebase-admin");

/**
 * Middleware: verifica token JWT do Firebase Auth.
 * Extrai o uid e anexa ao request.
 */
async function verifyAuth(req, res, next) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Token nao fornecido" });
  }

  const token = header.split("Bearer ")[1];

  try {
    const decoded = await admin.auth().verifyIdToken(token);
    req.uid = decoded.uid;
    req.email = decoded.email;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Token invalido ou expirado" });
  }
}

module.exports = { verifyAuth };

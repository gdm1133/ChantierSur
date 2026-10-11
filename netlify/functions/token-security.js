// CANARY-UNIQUE-20261011
// netlify/functions/token-security.js
const crypto = require('crypto');

const SECRET_KEY = process.env.PAYTECH_API_SECRET || process.env.TOKEN_SECRET || 'ChantierSur_Secure_Key_Production_20261011_Thies';
const TOKEN_TTL_MS = 60 * 60 * 1000; // 1 heure de validité

// Cache mémoire des tokens consommés (pour éviter la réutilisation d'un même lien partagé)
const usedTokens = new Set();
const activeDossiers = new Map(); // Stockage temporaire chiffré des données du dossier lié au jeton

function getSecret() {
  return crypto.createHash('sha256').update(SECRET_KEY).digest();
}

/**
 * Crée un jeton de téléchargement signé et unique
 */
function createDownloadToken(dossierData, service) {
  const nonce = crypto.randomBytes(16).toString('hex');
  const exp = Date.now() + TOKEN_TTL_MS;
  const payload = {
    service: service || 'audit',
    ref: dossierData.dossier || dossierData.reference || ('CS-' + Date.now()),
    clientNom: dossierData.client_name || dossierData.client?.nom || dossierData.identification?.nom || 'Client',
    clientEmail: dossierData.client_email || '',
    surface: dossierData.surface || 0,
    sdp: dossierData.sdp || 0,
    nonce,
    exp
  };

  const payloadStr = JSON.stringify(payload);
  const hmac = crypto.createHmac('sha256', getSecret()).update(payloadStr).digest('base64url');
  const token = Buffer.from(payloadStr).toString('base64url') + '.' + hmac;

  // Chiffrement des données du dossier en mémoire lié au jeton
  const cipher = crypto.createCipheriv('aes-256-cbc', getSecret(), Buffer.alloc(16, 0));
  let encrypted = cipher.update(JSON.stringify(dossierData), 'utf8', 'hex');
  encrypted += cipher.final('hex');

  activeDossiers.set(token, {
    encryptedData: encrypted,
    exp
  });

  return token;
}

/**
 * Vérifie l'authenticité, la validité et l'unicité d'un jeton
 */
function verifyAndConsumeToken(token, expectedService) {
  if (!token || typeof token !== 'string') {
    return { valid: false, error: 'Jeton manquant ou invalide' };
  }

  if (usedTokens.has(token)) {
    return { valid: false, error: 'Ce lien de téléchargement a déjà été utilisé (lien expiré).' };
  }

  const parts = token.split('.');
  if (parts.length !== 2) {
    return { valid: false, error: 'Format de jeton invalide' };
  }

  const [payloadB64, hmac] = parts;
  let payloadStr;
  try {
    payloadStr = Buffer.from(payloadB64, 'base64url').toString('utf8');
  } catch (e) {
    return { valid: false, error: 'Décodage du jeton impossible' };
  }

  const expectedHmac = crypto.createHmac('sha256', getSecret()).update(payloadStr).digest('base64url');
  if (hmac !== expectedHmac) {
    return { valid: false, error: 'Signature du jeton invalide' };
  }

  let payload;
  try {
    payload = JSON.parse(payloadStr);
  } catch (e) {
    return { valid: false, error: 'Contenu du jeton invalide' };
  }

  if (Date.now() > payload.exp) {
    return { valid: false, error: 'Ce lien de téléchargement est expiré (durée de validité dépassée).' };
  }

  if (expectedService && payload.service !== expectedService) {
    return { valid: false, error: 'Jeton non valide pour ce type de document.' };
  }

  // Marquer le jeton comme consommé (usage unique)
  usedTokens.add(token);

  // Récupérer les données du dossier associées si présentes
  let dossierData = null;
  const stored = activeDossiers.get(token);
  if (stored && stored.encryptedData) {
    try {
      const decipher = crypto.createDecipheriv('aes-256-cbc', getSecret(), Buffer.alloc(16, 0));
      let decrypted = decipher.update(stored.encryptedData, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      dossierData = JSON.parse(decrypted);
    } catch (e) {
      console.error('Erreur déchiffrement dossier:', e);
    }
    // Purge immédiate après récupération
    activeDossiers.delete(token);
  }

  return { valid: true, payload, dossierData };
}

module.exports = {
  createDownloadToken,
  verifyAndConsumeToken
};

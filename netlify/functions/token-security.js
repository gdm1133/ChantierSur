// CANARY-UNIQUE-20261011
// netlify/functions/token-security.js
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const os = require('os');

const TOKEN_TTL_MS = 60 * 60 * 1000; // 1 heure

function getSecret() {
  const secret = process.env.TOKEN_SECRET || process.env.PAYTECH_API_SECRET;
  if (!secret) {
    throw new Error("Configuration serveur invalide : la variable TOKEN_SECRET ou PAYTECH_API_SECRET est requise.");
  }
  return crypto.createHash('sha256').update(secret).digest();
}

// Persistance fichiers dans os.tmpdir() pour serverless multi-invocations
const TMP_DIR = os.tmpdir();
const USED_TOKENS_FILE = path.join(TMP_DIR, 'chantiersur_used_tokens.json');
const ORDERS_FILE = path.join(TMP_DIR, 'chantiersur_paid_orders.json');
const DOSSIERS_FILE = path.join(TMP_DIR, 'chantiersur_active_dossiers.json');

// Cache mémoire
const memoryUsedTokens = new Set();
const memoryOrders = new Map();
const memoryDossiers = new Map();

function loadJsonSafe(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf8') || '{}');
    }
  } catch (e) {
    console.warn('Erreur lecture cache fichier:', filePath, e.message);
  }
  return {};
}

function saveJsonSafe(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data), 'utf8');
  } catch (e) {
    console.warn('Erreur ecriture cache fichier:', filePath, e.message);
  }
}

/**
 * Crée un jeton de téléchargement signé contenant le dossier chiffré
 */
function createDownloadToken(dossierData, service) {
  const key = getSecret();
  const nonce = crypto.randomBytes(16).toString('hex');
  const exp = Date.now() + TOKEN_TTL_MS;
  const ref = dossierData.dossier || dossierData.ref_command || dossierData.reference || ('CS-' + Date.now());

  // Chiffrement fort des données du dossier avec clé serveur (AES-256-CBC + IV aléatoire)
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  const serialized = JSON.stringify(dossierData || {});
  let encrypted = cipher.update(serialized, 'utf8', 'base64url');
  encrypted += cipher.final('base64url');

  const payload = {
    service: service || 'audit',
    ref,
    clientNom: dossierData.client_name || (dossierData.client && (dossierData.client.nom || dossierData.client.name)) || (dossierData.identification && (dossierData.identification.client?.nom || dossierData.identification.nom)) || 'Maître d\'ouvrage',
    clientEmail: dossierData.client_email || (dossierData.client && dossierData.client.email) || '',
    surface: dossierData.surface || 0,
    sdp: dossierData.sdp || 0,
    nonce,
    exp,
    iv: iv.toString('base64url'),
    enc: encrypted
  };

  const payloadStr = JSON.stringify(payload);
  const hmac = crypto.createHmac('sha256', key).update(payloadStr).digest('base64url');
  const token = Buffer.from(payloadStr).toString('base64url') + '.' + hmac;

  // Enregistrement persistant de l'association commande -> jeton
  recordOrderToken(ref, token, service);

  // Sauvegarde persistante du dossier lié au jeton
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  memoryDossiers.set(tokenHash, { enc: encrypted, iv: iv.toString('base64url'), exp });
  const allDossiers = loadJsonSafe(DOSSIERS_FILE);
  allDossiers[tokenHash] = { enc: encrypted, iv: iv.toString('base64url'), exp };
  saveJsonSafe(DOSSIERS_FILE, allDossiers);

  return token;
}

/**
 * Enregistre la commande payée (utilisé par IPN PayTech)
 */
function recordOrderToken(ref, token, service) {
  if (!ref || !token) return;
  const item = { token, service, timestamp: Date.now() };
  memoryOrders.set(ref, item);
  const orders = loadJsonSafe(ORDERS_FILE);
  orders[ref] = item;
  saveJsonSafe(ORDERS_FILE, orders);
}

/**
 * Récupère le jeton validé pour une commande (utilisé par polling frontend après checkout)
 */
function getOrderToken(ref) {
  if (!ref) return null;
  if (memoryOrders.has(ref)) return memoryOrders.get(ref);
  const orders = loadJsonSafe(ORDERS_FILE);
  return orders[ref] || null;
}

/**
 * Vérifie l'authenticité, la validité et l'usage unique du jeton
 */
function verifyAndConsumeToken(token, expectedService) {
  if (!token || typeof token !== 'string') {
    return { valid: false, error: 'Jeton manquant ou invalide.' };
  }

  // 1. Vérification usage unique (mémoire + fichier persistant)
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  if (memoryUsedTokens.has(tokenHash)) {
    return { valid: false, error: 'Ce lien de téléchargement a déjà été utilisé (lien expiré).' };
  }
  const usedMap = loadJsonSafe(USED_TOKENS_FILE);
  if (usedMap[tokenHash]) {
    return { valid: false, error: 'Ce lien de téléchargement a déjà été utilisé (lien expiré).' };
  }

  const parts = token.split('.');
  if (parts.length !== 2) {
    return { valid: false, error: 'Format de jeton invalide.' };
  }

  const [payloadB64, hmac] = parts;
  let payloadStr;
  try {
    payloadStr = Buffer.from(payloadB64, 'base64url').toString('utf8');
  } catch (e) {
    return { valid: false, error: 'Décodage du jeton impossible.' };
  }

  let key;
  try {
    key = getSecret();
  } catch (e) {
    return { valid: false, error: e.message };
  }

  const expectedHmac = crypto.createHmac('sha256', key).update(payloadStr).digest('base64url');
  if (hmac !== expectedHmac) {
    return { valid: false, error: 'Signature du jeton invalide.' };
  }

  let payload;
  try {
    payload = JSON.parse(payloadStr);
  } catch (e) {
    return { valid: false, error: 'Contenu du jeton invalide.' };
  }

  if (Date.now() > payload.exp) {
    return { valid: false, error: 'Ce lien de téléchargement est expiré (durée de validité dépassée).' };
  }

  if (expectedService && payload.service !== expectedService) {
    return { valid: false, error: 'Jeton non valide pour ce type de document.' };
  }

  // Déchiffrement sécurisé des données du dossier
  let dossierData = null;
  try {
    if (payload.enc && payload.iv) {
      const decipher = crypto.createDecipheriv('aes-256-cbc', key, Buffer.from(payload.iv, 'base64url'));
      let decrypted = decipher.update(payload.enc, 'base64url', 'utf8');
      decrypted += decipher.final('utf8');
      dossierData = JSON.parse(decrypted);
    }
  } catch (e) {
    console.error('Erreur déchiffrement dossier depuis jeton:', e.message);
  }

  // Consommation : marquage usage unique (mémoire + fichier persistant)
  memoryUsedTokens.add(tokenHash);
  usedMap[tokenHash] = Date.now();
  saveJsonSafe(USED_TOKENS_FILE, usedMap);

  // Purge du stockage temporaire des dossiers
  memoryDossiers.delete(tokenHash);
  const allDossiers = loadJsonSafe(DOSSIERS_FILE);
  if (allDossiers[tokenHash]) {
    delete allDossiers[tokenHash];
    saveJsonSafe(DOSSIERS_FILE, allDossiers);
  }

  return { valid: true, payload, dossierData };
}

module.exports = {
  createDownloadToken,
  verifyAndConsumeToken,
  recordOrderToken,
  getOrderToken
};

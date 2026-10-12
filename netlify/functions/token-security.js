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
 * Enregistre le dossier de manière chiffrée côté serveur sous une référence de commande
 */
function saveActiveDossier(ref, dossierData, service) {
  if (!ref || !dossierData) return;
  try {
    const key = getSecret();
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    const serialized = JSON.stringify(dossierData || {});
    let enc = cipher.update(serialized, 'utf8', 'base64url');
    enc += cipher.final('base64url');

    const record = {
      enc,
      iv: iv.toString('base64url'),
      ref,
      service: service || 'audit',
      timestamp: Date.now()
    };
    memoryDossiers.set(ref, record);
    const allDossiers = loadJsonSafe(DOSSIERS_FILE);
    allDossiers[ref] = record;
    saveJsonSafe(DOSSIERS_FILE, allDossiers);
  } catch (e) {
    console.error('Erreur sauvegarde dossier serveur:', e.message);
  }
}

/**
 * Récupère et déchiffre un dossier actif par sa référence
 */
function getActiveDossier(ref) {
  if (!ref) return null;
  let record = memoryDossiers.get(ref);
  if (!record) {
    const allDossiers = loadJsonSafe(DOSSIERS_FILE);
    record = allDossiers[ref];
  }
  if (!record || !record.enc || !record.iv) return null;
  try {
    const key = getSecret();
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, Buffer.from(record.iv, 'base64url'));
    let decrypted = decipher.update(record.enc, 'base64url', 'utf8');
    decrypted += decipher.final('utf8');
    return JSON.parse(decrypted);
  } catch (e) {
    console.error('Erreur déchiffrement dossier actif:', e.message);
    return null;
  }
}

/**
 * Crée un jeton de téléchargement signé LÉGER (B7)
 * Le jeton ne contient QUE { service, ref, nonce, exp } + HMAC.
 * Le dossier est conservé chiffré côté serveur dans le stockage persistant.
 */
function createDownloadToken(dossierData, service) {
  const key = getSecret();
  const nonce = crypto.randomBytes(16).toString('hex');
  const exp = Date.now() + TOKEN_TTL_MS;
  const ref = (dossierData && (dossierData.dossier || dossierData.ref_command || dossierData.reference)) || ('CS-' + Date.now());

  // 1. Sauvegarde chiffrée du dossier complet côté serveur
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  const serialized = JSON.stringify(dossierData || {});
  let encrypted = cipher.update(serialized, 'utf8', 'base64url');
  encrypted += cipher.final('base64url');

  const dossierRecord = {
    enc: encrypted,
    iv: iv.toString('base64url'),
    service: service || 'audit',
    ref,
    exp,
    timestamp: Date.now()
  };

  // 2. Jeton léger signé par HMAC-SHA256 (environ 150-180 caractères, compatible URL sans tronquage)
  const payload = {
    service: service || 'audit',
    ref,
    nonce,
    exp
  };
  const payloadStr = JSON.stringify(payload);
  const hmac = crypto.createHmac('sha256', key).update(payloadStr).digest('base64url');
  const token = Buffer.from(payloadStr).toString('base64url') + '.' + hmac;

  // Lier le dossier au hash du jeton et à la référence
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  memoryDossiers.set(tokenHash, dossierRecord);
  memoryDossiers.set(ref, dossierRecord);
  const allDossiers = loadJsonSafe(DOSSIERS_FILE);
  allDossiers[tokenHash] = dossierRecord;
  allDossiers[ref] = dossierRecord;
  saveJsonSafe(DOSSIERS_FILE, allDossiers);

  // Enregistrement persistant de l'association commande -> jeton
  recordOrderToken(ref, token, service);

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
 * Récupère le dossier côté serveur et purge après usage.
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

  // Récupération sécurisée du dossier depuis le stockage serveur persistant
  let dossierData = null;
  const allDossiers = loadJsonSafe(DOSSIERS_FILE);
  const record = memoryDossiers.get(tokenHash) || memoryDossiers.get(payload.ref) || allDossiers[tokenHash] || allDossiers[payload.ref];

  if (record && record.enc && record.iv) {
    try {
      const decipher = crypto.createDecipheriv('aes-256-cbc', key, Buffer.from(record.iv, 'base64url'));
      let decrypted = decipher.update(record.enc, 'base64url', 'utf8');
      decrypted += decipher.final('utf8');
      dossierData = JSON.parse(decrypted);
    } catch (e) {
      console.error('Erreur déchiffrement dossier serveur:', e.message);
    }
  }

  // Consommation : marquage usage unique (mémoire + fichier persistant)
  memoryUsedTokens.add(tokenHash);
  usedMap[tokenHash] = Date.now();
  saveJsonSafe(USED_TOKENS_FILE, usedMap);

  // Purge du stockage temporaire des dossiers
  memoryDossiers.delete(tokenHash);
  if (payload.ref) memoryDossiers.delete(payload.ref);
  if (allDossiers[tokenHash]) delete allDossiers[tokenHash];
  if (payload.ref && allDossiers[payload.ref]) delete allDossiers[payload.ref];
  saveJsonSafe(DOSSIERS_FILE, allDossiers);

  return { valid: true, payload, dossierData, data: dossierData };
}

module.exports = {
  createDownloadToken,
  verifyAndConsumeToken,
  recordOrderToken,
  getOrderToken,
  saveActiveDossier,
  getActiveDossier
};

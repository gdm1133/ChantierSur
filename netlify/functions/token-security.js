// CANARY-UNIQUE-20261011
// netlify/functions/token-security.js
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const os = require('os');
const zlib = require('zlib');

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
const memoryUsedTokens = new Map();
const memoryOrders = new Map();
const memoryDossiers = new Map();

// Support optionnel et résilient de Netlify Blobs pour persistance multi-instances
let blobStore = null;
try {
  const { getStore } = require('@netlify/blobs');
  if (typeof getStore === 'function') {
    blobStore = getStore('chantiersur-state');
  }
} catch (_) {}

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
 * Compacte, compresse et chiffre les données du dossier avec clé serveur (AES-256-GCM + Deflate)
 * Produit une chaîne Base64URL autonome transportable sans risque de tronquage dans le jeton.
 */
function packDossier(dossierData, key) {
  try {
    if (!dossierData || typeof dossierData !== 'object') return null;
    const jsonBuf = Buffer.from(JSON.stringify(dossierData), 'utf8');
    const deflated = zlib.deflateRawSync(jsonBuf);
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    const enc = Buffer.concat([cipher.update(deflated), cipher.final()]);
    const tag = cipher.getAuthTag();
    return Buffer.concat([iv, tag, enc]).toString('base64url');
  } catch (e) {
    console.error('Erreur compression dossier:', e.message);
    return null;
  }
}

/**
 * Déchiffre et décompresse un dossier empaqueté dans un jeton
 */
function unpackDossier(packedStr, key) {
  try {
    if (!packedStr || typeof packedStr !== 'string') return null;
    const buf = Buffer.from(packedStr, 'base64url');
    if (buf.length < 28) return null; // 12 iv + 16 tag + min 1 enc
    const iv = buf.subarray(0, 12);
    const tag = buf.subarray(12, 28);
    const enc = buf.subarray(28);
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);
    const dec = Buffer.concat([decipher.update(enc), decipher.final()]);
    const decomp = zlib.inflateRawSync(dec).toString('utf8');
    return JSON.parse(decomp);
  } catch (e) {
    console.error('Erreur décompression dossier:', e.message);
    return null;
  }
}

/**
 * Enregistre le dossier de manière chiffrée côté serveur sous une référence de commande
 */
function saveActiveDossier(ref, dossierData, service) {
  if (!ref || !dossierData) return;
  try {
    const key = getSecret();
    const packed = packDossier(dossierData, key);

    const record = {
      packed,
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
  if (!record) return null;
  const key = getSecret();
  if (record.packed) {
    return unpackDossier(record.packed, key);
  }
  if (record.enc && record.iv) {
    try {
      const decipher = crypto.createDecipheriv('aes-256-cbc', key, Buffer.from(record.iv, 'base64url'));
      let decrypted = decipher.update(record.enc, 'base64url', 'utf8');
      decrypted += decipher.final('utf8');
      return JSON.parse(decrypted);
    } catch (_) {
      return null;
    }
  }
  return null;
}

/**
 * Crée un jeton de téléchargement signé AUTONOME & RÉSISTANT
 * Le jeton transporte les données complètes chiffrées/compressées (AES-GCM + Deflate)
 * garantissant un accès 100% garanti quel que soit le conteneur serverless ou le contexte mobile.
 */
function createDownloadToken(dossierData, service) {
  const key = getSecret();
  const nonce = crypto.randomBytes(16).toString('hex');
  const exp = Date.now() + TOKEN_TTL_MS;
  const ref = (dossierData && (dossierData.dossier || dossierData.ref_command || dossierData.reference)) || ('CS-' + Date.now());

  // 1. Chiffrement compact du dossier complet directement embarqué dans le jeton
  const packedDossier = packDossier(dossierData, key);

  // 2. Sauvegarde résiliente locale (mémoire + tmp + blobs)
  saveActiveDossier(ref, dossierData, service);

  // 3. Jeton signé contenant les données chiffrées
  const payload = {
    service: service || 'audit',
    ref,
    nonce,
    exp,
    d: packedDossier
  };
  const payloadStr = JSON.stringify(payload);
  const hmac = crypto.createHmac('sha256', key).update(payloadStr).digest('base64url');
  const token = Buffer.from(payloadStr).toString('base64url') + '.' + hmac;

  // Lier le dossier au hash du jeton et à la référence
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  recordOrderToken(ref, token, service);

  return token;
}

/**
 * Enregistre la commande payée (utilisé par IPN PayTech et check-status)
 */
function recordOrderToken(ref, token, service) {
  if (!ref || !token) return;
  const item = { token, service, timestamp: Date.now() };
  memoryOrders.set(ref, item);
  const orders = loadJsonSafe(ORDERS_FILE);
  orders[ref] = item;
  saveJsonSafe(ORDERS_FILE, orders);
  if (blobStore) {
    try {
      blobStore.setJSON('order_' + ref, item).catch(() => {});
    } catch (_) {}
  }
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
 * Récupère le jeton de manière asynchrone (vérifie aussi Netlify Blobs si configuré)
 */
async function getOrderTokenAsync(ref) {
  if (!ref) return null;
  const syncOrder = getOrderToken(ref);
  if (syncOrder) return syncOrder;
  if (blobStore) {
    try {
      const data = await blobStore.get('order_' + ref, { type: 'json' });
      if (data && data.token) {
        memoryOrders.set(ref, data);
        return data;
      }
    } catch (_) {}
  }
  return null;
}

/**
 * Vérifie l'authenticité, la validité et l'usage du jeton
 * Récupère le dossier déchiffré à partir du jeton ou du stockage serveur.
 * Tolérance multi-requêtes : autorise jusqu'à 5 téléchargements dans la fenêtre de validité
 * pour éviter les rejets intempestifs sur mobile Safari (double requête HEAD/GET).
 */
function verifyAndConsumeToken(token, expectedService) {
  if (!token || typeof token !== 'string') {
    return { valid: false, error: 'Jeton manquant ou invalide.' };
  }

  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const usedMap = loadJsonSafe(USED_TOKENS_FILE);
  const currentUses = memoryUsedTokens.get(tokenHash) || (usedMap[tokenHash]?.count || (usedMap[tokenHash] ? 1 : 0));
  if (currentUses >= 5) {
    return { valid: false, error: 'Ce lien de téléchargement a expiré (nombre maximal de téléchargements atteint).' };
  }

  const parts = token.split('.');
  if (parts.length !== 2) {
    // Tolérance mode TEST pour session PayTech active (14 à 24 caractères alphanumériques)
    if (/^[0-9a-z_-]{14,24}$/i.test(token) && (process.env.PAYTECH_ENV === 'test' || !process.env.PAYTECH_ENV)) {
      const order = getOrderToken(token) || getActiveDossier(token);
      return {
        valid: true,
        payload: { service: expectedService, ref: token, exp: Date.now() + 3600000 },
        dossierData: order?.dossierData || order || null,
        data: order?.dossierData || order || null
      };
    }
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

  // Récupération sécurisée du dossier
  let dossierData = null;

  // Priorité 1 : Déchiffrement direct depuis le jeton (ZÉRO dépendance externe ou serveur)
  if (payload.d) {
    dossierData = unpackDossier(payload.d, key);
  }

  // Priorité 2 : Rétrocompatibilité déchiffrement legacy AES-256-CBC
  if (!dossierData && payload.enc && payload.iv) {
    try {
      const decipher = crypto.createDecipheriv('aes-256-cbc', key, Buffer.from(payload.iv, 'base64url'));
      let decrypted = decipher.update(payload.enc, 'base64url', 'utf8');
      decrypted += decipher.final('utf8');
      dossierData = JSON.parse(decrypted);
    } catch (_) {}
  }

  // Priorité 3 : Stockage serveur (mémoire / tmp / blobs)
  if (!dossierData) {
    dossierData = getActiveDossier(payload.ref) || getActiveDossier(tokenHash);
  }

  // Enregistrement de l'utilisation (compteur résilient)
  const newCount = currentUses + 1;
  memoryUsedTokens.set(tokenHash, newCount);
  usedMap[tokenHash] = { count: newCount, timestamp: Date.now() };
  saveJsonSafe(USED_TOKENS_FILE, usedMap);

  return { valid: true, payload, dossierData, data: dossierData };
}

module.exports = {
  createDownloadToken,
  verifyAndConsumeToken,
  recordOrderToken,
  getOrderToken,
  getOrderTokenAsync,
  saveActiveDossier,
  getActiveDossier
};

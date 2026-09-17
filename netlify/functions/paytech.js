// Matrice tarifaire 4x3 officielle en FCFA
const PRICING_MATRIX = {
  express: {
    r1: 19500,   // RDC / R+1
    r4: 39000,   // R+2 à R+4
    r7: 75000,   // R+5 à R+7
    r10: 140000  // R+8 à R+10
  },
  esquisse: {
    r1: 49000,
    r4: 99000,
    r7: 190000,
    r10: 340000
  },
  audit: {
    r1: 79000,
    r4: 165000,
    r7: 320000,
    r10: 590000
  }
};

function resolvePrice(serviceType, levels) {
  const service = PRICING_MATRIX[serviceType] || PRICING_MATRIX.express;
  const nbLevels = parseInt(levels, 10) || 1;

  if (nbLevels <= 2) return service.r1;
  if (nbLevels <= 5) return service.r4;
  if (nbLevels <= 8) return service.r7;
  return service.r10;
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Méthode non autorisée' }) };
  }

  try {
    const { serviceType = 'express', levels = 1, projectDetails = {} } = JSON.parse(event.body);
    const amount = resolvePrice(serviceType, levels);
    const itemName = `ChantierSur — Pack ${serviceType.toUpperCase()} (${levels} Niveaux)`;

    const refCommand = `CS-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const payload = {
      item_name: itemName,
      item_price: amount,
      currency: 'XOF',
      ref_command: refCommand,
      command_name: `Paiement Audit ChantierSur`,
      env: process.env.PAYTECH_ENV || 'prod',
      ipn_url: 'https://chantiersur.com/.netlify/functions/paytech-ipn',
      success_url: `https://chantiersur.com/?payment=success&service=${serviceType}`,
      cancel_url: `https://chantiersur.com/?payment=cancelled&service=${serviceType}`,
      custom_field: JSON.stringify({ serviceType, levels, ref_command: refCommand, ...projectDetails })
    };

    const response = await fetch('https://paytech.sn/api/payment/request-payment', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'API_KEY': process.env.PAYTECH_API_KEY,
        'API_SECRET': process.env.PAYTECH_API_SECRET
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();

    if (result && result.success === 1) {
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(result) // Renvoie tout (success, token, redirect_url)
      };
    } else {
      throw new Error(result.message || 'Erreur d’initialisation PayTech');
    }
  } catch (error) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: error.message })
    };
  }
};
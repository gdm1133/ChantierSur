function resolvePrice(serviceType, levels) {
  const nbLevels = parseInt(levels, 10) || 0;
  if (serviceType === 'esquisse') return 35000 + (nbLevels * 25000);
  if (serviceType === 'express') return 15000 + (nbLevels * 12500);
  if (serviceType === 'audit') return 55000 + (nbLevels * 45000);
  if (serviceType === 'finitions') return 25000 + (nbLevels * 15000);
  return 15000;
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Méthode non autorisée' }) };
  }

  try {
    const { serviceType = 'express', levels = 0, projectDetails = {} } = JSON.parse(event.body);
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
        body: JSON.stringify(result)
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
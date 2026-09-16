exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const BASE_DOMAIN = 'https://chantiersur.com';
    const requestData = JSON.parse(event.body || '{}');
    const levels = parseInt(requestData.levels) || 2;

    // Tarification dynamique par gabarit
    let price = 9900;
    let itemName = 'Audit BQE - Villa / RDC / R+1';

    if (levels >= 3 && levels <= 5) {
      price = 15000;
      itemName = 'Audit BQE - Immeuble R+2 a R+4';
    } else if (levels >= 6) {
      price = 35000;
      itemName = 'Audit BQE - Projet Grand Standing R+5 a R+10';
    }

    const response = await fetch('https://paytech.sn/api/payment/request-payment', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'API_KEY': 'b638e00ae381573deb1254894a7c06532d862751ef7cba57cd3a13d90c510e83',
        'API_SECRET': 'f9e59936d06cdc3e2c16c941d05bfdafa224b19ee17bc7b94e7540b7b39e34a3'
      },
      body: JSON.stringify({
        item_name: itemName,
        item_price: price,
        currency: 'XOF',
        ref_command: 'CS-' + Date.now(),
        command_name: itemName,
        env: 'prod',
        ipn_url: `${BASE_DOMAIN}/.netlify/functions/paytech-ipn`,
        success_url: `${BASE_DOMAIN}/?payment=success`,
        cancel_url: `${BASE_DOMAIN}/?payment=cancel`
      })
    });

    const data = await response.json();
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message })
    };
  }
};
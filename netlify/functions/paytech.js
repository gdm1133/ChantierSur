exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const data = JSON.parse(event.body || '{}');
    const response = await fetch('[https://paytech.sn/api/payment/request-payment](https://paytech.sn/api/payment/request-payment)', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'API_KEY': 'b638e00ae381573deb1254894a7c06532d862751ef7cba57cd3a13d90c510e83',
        'API_SECRET': 'f9e59936d06cdc3e2c16c941d05bfdafa224b19ee17bc7b94e7540b7b39e34a3'
      },
      body: JSON.stringify({
        item_name: 'Audit ChantierSur - Bordereau Officiel',
        item_price: 3000,
        currency: 'XOF',
        ref_command: 'CS-' + Date.now(),
        command_name: 'Achat Bordereau Quantitatif ChantierSur',
        env: 'prod',
        success_url: data.currentUrl + (data.currentUrl.includes('?') ? '&' : '?') + 'payment=success',
        cancel_url: data.currentUrl + (data.currentUrl.includes('?') ? '&' : '?') + 'payment=cancel'
      })
    });

    const result = await response.json();
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(result)
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message })
    };
  }
};

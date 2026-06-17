const https = require('https');

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { items } = req.body;

  if (!items || items.length === 0) {
    return res.status(400).json({ error: 'No items' });
  }

  const preference = {
    items: items.map(item => ({
      title: item.name,
      quantity: item.qty,
      unit_price: Number(item.price),
      currency_id: 'ARS'
    })),
    back_urls: {
      success: 'https://kove-store-beta.vercel.app/?status=success',
      failure: 'https://kove-store-beta.vercel.app/?status=failure',
      pending: 'https://kove-store-beta.vercel.app/?status=pending'
    },
    auto_return: 'approved',
    statement_descriptor: 'KOVE',
    notification_url: 'https://kove-store-beta.vercel.app/api/webhook'
  };

  const ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN;

  const data = JSON.stringify(preference);

  const options = {
    hostname: 'api.mercadopago.com',
    path: '/checkout/preferences',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${ACCESS_TOKEN}`,
      'Content-Length': Buffer.byteLength(data)
    }
  };

  return new Promise((resolve) => {
    const request = https.request(options, (response) => {
      let body = '';
      response.on('data', chunk => body += chunk);
      response.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          if (parsed.init_point) {
            res.status(200).json({ init_point: parsed.init_point });
          } else {
            res.status(500).json({ error: 'No init_point', detail: parsed });
          }
        } catch(e) {
          res.status(500).json({ error: 'Parse error' });
        }
        resolve();
      });
    });

    request.on('error', (e) => {
      res.status(500).json({ error: e.message });
      resolve();
    });

    request.write(data);
    request.end();
  });
}

const https = require('https');

https.get('https://badol-tyre-ghar.vercel.app/api/v1/catalog?limit=1', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const parsed = JSON.parse(data);
      const product = parsed.data.products[0];
      console.log('Product Name:', product.name);
      console.log('Variants:', JSON.stringify(product.variants, null, 2));
    } catch (e) {
      console.error(e);
    }
  });
});

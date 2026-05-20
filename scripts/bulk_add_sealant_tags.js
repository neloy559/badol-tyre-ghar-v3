// Bulk add custom tags to all tyre sealant products
// Run with: node scripts/bulk_add_sealant_tags.js

const api = require('../src/services/api').default || require('../src/services/api');

// List of tags to add (from user request)
const tagsToAdd = [
  'budget-friendly',
  'high-adhesion',
  'eco-friendly',
  'premium',
  'latex',
  'sealant',
  'sealants',
  'budget',
  'bajet',
  'bazet',
  'sosta',
  'valo',
  'jeel',
  'zeel',
  '1l',
  '1L',
  'half liter',
  'half',
  'motor',
  'motorcyle',
  'motor cycle',
  'bike gel',
  'car gel',
  'bike jel',
  'car jel',
  'bike zel',
  'car zel',
  'tube gel',
  'tube jel',
  'tube zel',
  'tubeless',
  'tube',
  'tub',
  'puncture'
];

async function run() {
  try {
    // Fetch all sealant products (adjust filter as needed)
    const pageSize = 100;
    let page = 1;
    let total = 0;
    do {
      const params = new URLSearchParams({ page, limit: pageSize, category: 'sealant' });
      const resp = await api.get(`/admin/catalog/products?${params}`);
      const data = resp.data?.data;
      const products = data?.products || [];
      total = data?.total || 0;

      for (const p of products) {
        const existing = p.customTags || [];
        const merged = Array.from(new Set([...existing, ...tagsToAdd]));
        await api.patch(`/admin/catalog/products/${p._id}`, { customTags: merged });
        console.log(`Updated product ${p.sku}`);
      }

      page++;
    } while ((page - 1) * pageSize < total);

    console.log('Bulk tag addition completed.');
  } catch (err) {
    console.error('Error during bulk update:', err.response?.data || err.message);
  }
}

run();

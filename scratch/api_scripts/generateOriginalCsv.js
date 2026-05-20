const fs = require('fs');

const generateOriginalCSV = () => {
  const rawCSV = fs.readFileSync('D:/Badol Tyre Ghar - Products/scratch/products_catalog.csv', 'utf-8');
  const lines = rawCSV.split('\n').map(l => l.trim()).filter(l => l);
  
  // Skip header
  const dataLines = lines.slice(1);
  
  const header = ['sku', 'name', 'size', 'pattern', 'ply', 'designModel', 'retailPrice', 'wholesalePrice', 'stock'];
  
  const outputRows = dataLines.map(line => {
    // Basic CSV split, ignores quotes (quick and dirty)
    // Actually, let's just use a simple regex split for CSV to handle quotes roughly
    const match = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || line.split(',');
    // Wait, let's just split by comma because the data might be simple enough, or use a proper parser.
    // Instead of importing csv-parser, I'll do a simple split and clean.
  });
};

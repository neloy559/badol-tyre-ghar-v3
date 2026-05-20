const fs = require('fs');

const generateCSV = () => {
  const header = ['sku', 'name', 'size', 'pattern', 'ply', 'designModel', 'retailPrice', 'wholesalePrice', 'stock'];
  
  // Mix of real products from the catalog
  const products = [
    { sku: 'BTG-001', name: 'Zess Flap', size: '10.00-20', pattern: 'Standard', ply: 'N/A', designModel: 'Local', retailPrice: 400, wholesalePrice: 350, stock: 150 },
    { sku: 'BTG-005', name: 'Advance E3/L3', size: '17.5-25', pattern: 'E3/L3', ply: '20PR', designModel: 'GLR05', retailPrice: 65000, wholesalePrice: 60000, stock: 12 },
    { sku: 'BTG-006', name: 'Advance E3/L3', size: '20.5-25', pattern: 'E3/L3', ply: '24PR', designModel: 'GLR05', retailPrice: 85000, wholesalePrice: 80000, stock: 8 },
    { sku: 'BTG-008', name: 'Tourador X Speed TU1', size: '205/55R16', pattern: 'Passenger', ply: '4PR', designModel: 'X Speed', retailPrice: 6500, wholesalePrice: 5800, stock: 40 },
    { sku: 'BTG-012', name: 'Giti Control 288', size: '225/50R17', pattern: 'Performance', ply: '4PR', designModel: 'Control 288', retailPrice: 9500, wholesalePrice: 8500, stock: 24 },
    { sku: 'BTG-015', name: 'MRF Super Lug', size: '7.50-16', pattern: 'Lug', ply: '16PR', designModel: 'Super Lug 50', retailPrice: 12500, wholesalePrice: 11000, stock: 100 },
    { sku: 'BTG-018', name: 'CEAT Buland', size: '8.25-16', pattern: 'Rib', ply: '16PR', designModel: 'Mile XL', retailPrice: 15000, wholesalePrice: 14000, stock: 80 },
    { sku: 'BTG-025', name: 'Maxxis Bighorn M/T', size: '265/70R17', pattern: 'Mud Terrain', ply: '8PR', designModel: 'MT-762', retailPrice: 22000, wholesalePrice: 19500, stock: 16 },
    { sku: 'BTG-031', name: 'Hankook Dynapro AT2', size: '245/70R16', pattern: 'All Terrain', ply: '6PR', designModel: 'RF11', retailPrice: 14000, wholesalePrice: 12500, stock: 32 },
    { sku: 'BTG-045', name: 'Linglong CrossWind AT', size: '215/75R15', pattern: 'All Terrain', ply: '6PR', designModel: 'CrossWind', retailPrice: 7500, wholesalePrice: 6800, stock: 60 },
  ];

  const rows = products.map(p => 
    [p.sku, p.name, p.size, p.pattern, p.ply, p.designModel, p.retailPrice, p.wholesalePrice, p.stock].join(',')
  );

  const csvContent = [header.join(','), ...rows].join('\n');
  
  fs.writeFileSync('../btg_catalog_v3_ready.csv', csvContent, 'utf-8');
  console.log('Successfully generated ../btg_catalog_v3_ready.csv');
};

generateCSV();

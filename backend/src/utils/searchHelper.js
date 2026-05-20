const banglaDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
const englishDigits = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];

const toEnglishDigits = (str) => {
  if (!str) return '';
  return str.toString().split('').map(char => {
    const idx = banglaDigits.indexOf(char);
    return idx !== -1 ? englishDigits[idx] : char;
  }).join('');
};

const toBanglaDigits = (str) => {
  if (!str) return '';
  return str.toString().split('').map(char => {
    const idx = englishDigits.indexOf(char);
    return idx !== -1 ? banglaDigits[idx] : char;
  }).join('');
};

// Generates size variations
// e.g. "10.00-20" -> "100020", "10-00-20", "10 00 20", "10.00-20" in both languages
const generateSizeVariations = (size) => {
  if (!size) return [];
  const variations = new Set();
  
  // Clean sizes
  const enSize = toEnglishDigits(size).trim();
  const bnSize = toBanglaDigits(size).trim();
  
  variations.add(enSize);
  variations.add(bnSize);
  
  // Strip common symbols: . , - / and spaces
  const stripSymbols = (s) => s.replace(/[.\-\/\s]/g, '');
  const spaceSymbols = (s) => s.replace(/[.\-\/]/g, ' ');
  const dashSymbols = (s) => s.replace(/[.\/\s]/g, '-');
  
  variations.add(stripSymbols(enSize));
  variations.add(stripSymbols(bnSize));
  
  variations.add(spaceSymbols(enSize));
  variations.add(spaceSymbols(bnSize));
  
  variations.add(dashSymbols(enSize));
  variations.add(dashSymbols(bnSize));
  
  // Custom case: e.g. "10.00-20" -> "1000-20", "1000 20", "১০০০-২০"
  // Let's replace only "." and keep "-" or space
  const noDotsEn = enSize.replace(/\./g, '');
  const noDotsBn = bnSize.replace(/\./g, '');
  variations.add(noDotsEn);
  variations.add(noDotsBn);
  variations.add(noDotsEn.replace(/-/g, ' '));
  variations.add(noDotsBn.replace(/-/g, ' '));
  
  // Remove empty entries and clean up spaces
  return Array.from(variations)
    .map(v => v.trim())
    .filter(v => v.length > 0);
};

// Main generator to combine everything
const generateProductTags = (product, brandName = '', categoryName = '', customTags = []) => {
  const tags = new Set();
  
  // Add direct fields
  if (product.name) {
    tags.add(product.name.toLowerCase());
    // Also store single words from the name
    product.name.toLowerCase().split(/\s+/).forEach(w => {
      if (w.length > 1) tags.add(w);
    });
  }
  if (product.sku) tags.add(product.sku.toLowerCase());
  
  // Size variations
  if (product.commonSpecs && product.commonSpecs.size) {
    generateSizeVariations(product.commonSpecs.size).forEach(v => tags.add(v.toLowerCase()));
  }
  
  // Other specs (pattern, rim, origin)
  if (product.commonSpecs) {
    if (product.commonSpecs.pattern) tags.add(product.commonSpecs.pattern.toLowerCase());
    if (product.commonSpecs.rim) tags.add(product.commonSpecs.rim.toLowerCase());
    if (product.commonSpecs.origin) tags.add(product.commonSpecs.origin.toLowerCase());
  }
  
  // Brand & Category
  if (brandName) {
    tags.add(brandName.toLowerCase());
    // Common brand misspells / Bengali names
    const brandLower = brandName.toLowerCase();
    if (brandLower.includes('bridgestone')) {
      tags.add('bridgston');
      tags.add('bridgeston');
      tags.add('brizstone');
      tags.add('ব্রিজস্টোন');
      tags.add('ব্রীজস্টোন');
    } else if (brandLower.includes('giti')) {
      tags.add('জিটি');
    } else if (brandLower.includes('michelin')) {
      tags.add('মিশেলিন');
      tags.add('মিশেলন');
    } else if (brandLower.includes('apollo')) {
      tags.add('এপোলো');
      tags.add('앱োলো');
    } else if (brandLower.includes('mrf')) {
      tags.add('এমআরএফ');
    } else if (brandLower.includes('ceat')) {
      tags.add('সিয়াট');
      tags.add('সীয়াট');
    } else if (brandLower.includes('jk')) {
      tags.add('জেক');
      tags.add('জে কে');
    } else if (brandLower.includes('gazza')) {
      tags.add('গাজ্জা');
    }
  }
  if (categoryName) {
    tags.add(categoryName.toLowerCase());
    const catLower = categoryName.toLowerCase();
    if (catLower.includes('tyre')) {
      tags.add('টায়ার');
      tags.add('টায়ার');
    } else if (catLower.includes('tube')) {
      tags.add('টিউব');
    } else if (catLower.includes('sealant')) {
      tags.add('সিল্যান্ট');
      tags.add('আঠা');
    }
  }
  
  // Add manual custom tags
  if (Array.isArray(customTags)) {
    customTags.forEach(t => {
      if (t) {
        tags.add(t.trim().toLowerCase());
        // Also split by space
        t.trim().toLowerCase().split(/\s+/).forEach(w => {
          if (w.length > 1) tags.add(w);
        });
      }
    });
  }
  
  return Array.from(tags);
};

module.exports = {
  toEnglishDigits,
  toBanglaDigits,
  generateSizeVariations,
  generateProductTags
};

export const CATEGORIES = [
  { label: 'Tubes',         slug: 'tubes'         },
  { label: 'Tyres',         slug: 'tyres'         },
  { label: 'Tyre Sealants', slug: 'tyre-sealants' },
  { label: 'Patches',       slug: 'patches'       },
  { label: 'Flaps',         slug: 'flaps'         },
  { label: 'Gadgets',       slug: 'gadgets'       },
];

export const getCategoryLogo = (slug) => {
  switch (slug) {
    case 'flaps':         return '/assets/categories/flap.png';
    case 'gadgets':       return '/assets/categories/gadgets.png';
    case 'patches':       return '/assets/categories/patch.png';
    case 'tyre-sealants': return '/assets/categories/sealant.png';
    case 'tubes':         return '/assets/categories/tube.png';
    case 'tyres':         return '/assets/categories/tyre.png';
    default:              return '/assets/branding/logo.jpeg';
  }
};

export const STOCK_LABEL = {
  in_stock:     { text: 'In Stock',      color: 'var(--color-success)', cls: 'stock-in'  },
  limited:      { text: 'Limited Stock', color: 'var(--color-warning)', cls: 'stock-low' },
  out_of_stock: { text: 'Out of Stock',  color: 'var(--color-danger)',  cls: 'stock-out' },
};

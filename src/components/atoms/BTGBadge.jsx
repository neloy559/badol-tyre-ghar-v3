import './BTGBadge.css';

const STOCK_MAP = {
  high:    { label: 'In Stock',    cls: 'in-stock' },
  low:     { label: 'Low Stock',   cls: 'low-stock' },
  out:     { label: 'Out of Stock',cls: 'out-stock' },
};

/**
 * BTGBadge — Visual status indicator for roles, stock, and verification.
 *
 * Usage modes:
 *  1. Role:  <BTGBadge role="admin" />
 *  2. Stock: <BTGBadge stock="low" />
 *  3. Custom:<BTGBadge variant="verified" label="Verified" />
 */
export default function BTGBadge({ role, stock, variant, label, icon, className = '' }) {
  let cls = '';
  let text = label;

  if (role) {
    cls = `btg-badge--${role}`;
    text = text || role.toUpperCase();
  } else if (stock) {
    const map = STOCK_MAP[stock] || STOCK_MAP.high;
    cls = `btg-badge--${map.cls}`;
    text = text || map.label;
  } else if (variant) {
    cls = `btg-badge--${variant}`;
  }

  return (
    <span className={`btg-badge ${cls} ${className}`}>
      {icon && icon}
      {text}
    </span>
  );
}

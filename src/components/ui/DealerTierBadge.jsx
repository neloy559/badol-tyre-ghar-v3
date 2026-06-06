import React from 'react';
import styles from './DealerTierBadge.module.css';

const TIER_LABELS = {
  standard: 'Standard Dealer',
  silver:   'Silver Dealer',
  gold:     'Gold Dealer',
  platinum: 'Platinum Dealer',
};

/**
 * DealerTierBadge
 * Props:
 *   tier: 'standard' | 'silver' | 'gold' | 'platinum'
 */
export default function DealerTierBadge({ tier }) {
  if (!tier) return null;
  const label = TIER_LABELS[tier] ?? `${tier} Dealer`;
  return (
    <span className={styles.badge} data-tier={tier}>
      {label}
    </span>
  );
}

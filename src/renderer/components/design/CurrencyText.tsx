import React from 'react';
import { formatCurrency } from '../../utils/currencyHelpers';
import { UaeDirhamIcon } from './UaeDirhamIcon';

interface CurrencyTextProps {
  value: number;
  currency?: string;
  className?: string;
  style?: React.CSSProperties;
}

export const CurrencyText: React.FC<CurrencyTextProps> = ({
  value,
  currency = 'AED',
  className = '',
  style,
}) => {
  const formatted = formatCurrency(value, currency);
  const numberPart = formatted.replace(currency, '').trim();

  return (
    <span 
      className={`currency-amount ${className}`} 
      style={{ 
        display: 'inline-flex', 
        alignItems: 'baseline',
        fontFamily: 'var(--currency-font-family, var(--font-sans))',
        fontVariantNumeric: 'tabular-nums',
        fontFeatureSettings: '"tnum"',
        letterSpacing: '-0.02em',
        fontWeight: className.includes('fw-800') ? 800 : 700,
        fontStyle: 'normal',
        ...style 
      }}
    >
      <span className="currency-symbol" style={{ opacity: 0.65, fontWeight: 500, fontSize: '0.85em', marginRight: '4px', display: 'inline-flex', alignItems: 'center' }}>
        {currency === 'AED' ? <UaeDirhamIcon /> : currency}
      </span>
      {' '}
      <span className="currency-val">
        {numberPart}
      </span>
    </span>
  );
};

import React from 'react';

interface UaeDirhamIconProps {
  size?: number | string;
  className?: string;
  style?: React.CSSProperties;
}

export const UaeDirhamIcon: React.FC<UaeDirhamIconProps> = ({
  size = '1em',
  className = '',
  style,
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={{ verticalAlign: '-0.15em', display: 'inline-block', ...style }}
    >
      <path d="M8 4v16h5c4.5 0 7-3.5 7-8s-2.5-8-7-8H8z" />
      <path d="M4 10h14" />
      <path d="M4 14h13.5" />
    </svg>
  );
};

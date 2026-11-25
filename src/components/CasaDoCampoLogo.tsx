import React from 'react';

interface CasaDoCampoLogoProps {
  compact?: boolean;
  inverted?: boolean;
}

/**
 * Faithful vector emblem inspired by the Casa do Campo Brand Book:
 * circular agricultural mark with barn silhouette and green rolling fields.
 */
export function CasaDoCampoLogo({ compact = false, inverted = false }: CasaDoCampoLogoProps) {
  const strokePrimary = inverted ? '#FFFFFF' : '#575A4E';
  const fillGreen = inverted ? '#A2B999' : '#649A4E';
  const fillLightGreen = inverted ? '#DDE7D9' : '#69A959';
  const titleColor = inverted ? 'text-white' : 'text-[#649A4E]';
  const subtitleColor = inverted ? 'text-[#DDE7D9]' : 'text-[#5E6954]';

  return (
    <div className="flex items-center gap-3 select-none shrink-0">
      <svg
        width={compact ? 38 : 44}
        height={compact ? 38 : 44}
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        className="shrink-0"
      >
        <circle cx="32" cy="32" r="29" stroke={strokePrimary} strokeWidth="3.2" fill={inverted ? 'transparent' : '#FFFFFF'} />
        <clipPath id="cdc-emblem-clip">
          <circle cx="32" cy="32" r="26.5" />
        </clipPath>
        <g clipPath="url(#cdc-emblem-clip)">
          {/* Barn silhouette */}
          <path
            d="M21 37V24.5L31 16.5L41 24.5V37"
            stroke={strokePrimary}
            strokeWidth="2.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <rect x="27.5" y="25" width="7" height="7" rx="1" stroke={strokePrimary} strokeWidth="2.2" />
          {/* Rolling agricultural fields */}
          <path
            d="M4 42C16 34 32 33 60 41V62H4V42Z"
            fill={fillGreen}
          />
          <path
            d="M4 48C19 41 37 42 60 49V62H4V48Z"
            fill={fillLightGreen}
          />
          <path
            d="M11 45C22 40 36 40 53 46"
            stroke="#FFFFFF"
            strokeWidth="2.4"
            strokeLinecap="round"
          />
          <path
            d="M15 52C26 48 39 49 52 54"
            stroke="#FFFFFF"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
        </g>
      </svg>

      <div className="leading-tight min-w-0">
        <div
          className={`font-display font-semibold tracking-tight whitespace-nowrap ${titleColor} ${
            compact ? 'text-lg' : 'text-xl'
          }`}
        >
          Casa do Campo
        </div>
        {!compact && (
          <div
            className={`text-[10px] font-medium tracking-[0.09em] uppercase whitespace-nowrap ${subtitleColor}`}
          >
            Da Ração ao Produto Veterinário
          </div>
        )}
      </div>
    </div>
  );
}

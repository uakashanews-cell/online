/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

interface LogoProps {
  variant?: 'dark' | 'light';
  size?: 'sm' | 'md' | 'lg';
  showTagline?: boolean;
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({
  variant = 'dark',
  size = 'md',
  showTagline = false,
  className = '',
}) => {
  const isLight = variant === 'light';

  // Sizing definitions
  const dimensions = {
    sm: { height: 'h-8', iconSize: 32, text: 'text-xl', tagline: 'text-[9px]' },
    md: { height: 'h-10 sm:h-11', iconSize: 40, text: 'text-2xl sm:text-[26px]', tagline: 'text-[9.5px]' },
    lg: { height: 'h-14', iconSize: 52, text: 'text-3xl sm:text-4xl', tagline: 'text-xs' },
  }[size];

  return (
    <div className={`flex items-center gap-2.5 sm:gap-3 select-none ${className}`}>
      {/* Monogram Emblem: Emerald "B" with gold leaf & subtle arch motif */}
      <svg
        width={dimensions.iconSize}
        height={dimensions.iconSize}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0 transition-transform duration-300 group-hover:scale-105"
        aria-hidden="true"
      >
        {/* Background shield/arch container */}
        <rect
          x="3"
          y="3"
          width="94"
          height="94"
          rx="22"
          fill={isLight ? '#3B2A20' : '#FBF5EC'}
          stroke={isLight ? '#C65D3B' : '#E3D5C4'}
          strokeWidth="2.5"
        />

        {/* Subtle decorative inner arch */}
        <path
          d="M20 78V36C20 20 34 16 50 16C66 16 80 20 80 36V78"
          stroke={isLight ? 'rgba(243, 233, 220, 0.3)' : 'rgba(138, 154, 123, 0.35)'}
          strokeWidth="1.5"
          strokeDasharray="2 3"
        />

        {/* The 'B' Letterform */}
        <path
          d="M32 26H51C60 26 67 31 67 38.5C67 44.5 62 48.5 56 49.5C63.5 50.8 69 55.5 69 63.5C69 71.5 61.5 76 52 76H32V26ZM42 45H51C55.5 45 58.5 42.5 58.5 38.5C58.5 34.5 55.5 32 51 32H42V45ZM42 70H52C57 70 60.5 67 60.5 62.5C60.5 58 57 55 52 55H42V70Z"
          fill={isLight ? '#F3E9DC' : '#3B2A20'}
        />

        {/* Terracotta Leaf & Star Emblem Accent */}
        <path
          d="M62 26C65 21 72 19 76 21C77 25 74 32 68 34C68 30 65 27 62 26Z"
          fill={isLight ? '#C65D3B' : '#B4502F'}
        />
        {/* Tiny star motif */}
        <circle cx="50" cy="16" r="2.5" fill={isLight ? '#C65D3B' : '#B4502F'} />
      </svg>

      {/* Wordmark and Tagline */}
      <div className="flex flex-col text-left justify-center">
        <span
          className={`font-serif ${dimensions.text} font-bold tracking-[0.16em] uppercase leading-none ${
            isLight ? 'text-[#F3E9DC]' : 'text-[#3B2A20]'
          }`}
        >
          BARVAKA
        </span>
        {showTagline && (
          <span
            className={`font-sans ${dimensions.tagline} tracking-[0.2em] font-semibold uppercase mt-1 ${
              isLight ? 'text-[#DDE3D3]' : 'text-[#6B5B50]'
            }`}
          >
            Quality · Fast Delivery · Trust · Khayr
          </span>
        )}
      </div>
    </div>
  );
};

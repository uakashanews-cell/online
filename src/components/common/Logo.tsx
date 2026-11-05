/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

interface LogoProps {
  variant?: 'dark' | 'light' | 'full';
  size?: 'sm' | 'md' | 'lg';
  showTagline?: boolean;
  className?: string;
  alt?: string;
}

export const Logo: React.FC<LogoProps> = ({
  variant = 'dark',
  size = 'md',
  showTagline = false,
  className = '',
  alt = 'Arooj',
}) => {
  const isLight = variant === 'light';
  const textColor = isLight ? 'text-[#F3E9DC]' : 'text-[#3B2A20]';

  const sizeClasses = {
    sm: { img: 'h-7 sm:h-8', text: 'text-lg sm:text-xl' },
    md: { img: 'h-9 sm:h-10', text: 'text-xl sm:text-2xl' },
    lg: { img: 'h-11 sm:h-14', text: 'text-2xl sm:text-3xl' },
  }[size];

  return (
    <div className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      <img
        src="/logo.png"
        alt={alt}
        className={`${sizeClasses.img} w-auto object-contain transition-transform duration-300 group-hover:scale-[1.02]`}
      />
      <div className="flex flex-col">
        <span className={`font-serif font-bold ${sizeClasses.text} ${textColor} tracking-tight leading-none`}>
          Arooj
        </span>
        {showTagline && (
          <span className="text-[10px] sm:text-[11px] text-[#6B5B50] tracking-wider uppercase mt-0.5">
            Shop smart · Live better
          </span>
        )}
      </div>
    </div>
  );
};

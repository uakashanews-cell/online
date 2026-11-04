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
  className = '',
  alt = 'Arooj',
}) => {
  const isFull = variant === 'full' || variant === 'light';
  const src = isFull ? '/logo-full.png' : '/logo.png';

  // Height about 40px in header (md: sm:h-10), about 32px on mobile (h-8)
  const sizeClasses = {
    sm: 'h-7 sm:h-8',
    md: 'h-8 sm:h-10',
    lg: 'h-11 sm:h-14',
  }[size];

  return (
    <div className={`inline-flex items-center select-none ${className}`}>
      <img
        src={src}
        alt={alt}
        className={`${sizeClasses} w-auto object-contain transition-transform duration-300 group-hover:scale-[1.02]`}
      />
    </div>
  );
};

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';

interface ImageWithFallbackProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  fallbackClassName?: string;
}

export const ImageWithFallback: React.FC<ImageWithFallbackProps> = ({
  src,
  alt,
  className = '',
  fallbackClassName = '',
  ...props
}) => {
  const [hasError, setHasError] = useState(false);

  if (hasError || !src) {
    return (
      <div
        className={`w-full h-full bg-[#DDE3D3] flex flex-col items-center justify-center p-4 text-center select-none ${fallbackClassName} ${className}`}
        role="img"
        aria-label={alt || 'AROOJ Product'}
      >
        <img
          src="/logo.png"
          alt="AROOJ"
          className="h-9 w-auto object-contain opacity-40 mb-1"
        />
        <span className="font-serif text-[11px] font-semibold text-[#3B2A20]/50 tracking-widest uppercase mt-0.5">
          AROOJ
        </span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt || 'AROOJ Item'}
      loading="lazy"
      onError={() => setHasError(true)}
      className={className}
      referrerPolicy="no-referrer"
      {...props}
    />
  );
};

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect } from 'react';

export interface PageSEOProps {
  title: string;
  description?: string;
  noindex?: boolean;
}

export function usePageSEO({ title, description, noindex = false }: PageSEOProps) {
  useEffect(() => {
    // 1. Update document.title
    document.title = title;

    // 2. Update meta description
    let metaDesc = document.querySelector('meta[name="description"]');
    const originalDesc = metaDesc ? metaDesc.getAttribute('content') : null;
    if (description) {
      if (!metaDesc) {
        metaDesc = document.createElement('meta');
        metaDesc.setAttribute('name', 'description');
        document.head.appendChild(metaDesc);
      }
      metaDesc.setAttribute('content', description.slice(0, 150));
    }

    // 3. Update robots meta tag
    let robotsMeta = document.querySelector('meta[name="robots"]');
    if (noindex) {
      if (!robotsMeta) {
        robotsMeta = document.createElement('meta');
        robotsMeta.setAttribute('name', 'robots');
        document.head.appendChild(robotsMeta);
      }
      robotsMeta.setAttribute('content', 'noindex, nofollow');
    } else {
      if (robotsMeta) {
        robotsMeta.setAttribute('content', 'index, follow');
      }
    }

    return () => {
      if (description && originalDesc && metaDesc) {
        metaDesc.setAttribute('content', originalDesc);
      }
      if (noindex && robotsMeta) {
        robotsMeta.setAttribute('content', 'index, follow');
      }
    };
  }, [title, description, noindex]);
}

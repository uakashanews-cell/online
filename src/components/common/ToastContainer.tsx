/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useStore } from '../../context/StoreContext';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const { toasts, dismissToast } = useStore();

  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="fixed z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none px-4 sm:px-0 bottom-4 left-1/2 -translate-x-1/2 sm:translate-x-0 sm:left-auto sm:top-4 sm:right-4 sm:bottom-auto"
    >
      {toasts.map((toast) => {
        const isSuccess = toast.type === 'success';
        const isError = toast.type === 'error';
        const isWarning = toast.type === 'warning';

        return (
          <div
            key={toast.id}
            role="alert"
            className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-[10px] shadow-[0_4px_20px_rgba(15,59,46,0.15)] border text-xs font-medium transition-all transform animate-in slide-in-from-bottom-2 sm:slide-in-from-top-2 duration-200 ${
              isSuccess
                ? 'bg-[#0F3B2E] text-[#F8F4EA] border-[#2E7D4F]/40'
                : isError
                ? 'bg-[#B3372F] text-[#F8F4EA] border-[#B3372F]/60'
                : isWarning
                ? 'bg-[#422C0A] text-[#F8F4EA] border-[#B8963E]/60'
                : 'bg-[#0A2A21] text-[#F8F4EA] border-[#B8963E]/40'
            }`}
          >
            <div className="shrink-0 mt-0.5">
              {isSuccess && <CheckCircle2 className="w-4 h-4 text-[#B8963E]" strokeWidth={1.5} />}
              {isError && <AlertCircle className="w-4 h-4 text-[#F8F4EA]" strokeWidth={1.5} />}
              {isWarning && <AlertTriangle className="w-4 h-4 text-[#E5B54F]" strokeWidth={1.5} />}
              {!isSuccess && !isError && !isWarning && <Info className="w-4 h-4 text-[#B8963E]" strokeWidth={1.5} />}
            </div>
            <div className="flex-1 leading-snug">{toast.message}</div>
            <button
              onClick={() => dismissToast(toast.id)}
              aria-label="Dismiss notification"
              className="shrink-0 opacity-70 hover:opacity-100 text-[#F8F4EA] transition-opacity p-0.5"
            >
              <X className="w-3.5 h-3.5" strokeWidth={1.5} />
            </button>
          </div>
        );
      })}
    </div>
  );
};

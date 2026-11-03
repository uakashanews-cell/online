/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class AdminErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('AdminErrorBoundary caught an error:', error, errorInfo);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 max-w-2xl mx-auto my-12 bg-white border border-[#0F3B2E]/15 rounded-sm shadow-sm text-center">
          <div className="w-12 h-12 mx-auto mb-4 bg-amber-50 rounded-full flex items-center justify-center text-amber-700">
            <AlertTriangle className="w-6 h-6 text-[#B8963E]" />
          </div>
          <h2 className="font-serif text-2xl text-[#0F3B2E] tracking-wide mb-2">
            {this.props.fallbackTitle || 'Unable to display admin section'}
          </h2>
          <p className="text-sm text-[#1C1C1C]/70 mb-6 font-sans">
            {this.state.error?.message || 'An unexpected rendering error occurred. You can retry safely.'}
          </p>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={this.handleRetry}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#0F3B2E] text-white text-xs uppercase tracking-widest font-medium rounded-sm hover:bg-[#164e3d] transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Try Again
            </button>
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#F8F4EA] border border-[#0F3B2E]/20 text-[#0F3B2E] text-xs uppercase tracking-widest font-medium rounded-sm hover:bg-[#f1ebe0] transition-colors"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

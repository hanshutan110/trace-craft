import React from 'react';
import { useI18n } from '../i18n';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  language: 'cn' | 'en';
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundaryBase extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[ErrorBoundary] Uncaught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      const isEnglish = this.props.language === 'en';

      return (
        <div className="flex flex-col items-center justify-center h-full p-8 text-center">
          <div className="text-4xl mb-4">⚠️</div>
          <h2 className="text-lg font-bold text-slate-900 mb-2">
            {isEnglish ? 'Something went wrong' : '页面出错了'}
          </h2>
          <p className="text-sm text-slate-500 mb-4">
            {this.state.error?.message || (isEnglish ? 'An unknown error occurred' : '发生了未知错误')}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="px-4 py-2 bg-[var(--tc-primary)] text-white rounded-full text-sm font-semibold"
          >
            {isEnglish ? 'Retry' : '重试'}
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export function ErrorBoundary({
  children,
  fallback,
}: {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const { language } = useI18n();

  return (
    <ErrorBoundaryBase language={language} fallback={fallback}>
      {children}
    </ErrorBoundaryBase>
  );
}

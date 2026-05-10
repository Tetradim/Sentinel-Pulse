import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: React.ReactNode;
  fallbackLabel?: string;
}

interface State {
  hasError: boolean;
  error: string;
  retryKey: number;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: '', retryKey: 0 };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error: error.message };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info.componentStack);
  }

  handleRetry = () => {
    // Increment key to force full remount of children
    this.setState((s) => ({ hasError: false, error: '', retryKey: s.retryKey + 1 }));
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-48 text-muted-foreground gap-3" data-testid="error-boundary">
          <AlertTriangle size={24} className="text-amber-400" />
          <p className="text-sm font-medium">
            {this.props.fallbackLabel || 'Something went wrong'}
          </p>
          <p className="text-xs text-muted-foreground/60 max-w-md text-center">{this.state.error}</p>
          <button
            onClick={this.handleRetry}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-primary/20 text-primary border border-primary/30 hover:bg-primary/30 transition-all"
          >
            <RefreshCw size={12} /> Retry
          </button>
        </div>
      );
    }
    // Force remount with key on retry
    return <React.Fragment key={this.state.retryKey}>{this.props.children}</React.Fragment>;
  }
}

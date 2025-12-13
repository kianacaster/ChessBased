import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
    this.setState({ error, errorInfo });
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="h-screen w-screen bg-background text-destructive p-8 flex flex-col items-center justify-center overflow-auto">
          <h1 className="text-3xl font-bold mb-6 tracking-tight">Something went wrong.</h1>
          <div className="w-full max-w-4xl bg-card border border-destructive/20 rounded-lg shadow-lg overflow-hidden">
             <div className="bg-destructive/10 px-4 py-2 border-b border-destructive/20 text-xs font-mono uppercase tracking-wider font-bold">
                Error Details
             </div>
             <pre className="p-6 text-sm font-mono text-muted-foreground whitespace-pre-wrap overflow-auto max-h-[60vh]">
              {this.state.error && this.state.error.toString()}
              <br />
              {this.state.errorInfo && this.state.errorInfo.componentStack}
            </pre>
          </div>
          <button 
            className="mt-8 px-6 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors font-medium shadow-sm"
            onClick={() => window.location.reload()}
          >
            Reload Application
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ActivityErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('ActivityErrorBoundary caught error:', error, errorInfo);
  }

  public handleRetry = (): void => {
    this.setState({ hasError: false, error: null });
    this.props.onReset?.();
  };

  public render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            gap: '18px',
            color: '#d8f3dc',
            textAlign: 'center',
            padding: '24px'
          }}
        >
          <span style={{ fontSize: '56px' }}>🌱</span>
          <h2 style={{ fontSize: '24px', color: '#ffd166', margin: 0 }}>
            {this.props.fallbackTitle ?? 'Gentle Forest Breeze'}
          </h2>
          <p style={{ maxWidth: '400px', fontSize: '16px', opacity: 0.85, margin: 0 }}>
            Let us restart this activity and continue exploring!
          </p>
          <button
            type="button"
            onClick={this.handleRetry}
            style={{
              padding: '12px 28px',
              fontSize: '18px',
              fontWeight: 700,
              background: '#2d6a4f',
              border: '2px solid #52b788',
              borderRadius: '999px',
              color: '#ffffff',
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(0,0,0,0.4)'
            }}
          >
            🔄 Restart Activity
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

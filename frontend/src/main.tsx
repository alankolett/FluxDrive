import React, { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("FluxDrive Interface Error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '40px', fontFamily: 'system-ui, sans-serif', maxWidth: '640px', margin: '40px auto', background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#EF4444' }}></div>
            <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: '#0F172A' }}>Workstation Recovered From Exception</h1>
          </div>
          <p style={{ color: '#475569', fontSize: '14px', lineHeight: 1.5, marginBottom: '20px' }}>
            The application intercepted an unexpected runtime condition. Click below to reset state and return to the main workstation.
          </p>
          <pre style={{ background: '#F8FAFC', padding: '12px', borderRadius: '6px', fontSize: '12px', overflowX: 'auto', border: '1px solid #E2E8F0', color: '#DC2626' }}>
            {this.state.error?.message || 'Unknown error occurred'}
          </pre>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.reload();
            }}
            style={{ marginTop: '20px', padding: '10px 20px', background: '#2563EB', color: '#FFFFFF', border: 'none', borderRadius: '6px', fontWeight: 600, fontSize: '14px', cursor: 'pointer' }}
          >
            Reload FluxDrive Workstation
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)


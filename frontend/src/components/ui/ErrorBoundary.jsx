import { Component } from 'react';

function reportError(error, componentStack) {
  fetch('/api/errors/client', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: error?.message ?? String(error),
      stack: error?.stack ?? '',
      componentStack: componentStack ?? '',
      url: window.location.href,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
    }),
  }).catch(() => {});
}

function ErrorFallback({ error, onReset }) {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'system-ui, sans-serif', backgroundColor: '#f9fafb', padding: '2rem',
    }}>
      <div style={{
        background: '#fff', borderRadius: '12px', padding: '2rem 2.5rem',
        maxWidth: '480px', width: '100%', boxShadow: '0 1px 3px rgba(0,0,0,.1)',
        textAlign: 'center',
      }}>
        <div style={{ marginBottom: '1rem' }}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
        </div>
        <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#111', margin: '0 0 .5rem' }}>
          Something went wrong
        </h2>
        <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: '0 0 1.5rem', lineHeight: 1.5 }}>
          An unexpected error occurred. The issue has been logged and we'll look into it.
        </p>
        {error?.message && (
          <pre style={{
            fontSize: '0.75rem', color: '#ef4444', background: '#fef2f2',
            borderRadius: '6px', padding: '.75rem', textAlign: 'left',
            overflowX: 'auto', marginBottom: '1.5rem', whiteSpace: 'pre-wrap',
          }}>
            {error.message}
          </pre>
        )}
        <button
          onClick={onReset}
          style={{
            background: '#111', color: '#fff', border: 'none', borderRadius: '8px',
            padding: '.625rem 1.5rem', fontSize: '0.875rem', fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          Reload page
        </button>
      </div>
    </div>
  );
}

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    reportError(error, info?.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <ErrorFallback
          error={this.state.error}
          onReset={() => { this.setState({ error: null }); window.location.reload(); }}
        />
      );
    }
    return this.props.children;
  }
}

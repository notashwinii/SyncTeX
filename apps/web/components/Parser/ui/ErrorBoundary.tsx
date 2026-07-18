'use client';
import React from 'react';

interface ErrorBoundaryState {
    hasError: boolean;
    error?: Error;
}

interface ErrorBoundaryProps {
    children: React.ReactNode;
    fallback?: React.ReactNode;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error('Error Boundary caught an error:', error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }
            
            return (
                <div style={{
                    padding: '20px',
                    border: '2px solid #ff6b6b',
                    borderRadius: '8px',
                    backgroundColor: '#fff5f5',
                    color: '#d63031',
                    fontFamily: 'monospace',
                    margin: '10px'
                }}>
                    <h3 style={{margin: '0 0 10px 0', color: '#d63031'}}>❌ Rendering Error</h3>
                    <p><strong>Error:</strong> {this.state.error?.message || 'Unknown error'}</p>
                    <p style={{fontSize: '14px', color: '#636e72'}}>
                        Something went wrong while rendering the parsed content. Please check your LaTeX syntax.
                    </p>
                    <details style={{marginTop: '10px'}}>
                        <summary style={{cursor: 'pointer', color: '#636e72'}}>Error Details</summary>
                        <pre style={{
                            backgroundColor: '#f8f9fa',
                            padding: '10px',
                            borderRadius: '4px',
                            fontSize: '12px',
                            overflow: 'auto',
                            maxHeight: '200px'
                        }}>
                            {this.state.error?.stack || 'No stack trace available'}
                        </pre>
                    </details>
                    <button 
                        onClick={() => this.setState({ hasError: false, error: undefined })}
                        style={{
                            marginTop: '10px',
                            padding: '8px 16px',
                            backgroundColor: '#007bff',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer'
                        }}
                    >
                        Try Again
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;

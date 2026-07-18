"use client";

import React from 'react';

interface PreviewErrorBoundaryProps {
  children: React.ReactNode;
  onReport?: (errors: string[]) => void;
}

interface PreviewErrorBoundaryState {
  hasError: boolean;
  messages: string[];
}

export default class PreviewErrorBoundary extends React.Component<PreviewErrorBoundaryProps, PreviewErrorBoundaryState> {
  constructor(props: PreviewErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, messages: [] };
  }

  static getDerivedStateFromError(error: Error): PreviewErrorBoundaryState {
    // Update state so the next render shows the fallback UI.
    return { hasError: true, messages: [error?.message || 'Unexpected error rendering preview'] };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Optionally parse error for line numbers if present
    const msg = error?.message || 'Unexpected error rendering preview';
    const lineMatch = msg.match(/line\s(\d+)/i);
    const detailed = lineMatch
      ? `Unexpected error while rendering preview (Line ${lineMatch[1]}). Fix: Check your LaTeX around this line.`
      : 'Unexpected error while rendering preview. Fix: Review your latest changes for syntax issues.';

    const messages = [detailed];

    // Report up to parent so it can update the preview pane error list
    if (this.props.onReport) {
      this.props.onReport(messages);
    }

    // Keep state in sync
    this.setState({ hasError: true, messages });

    console.error('Preview render error:', error, info);
  }

  reset = () => {
    this.setState({ hasError: false, messages: [] });
  };

  render() {
    if (this.state.hasError) {
      // Render nothing; parent PreviewWindow will render its error UI from reported messages
      return null;
    }

    return this.props.children;
  }
}

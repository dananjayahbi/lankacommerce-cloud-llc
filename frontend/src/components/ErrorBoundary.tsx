'use client'

import { Component, type ErrorInfo, type ReactNode } from 'react'
import { ErrorBoundaryFallback } from './ErrorBoundaryFallback'

interface ErrorBoundaryProps {
  children: ReactNode
  /** Optional label for the fallback heading, e.g. "Product Grid" */
  context?: string
  /** Custom fallback UI. If provided, overrides the default ErrorBoundaryFallback. */
  fallback?: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }
      return (
        <ErrorBoundaryFallback
          error={this.state.error ?? undefined}
          resetErrorBoundary={this.handleReset}
          context={this.props.context}
        />
      )
    }

    return this.props.children
  }
}

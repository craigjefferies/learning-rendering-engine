import { Component, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: unknown) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-red-50 p-8 dark:bg-red-950">
          <div className="mx-auto max-w-2xl rounded-lg border border-red-300 bg-white p-6 shadow-lg dark:border-red-700 dark:bg-red-900">
            <h1 className="text-2xl font-bold text-red-600 dark:text-red-300">Something went wrong</h1>
            <p className="mt-4 text-red-700 dark:text-red-200">
              The application encountered an error:
            </p>
            <pre className="mt-4 overflow-auto rounded bg-red-100 p-4 text-sm text-red-900 dark:bg-red-950 dark:text-red-100">
              {this.state.error?.message || 'Unknown error'}
            </pre>
            <pre className="mt-2 overflow-auto rounded bg-red-100 p-4 text-xs text-red-800 dark:bg-red-950 dark:text-red-200">
              {this.state.error?.stack}
            </pre>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 rounded-md bg-red-600 px-4 py-2 text-white hover:bg-red-500"
            >
              Reload Page
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

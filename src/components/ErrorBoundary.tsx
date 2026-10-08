import { Component, type ReactNode } from 'react'
import { AlertTriangle, RefreshCcw } from 'lucide-react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
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

  override componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
  }

  private handleReload = () => {
    window.location.reload()
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: undefined })
  }

  override render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-canvas px-6 py-12 text-center">
          <div className="card max-w-md p-8">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-danger/10 text-danger">
              <AlertTriangle className="h-7 w-7" />
            </div>
            <h1 className="mt-5 text-xl font-bold tracking-tight text-ink">
              Etwas ist schiefgelaufen
            </h1>
            <p className="mt-2 text-sm text-ink-soft">
              Ein unerwarteter Fehler ist aufgetreten. Du kannst die Seite neu laden oder es erneut versuchen.
            </p>
            {this.state.error?.message && (
              <div className="mt-4 rounded-xl bg-canvas p-3 text-left">
                <p className="text-2xs font-medium uppercase tracking-wider text-ink-muted">Fehlerdetails</p>
                <p className="mt-1 break-words font-mono text-xs text-ink-soft">
                  {this.state.error.message}
                </p>
              </div>
            )}
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <button
                onClick={this.handleReset}
                className="btn-secondary"
              >
                Erneut versuchen
              </button>
              <button
                onClick={this.handleReload}
                className="btn-primary"
              >
                <RefreshCcw className="h-4 w-4" />
                Seite neu laden
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Props {
  children?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="mx-auto flex min-h-[60vh] max-w-3xl flex-col items-center justify-center px-4 text-center">
          <div className="mb-6 grid h-16 w-16 place-items-center rounded-2xl border border-red-500/25 bg-red-500/10">
            <AlertTriangle className="text-red-400" size={30} />
          </div>
          <h1 className="mb-3 text-3xl font-black tracking-[-0.04em] text-[var(--hub-text-strong)]">Não foi possível abrir esta área</h1>
          <p className="mb-8 max-w-md leading-relaxed text-[var(--hub-muted)]">
            Seus dados salvos não foram apagados. Recarregue a página ou volte ao início para continuar usando o Hubora.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <button
              onClick={() => window.location.reload()}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[var(--hub-brand)] px-6 py-3 font-bold text-[var(--hub-brand-contrast)] transition hover:bg-[var(--hub-brand-strong)] focus-visible:outline-none"
            >
              <RefreshCw size={20} />
              Recarregar página
            </button>
            <Link
              to="/"
              className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[var(--hub-border)] bg-[var(--hub-surface-1)] px-6 py-3 font-bold text-[var(--hub-text-strong)] transition hover:bg-[var(--hub-surface-2)] focus-visible:outline-none"
            >
              <Home size={20} />
              Voltar ao início
            </Link>
          </div>

          {import.meta.env.DEV && (
            <details className="mt-10 max-w-2xl overflow-auto rounded-xl border border-[var(--hub-border)] bg-[var(--hub-surface-1)] p-5 text-left">
              <summary className="cursor-pointer text-sm font-bold text-[var(--hub-text-strong)]">Detalhes técnicos para desenvolvimento</summary>
              <p className="text-red-400 font-mono text-sm mb-2">{this.state.error?.name}: {this.state.error?.message}</p>
              <pre className="whitespace-pre-wrap font-mono text-xs text-[var(--hub-subtle)]">
                {this.state.error?.stack}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

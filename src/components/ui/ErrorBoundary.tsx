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
        <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
          <div className="w-24 h-24 bg-red-500/10 rounded-full flex items-center justify-center mb-8 animate-pulse">
            <AlertTriangle className="text-red-500" size={48} />
          </div>
          <h1 className="text-4xl font-black text-white mb-4 tracking-tighter">Ops! Algo deu errado.</h1>
          <p className="text-slate-400 max-w-md mb-12 leading-relaxed">
            Ocorreu um erro inesperado ao carregar esta página. Nossa equipe já foi notificada.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <button
              onClick={() => window.location.reload()}
              className="flex items-center gap-2 bg-[var(--hub-brand)] hover:bg-[var(--hub-brand-strong)] text-white px-8 py-4 rounded-2xl font-bold transition-all duration-300 shadow-lg shadow-[rgba(217,154,40,0.18)]"
            >
              <RefreshCw size={20} />
              Tentar Novamente
            </button>
            <Link
              to="/"
              className="flex items-center gap-2 bg-white/5 hover:bg-white/10 text-white px-8 py-4 rounded-2xl font-bold transition-all duration-300 border border-white/10"
            >
              <Home size={20} />
              Voltar ao Início
            </Link>
          </div>

          {process.env.NODE_ENV === 'development' && (
            <div className="mt-12 p-6 bg-slate-900 rounded-2xl border border-white/5 text-left max-w-2xl overflow-auto">
              <p className="text-red-400 font-mono text-sm mb-2">{this.state.error?.name}: {this.state.error?.message}</p>
              <pre className="text-slate-500 font-mono text-xs whitespace-pre-wrap">
                {this.state.error?.stack}
              </pre>
            </div>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

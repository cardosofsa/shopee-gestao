import { Component, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  pageName?: string;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  reset = () => this.setState({ error: null });

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="flex-1 flex items-center justify-center min-h-[60vh] p-8">
        <div className="max-w-md w-full text-center">
          <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <AlertTriangle size={22} className="text-red-500" />
          </div>
          <h2 className="text-slate-800 font-semibold text-base mb-1">
            Algo deu errado{this.props.pageName ? ` em ${this.props.pageName}` : ''}
          </h2>
          <p className="text-slate-500 text-sm mb-5 leading-relaxed">
            Ocorreu um erro inesperado. Seus dados estão salvos — tente recarregar a página.
          </p>
          <details className="text-left mb-5">
            <summary className="text-xs text-slate-400 cursor-pointer hover:text-slate-600 select-none">
              Detalhes técnicos
            </summary>
            <pre className="mt-2 text-xs text-red-500 bg-red-50 rounded-lg p-3 overflow-auto max-h-32 whitespace-pre-wrap break-all">
              {error.message}
            </pre>
          </details>
          <button
            onClick={this.reset}
            className="inline-flex items-center gap-2 px-4 py-2 bg-core-green text-white text-sm font-medium rounded-xl hover:bg-core-green-h transition-colors"
          >
            <RefreshCw size={14} />
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }
}

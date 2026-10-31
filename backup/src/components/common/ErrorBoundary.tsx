import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw, ArrowLeft } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  fallbackMessage?: string;
  onReset?: () => void;
  showBackAction?: boolean;
  onBackAction?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary capturou uma falha não tratada:', error, errorInfo);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="w-full p-6 my-4 rounded-3xl bg-slate-900 border border-rose-500/40 text-white shadow-2xl flex flex-col items-center text-center animate-fadeIn">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 mb-3">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-black text-rose-300 mb-1">
            {this.props.fallbackTitle || 'Instabilidade temporária detectada'}
          </h3>
          <p className="text-xs text-slate-300 max-w-md mb-4">
            {this.props.fallbackMessage ||
              'Ocorreu uma pequena falha de renderização ou recurso da câmera. Seu progresso foi preservado com segurança.'}
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={this.handleRetry}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black text-xs flex items-center gap-2 cursor-pointer shadow-lg transition-all"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Tentar Novamente</span>
            </button>

            {this.props.showBackAction && this.props.onBackAction && (
              <button
                onClick={this.props.onBackAction}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center gap-2 cursor-pointer border border-slate-700 transition-all"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Voltar à Trilha</span>
              </button>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

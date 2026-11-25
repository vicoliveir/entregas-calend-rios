import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error.message || 'Erro inesperado na aplicação.',
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('Application ErrorBoundary caught:', error, errorInfo);
  }

  handleReload = () => {
    this.setState({ hasError: false, errorMessage: '' });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      let friendlyDescription =
        'Ocorreu uma falha de sincronização ou permissão no banco de dados. Verifique sua conexão e tente novamente.';
      if (this.state.errorMessage.includes('Quota exceeded')) {
        friendlyDescription =
          'A cota diária gratuita do Firestore foi excedida e será reiniciada amanhã.';
      } else if (this.state.errorMessage.includes('Missing or insufficient permissions')) {
        friendlyDescription =
          'Permissão insuficiente no Firestore. Confirme se o terminal está autenticado com a conta autorizada da Casa do Campo.';
      }

      return (
        <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center p-6">
          <div className="soft-card max-w-lg w-full rounded-3xl border border-[#DDE7D9] p-8 text-center">
            <div className="w-14 h-14 rounded-2xl bg-[#C84343]/10 text-[#C84343] flex items-center justify-center mx-auto mb-5">
              <AlertTriangle className="w-7 h-7" />
            </div>
            <h1 className="font-display text-xl font-semibold text-[#575A4E] mb-2">
              Falha na Operação do Terminal
            </h1>
            <p className="text-sm text-[#5E6954] leading-relaxed mb-6">{friendlyDescription}</p>
            <button
              type="button"
              onClick={this.handleReload}
              className="inline-flex items-center justify-center gap-2 bg-[#649A4E] hover:bg-[#575A4E] text-white font-display font-medium text-sm px-6 py-3 rounded-full transition-colors cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              Recarregar Terminal
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

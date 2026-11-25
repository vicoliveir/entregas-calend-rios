import React, { useState } from 'react';
import {
  AlertCircle,
  Building2,
  Check,
  Cloud,
  Eye,
  EyeOff,
  KeyRound,
  LogOut,
  ShieldCheck,
  User as UserIcon,
} from 'lucide-react';
import { BRANCHES, BranchName, DEFAULT_CASHIER_PASS, DEFAULT_CASHIER_USER } from '../types';
import { useCalendar } from '../context/CalendarContext';
import { CasaDoCampoLogo } from './CasaDoCampoLogo';

export function LoginScreen() {
  const {
    user,
    authReady,
    authError,
    isSigningIn,
    signInWithGoogle,
    signOutTerminal,
    loginCashier,
  } = useCalendar();

  const [username, setUsername] = useState(DEFAULT_CASHIER_USER);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState<BranchName>('Quixadá (Matriz)');
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const result = loginCashier(username, password, selectedBranch);
    if (!result.ok) {
      setFormError(result.error ?? 'Credenciais inválidas.');
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex flex-col justify-between">
      {/* Main Centered Split Canvas */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 rounded-3xl overflow-hidden soft-card border border-[#DDE7D9]">
          {/* Left Institutional Brand Panel */}
          <div className="lg:col-span-5 bg-[#5E6954] text-white p-7 sm:p-10 flex flex-col justify-between gap-8">
            <div className="space-y-6">
              <CasaDoCampoLogo inverted />
              <div className="w-12 h-0.5 bg-[#A2B999]" />
              <div className="space-y-3">
                <h1 className="font-display text-2xl sm:text-3xl font-semibold leading-tight text-balance">
                  Controle de Distribuição de Calendários
                </h1>
                <p className="text-sm text-[#DDE7D9] leading-relaxed">
                  Operação rápida de balcão com trava instantânea de 1 unidade por cliente,
                  sincronizada em tempo real entre todas as filiais da rede.
                </p>
              </div>
            </div>

            <div className="space-y-3 pt-4 border-t border-white/15">
              <p className="text-xs font-medium text-[#A2B999] tracking-wide uppercase">
                Filiais Integradas
              </p>
              <div className="grid grid-cols-2 gap-2 text-xs text-white/90">
                {BRANCHES.map((branch) => (
                  <div key={branch} className="flex items-center gap-2 py-1">
                    <Building2 className="w-3.5 h-3.5 text-[#A2B999] shrink-0" />
                    <span className="truncate">{branch}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Interactive Access Form */}
          <div className="lg:col-span-7 bg-white p-7 sm:p-10 flex flex-col justify-center">
            {!authReady ? (
              <div className="py-12 text-center space-y-3">
                <div className="w-10 h-10 rounded-full border-3 border-[#DDE7D9] border-t-[#649A4E] animate-spin mx-auto" />
                <p className="text-sm text-[#5E6954]">Verificando conexão segura com a nuvem...</p>
              </div>
            ) : !user ? (
              <div className="space-y-6">
                <div className="space-y-2">
                  <h2 className="font-display text-2xl font-semibold text-[#575A4E]">
                    Conectar Terminal à Nuvem
                  </h2>
                  <p className="text-sm text-[#5E6954] leading-relaxed">
                    Autorize este caixa com a conta Google da Casa do Campo para ativar o banco de
                    dados compartilhado entre Quixadá, Quixeramobim, Morada Nova e Iguatu.
                  </p>
                </div>

                {authError && (
                  <div className="rounded-2xl bg-[#C84343]/10 border border-[#C84343]/30 p-4 flex items-start gap-3 text-sm text-[#C84343]">
                    <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                    <span>{authError}</span>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => void signInWithGoogle()}
                  disabled={isSigningIn}
                  className="w-full min-h-[56px] rounded-2xl bg-[#649A4E] hover:bg-[#5E6954] disabled:opacity-60 text-white font-display font-semibold text-base px-6 py-3.5 flex items-center justify-center gap-3 transition-colors shadow-lg shadow-[#649A4E]/15 cursor-pointer"
                >
                  <Cloud className="w-5 h-5" />
                  {isSigningIn ? 'Conectando...' : 'Conectar Terminal com Google'}
                </button>

                <div className="rounded-2xl bg-[#F8F9FA] border border-[#DDE7D9] p-4 flex items-start gap-3">
                  <ShieldCheck className="w-5 h-5 text-[#649A4E] shrink-0 mt-0.5" />
                  <p className="text-xs text-[#5E6954] leading-relaxed">
                    Após conectar o terminal, o operador fará o login compartilhado do caixa e
                    escolherá a loja de atendimento.
                  </p>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="font-display text-2xl font-semibold text-[#575A4E]">
                      Acesso do Caixa
                    </h2>
                    <p className="text-xs text-[#64795A] mt-1">
                      Terminal conectado como <span className="font-medium text-[#575A4E]">{user.email}</span>
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void signOutTerminal()}
                    className="min-h-[40px] px-3 py-1.5 rounded-full text-xs font-medium text-[#64795A] hover:text-[#575A4E] hover:bg-[#F8F9FA] border border-[#DDE7D9] inline-flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Trocar conta
                  </button>
                </div>

                {/* Branch Touch Selector */}
                <div className="space-y-2.5">
                  <label className="block text-sm font-medium text-[#575A4E]">
                    Selecione a Filial de Atendimento
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {BRANCHES.map((branch) => {
                      const active = selectedBranch === branch;
                      return (
                        <button
                          key={branch}
                          type="button"
                          onClick={() => setSelectedBranch(branch)}
                          className={`min-h-[50px] px-4 py-3 rounded-2xl border text-left flex items-center justify-between gap-2 transition-all cursor-pointer ${
                            active
                              ? 'bg-[#649A4E]/10 border-[#649A4E] text-[#575A4E] font-display font-semibold'
                              : 'bg-white border-[#DDE7D9] text-[#5E6954] hover:border-[#A2B999]'
                          }`}
                        >
                          <span className="text-sm truncate">{branch}</span>
                          {active && (
                            <span className="w-5 h-5 rounded-full bg-[#649A4E] text-white flex items-center justify-center shrink-0">
                              <Check className="w-3.5 h-3.5" />
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Shared Cashier Credentials */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label htmlFor="cashier-user" className="block text-sm font-medium text-[#575A4E]">
                      Usuário Compartilhado
                    </label>
                    <div className="relative">
                      <UserIcon className="w-4 h-4 text-[#64795A] absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        id="cashier-user"
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        autoComplete="username"
                        placeholder="caixa"
                        className="w-full h-12 pl-11 pr-4 rounded-2xl border border-[#DDE7D9] bg-[#F8F9FA] text-[#575A4E] text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#649A4E]"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="cashier-pass" className="block text-sm font-medium text-[#575A4E]">
                      Senha do Caixa
                    </label>
                    <div className="relative">
                      <KeyRound className="w-4 h-4 text-[#64795A] absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        id="cashier-pass"
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        autoComplete="current-password"
                        placeholder="Digite a senha do balcão"
                        autoFocus
                        className="w-full h-12 pl-11 pr-12 rounded-2xl border border-[#DDE7D9] bg-[#F8F9FA] text-[#575A4E] text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#649A4E]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((prev) => !prev)}
                        aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                        className="min-w-[40px] min-h-[40px] absolute right-1 top-1/2 -translate-y-1/2 flex items-center justify-center text-[#64795A] hover:text-[#575A4E] cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                {formError && (
                  <div className="rounded-2xl bg-[#C84343]/10 border border-[#C84343]/30 px-4 py-3 flex items-center gap-2.5 text-sm text-[#C84343]">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full min-h-[56px] rounded-2xl bg-[#649A4E] hover:bg-[#5E6954] text-white font-display font-semibold text-base px-6 py-3.5 transition-colors shadow-lg shadow-[#649A4E]/15 cursor-pointer"
                >
                  Iniciar Operação no Balcão
                </button>

                <p className="text-xs text-[#64795A] text-center">
                  Credenciais padrão do balcão: usuário <span className="font-semibold text-[#575A4E]">{DEFAULT_CASHIER_USER}</span> · senha <span className="font-semibold text-[#575A4E]">{DEFAULT_CASHIER_PASS}</span>
                </p>
              </form>
            )}
          </div>
        </div>
      </main>

      <footer className="py-4 px-6 text-center text-xs text-[#64795A]">
        Casa do Campo · Da Ração ao Produto Veterinário
      </footer>
    </div>
  );
}

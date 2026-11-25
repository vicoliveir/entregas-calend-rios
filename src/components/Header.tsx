import React from 'react';
import { ArrowLeft, Building2, Lock, LogOut } from 'lucide-react';
import { BRANCHES, BranchName } from '../types';
import { useCalendar } from '../context/CalendarContext';
import { CasaDoCampoLogo } from './CasaDoCampoLogo';

interface HeaderProps {
  activeView: 'pos' | 'manager';
  onOpenManagerGate: () => void;
  onReturnToPos: () => void;
}

export function Header({ activeView, onOpenManagerGate, onReturnToPos }: HeaderProps) {
  const { cashierSession, setActiveBranch, logoutCashier } = useCalendar();

  if (!cashierSession) return null;

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-[#DDE7D9]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 sm:h-[72px] flex items-center justify-between gap-3 sm:gap-6">
        {/* Left: Brand Logo */}
        <div className="flex items-center min-w-0">
          <div className="hidden sm:block">
            <CasaDoCampoLogo />
          </div>
          <div className="sm:hidden">
            <CasaDoCampoLogo compact />
          </div>
        </div>

        {/* Center: Fixed Branch Selector */}
        <div className="flex items-center gap-2 min-w-0">
          {/* Desktop segmented branch switcher */}
          <div
            role="group"
            aria-label="Selecionar filial de atendimento"
            className="hidden xl:flex items-center gap-1 p-1 rounded-full bg-[#DDE7D9]/60 border border-[#DDE7D9]"
          >
            {BRANCHES.map((branch) => {
              const isSelected = cashierSession.activeBranch === branch;
              return (
                <button
                  key={branch}
                  type="button"
                  onClick={() => setActiveBranch(branch)}
                  className={`px-3.5 py-2 rounded-full text-xs font-display font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    isSelected
                      ? 'bg-[#649A4E] text-white shadow-sm'
                      : 'text-[#5E6954] hover:text-[#575A4E] hover:bg-white/70'
                  }`}
                >
                  {branch}
                </button>
              );
            })}
          </div>

          {/* Mobile / Tablet compact touch branch selector */}
          <div className="xl:hidden relative flex items-center">
            <Building2 className="w-4 h-4 text-[#649A4E] absolute left-3 pointer-events-none" />
            <select
              aria-label="Filial selecionada"
              value={cashierSession.activeBranch}
              onChange={(e) => setActiveBranch(e.target.value as BranchName)}
              className="min-h-[44px] pl-9 pr-8 py-2 rounded-full bg-[#DDE7D9]/60 border border-[#A2B999]/50 text-[#575A4E] font-display font-medium text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#649A4E] cursor-pointer max-w-[165px] sm:max-w-[220px] truncate"
            >
              {BRANCHES.map((branch) => (
                <option key={branch} value={branch}>
                  {branch}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Right: Discreet Management Access & Cashier Switch */}
        <div className="flex items-center gap-2 shrink-0">
          {activeView === 'pos' ? (
            <button
              type="button"
              onClick={onOpenManagerGate}
              className="min-h-[44px] inline-flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-full border border-[#DDE7D9] bg-[#F8F9FA] hover:bg-[#DDE7D9]/55 text-[#5E6954] hover:text-[#575A4E] font-display font-medium text-xs sm:text-sm transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Lock className="w-4 h-4 text-[#64795A]" />
              <span className="hidden md:inline">Acesso Gerência</span>
              <span className="md:hidden">Gerência</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onReturnToPos}
              className="min-h-[44px] inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#649A4E] hover:bg-[#5E6954] text-white font-display font-medium text-xs sm:text-sm transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Voltar ao Caixa</span>
            </button>
          )}

          <button
            type="button"
            onClick={logoutCashier}
            title="Sair do turno do caixa"
            aria-label="Sair do turno do caixa"
            className="min-w-[44px] min-h-[44px] inline-flex items-center justify-center rounded-full border border-transparent hover:border-[#DDE7D9] hover:bg-[#F8F9FA] text-[#64795A] hover:text-[#575A4E] transition-colors cursor-pointer shrink-0"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}

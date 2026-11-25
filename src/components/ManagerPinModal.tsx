import React, { useEffect, useState } from 'react';
import { AlertCircle, Delete, Lock, X } from 'lucide-react';
import { MANAGER_PIN } from '../types';

interface ManagerPinModalProps {
  open: boolean;
  onClose: () => void;
  onVerified: () => void;
}

export function ManagerPinModal({ open, onClose, onVerified }: ManagerPinModalProps) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setPin('');
      setError(null);
    }
  }, [open]);

  if (!open) return null;

  const verify = (candidate: string) => {
    if (candidate === MANAGER_PIN) {
      setError(null);
      onVerified();
    } else {
      setError('PIN incorreto. Digite o código de 4 dígitos da gerência.');
      setPin('');
    }
  };

  const handleDigit = (digit: string) => {
    if (pin.length >= 4) return;
    const next = pin + digit;
    setPin(next);
    setError(null);
    if (next.length === 4) {
      window.setTimeout(() => verify(next), 90);
    }
  };

  const handleBackspace = () => {
    setPin((prev) => prev.slice(0, -1));
    setError(null);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    verify(pin);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="manager-pin-title"
      className="fixed inset-0 z-50 bg-[#575A4E]/55 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4"
    >
      <div className="w-full sm:max-w-sm bg-white rounded-t-3xl sm:rounded-3xl border border-[#DDE7D9] shadow-2xl overflow-hidden">
        <div className="px-6 py-5 border-b border-[#DDE7D9] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#5E6954] text-white flex items-center justify-center">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h2 id="manager-pin-title" className="font-display font-semibold text-base text-[#575A4E]">
                Acesso Gerência
              </h2>
              <p className="text-xs text-[#64795A]">Informe o PIN de 4 dígitos</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="min-w-[44px] min-h-[44px] -mr-2 rounded-full flex items-center justify-center text-[#64795A] hover:bg-[#F8F9FA] cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleFormSubmit} className="p-6 space-y-5">
          {/* PIN dots + keyboard input */}
          <div className="space-y-3">
            <input
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={pin}
              autoFocus
              aria-label="PIN de 4 dígitos da gerência"
              onChange={(e) => {
                const next = e.target.value.replace(/\D+/g, '').slice(0, 4);
                setPin(next);
                setError(null);
                if (next.length === 4) {
                  window.setTimeout(() => verify(next), 90);
                }
              }}
              placeholder="••••"
              className="w-full h-14 text-center text-2xl tracking-[0.65em] font-display font-bold tabular-nums rounded-2xl border border-[#DDE7D9] bg-[#F8F9FA] text-[#575A4E] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#649A4E]"
            />

            {/* 3x4 Touch Keypad */}
            <div className="grid grid-cols-3 gap-2.5">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => handleDigit(d)}
                  className="min-h-[52px] rounded-2xl bg-[#F8F9FA] hover:bg-[#DDE7D9]/70 active:scale-95 border border-[#DDE7D9] font-display font-semibold text-lg text-[#575A4E] tabular-nums transition-all cursor-pointer"
                >
                  {d}
                </button>
              ))}
              <button
                type="button"
                onClick={() => {
                  setPin('');
                  setError(null);
                }}
                className="min-h-[52px] rounded-2xl bg-white hover:bg-[#F8F9FA] border border-[#DDE7D9] text-xs font-medium text-[#64795A] cursor-pointer"
              >
                Limpar
              </button>
              <button
                type="button"
                onClick={() => handleDigit('0')}
                className="min-h-[52px] rounded-2xl bg-[#F8F9FA] hover:bg-[#DDE7D9]/70 active:scale-95 border border-[#DDE7D9] font-display font-semibold text-lg text-[#575A4E] tabular-nums transition-all cursor-pointer"
              >
                0
              </button>
              <button
                type="button"
                onClick={handleBackspace}
                aria-label="Apagar último dígito"
                className="min-h-[52px] rounded-2xl bg-white hover:bg-[#F8F9FA] border border-[#DDE7D9] flex items-center justify-center text-[#5E6954] cursor-pointer"
              >
                <Delete className="w-5 h-5" />
              </button>
            </div>
          </div>

          {error && (
            <div className="rounded-2xl bg-[#C84343]/10 border border-[#C84343]/30 px-3.5 py-2.5 flex items-center gap-2 text-xs text-[#C84343]">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={pin.length < 4}
            className="w-full min-h-[52px] rounded-2xl bg-[#649A4E] hover:bg-[#5E6954] disabled:opacity-50 text-white font-display font-semibold text-sm transition-colors cursor-pointer"
          >
            Entrar no Painel Gerencial
          </button>
        </form>
      </div>
    </div>
  );
}

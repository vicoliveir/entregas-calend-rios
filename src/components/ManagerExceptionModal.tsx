import React, { useEffect, useState } from 'react';
import { AlertCircle, Delete, Lock, ShieldCheck, X } from 'lucide-react';
import { CustomerRecord, MANAGER_PIN, QUICK_JUSTIFICATIONS } from '../types';
import { useCalendar } from '../context/CalendarContext';
import { formatDateTimeBR, isValidJustification } from '../utils/validation';
import { playSuccessChime } from '../utils/sound';

interface ManagerExceptionModalProps {
  customer: CustomerRecord | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function ManagerExceptionModal({
  customer,
  onClose,
  onSuccess,
}: ManagerExceptionModalProps) {
  const { cashierSession, confirmManagerException, pushToast } = useCalendar();

  const [pin, setPin] = useState('');
  const [justification, setJustification] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (customer) {
      setPin('');
      setJustification('');
      setError(null);
      setSubmitting(false);
    }
  }, [customer]);

  if (!customer || !cashierSession) return null;

  const handleDigit = (digit: string) => {
    if (pin.length < 4) {
      setPin((prev) => prev + digit);
      setError(null);
    }
  };

  const handleBackspace = () => {
    setPin((prev) => prev.slice(0, -1));
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (pin !== MANAGER_PIN) {
      setError('PIN gerencial inválido. Verifique o código de 4 dígitos.');
      setPin('');
      return;
    }

    if (!isValidJustification(justification)) {
      setError('Informe ou selecione uma justificativa (mínimo 3 caracteres).');
      return;
    }

    setSubmitting(true);
    try {
      await confirmManagerException(customer, justification);
      playSuccessChime();
      pushToast({
        kind: 'exception',
        title: '[LIBERAÇÃO GERENCIAL] Registrada',
        description: `Calendário adicional liberado para ${customer.fullName} (#${customer.registrationNumber}) em ${cashierSession.activeBranch}.`,
      });
      onSuccess();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Não foi possível registrar a liberação gerencial.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="exception-modal-title"
      className="fixed inset-0 z-50 bg-[#575A4E]/55 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto"
    >
      <div className="w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-3xl border border-[#DDE7D9] shadow-2xl overflow-hidden my-auto">
        {/* Modal Header */}
        <div className="px-6 py-5 bg-[#D97706]/10 border-b border-[#D97706]/25 flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#D97706] text-white flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2
                id="exception-modal-title"
                className="font-display font-semibold text-lg text-[#575A4E]"
              >
                Liberação por Exceção Gerencial
              </h2>
              <p className="text-xs text-[#5E6954] mt-0.5">
                Registro adicional sinalizado como <span className="font-semibold text-[#D97706]">[LIBERAÇÃO GERENCIAL]</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar modal"
            className="min-w-[44px] min-h-[44px] -mr-2 -mt-1 rounded-full flex items-center justify-center text-[#5E6954] hover:bg-white/80 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="p-6 space-y-5 max-h-[82vh] overflow-y-auto">
          {/* Customer Summary */}
          <div className="rounded-2xl bg-[#F8F9FA] border border-[#DDE7D9] px-4 py-3 text-sm">
            <div className="flex items-center justify-between gap-2">
              <span className="font-display font-semibold text-[#575A4E] truncate">
                {customer.fullName}
              </span>
              <span className="font-display font-semibold text-xs text-[#64795A] tabular-nums shrink-0">
                Cadastro #{customer.registrationNumber}
              </span>
            </div>
            <p className="text-xs text-[#5E6954] mt-1 tabular-nums">
              1ª retirada em {customer.firstDeliveryBranch} ·{' '}
              {formatDateTimeBR(customer.firstDeliveryAt?.toDate() ?? null)}
            </p>
          </div>

          {/* 1. Manager 4-Digit PIN */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label htmlFor="exception-pin-input" className="text-sm font-medium text-[#575A4E] flex items-center gap-1.5">
                <Lock className="w-4 h-4 text-[#D97706]" />
                1. PIN do Gerente (4 dígitos)
              </label>
              <span className="text-xs text-[#64795A] tabular-nums">{pin.length}/4 dígitos</span>
            </div>

            <div className="relative">
              <input
                id="exception-pin-input"
                type="password"
                inputMode="numeric"
                maxLength={4}
                value={pin}
                onChange={(e) => {
                  const next = e.target.value.replace(/\D+/g, '').slice(0, 4);
                  setPin(next);
                  setError(null);
                }}
                placeholder="••••"
                autoFocus
                className="w-full h-14 text-center text-2xl tracking-[0.65em] font-display font-bold tabular-nums rounded-2xl border border-[#DDE7D9] bg-[#F8F9FA] text-[#575A4E] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#D97706]"
              />
            </div>

            {/* Compact Touch Numeric Keypad */}
            <div className="grid grid-cols-5 gap-2">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'].map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => handleDigit(d)}
                  className="min-h-[44px] rounded-xl bg-[#F8F9FA] hover:bg-[#DDE7D9]/70 active:scale-95 border border-[#DDE7D9] font-display font-semibold text-base text-[#575A4E] tabular-nums transition-all cursor-pointer"
                >
                  {d}
                </button>
              ))}
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleBackspace}
                className="min-h-[36px] px-3 rounded-xl text-xs font-medium text-[#64795A] hover:text-[#575A4E] hover:bg-[#F8F9FA] inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Delete className="w-3.5 h-3.5" />
                Apagar dígito
              </button>
            </div>
          </div>

          {/* 2. Quick Justification */}
          <div className="space-y-2.5">
            <label htmlFor="exception-justification" className="block text-sm font-medium text-[#575A4E]">
              2. Justificativa Rápida
            </label>
            <div className="flex flex-wrap gap-2">
              {QUICK_JUSTIFICATIONS.map((preset) => {
                const selected = justification === preset;
                return (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => {
                      setJustification(preset);
                      setError(null);
                    }}
                    className={`min-h-[38px] px-3 py-1.5 rounded-full text-xs font-medium border transition-colors cursor-pointer ${
                      selected
                        ? 'bg-[#D97706] border-[#D97706] text-white'
                        : 'bg-white border-[#DDE7D9] text-[#5E6954] hover:border-[#D97706]/50'
                    }`}
                  >
                    {preset}
                  </button>
                );
              })}
            </div>
            <textarea
              id="exception-justification"
              rows={2}
              maxLength={300}
              value={justification}
              onChange={(e) => {
                setJustification(e.target.value);
                setError(null);
              }}
              placeholder="Ex: Produtor parceiro, retirada autorizada pela diretoria..."
              className="w-full rounded-2xl border border-[#DDE7D9] bg-[#F8F9FA] focus:bg-white p-3.5 text-sm text-[#575A4E] focus:outline-none focus:ring-2 focus:ring-[#D97706] resize-none"
            />
          </div>

          {error && (
            <div className="rounded-2xl bg-[#C84343]/10 border border-[#C84343]/30 px-4 py-3 flex items-center gap-2.5 text-sm text-[#C84343]">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="min-h-[52px] px-5 rounded-2xl border border-[#DDE7D9] bg-white hover:bg-[#F8F9FA] text-[#5E6954] font-display font-medium text-sm transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting || pin.length < 4 || justification.trim().length < 3}
              className="flex-1 min-h-[52px] px-6 rounded-2xl bg-[#D97706] hover:bg-[#B45309] disabled:opacity-50 disabled:cursor-not-allowed text-white font-display font-semibold text-sm sm:text-base transition-colors cursor-pointer"
            >
              {submitting ? 'Registrando Exceção...' : 'Confirmar Liberação Gerencial'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

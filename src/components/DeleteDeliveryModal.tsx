import React, { useEffect, useState } from 'react';
import { AlertCircle, AlertTriangle, Delete, Lock, Trash2, X } from 'lucide-react';
import { DeliveryRecord, MANAGER_PIN } from '../types';
import { useCalendar } from '../context/CalendarContext';
import { formatDateTimeBR } from '../utils/validation';

interface DeleteDeliveryModalProps {
  delivery: DeliveryRecord | null;
  customerDeliveryCount: number;
  onClose: () => void;
}

export function DeleteDeliveryModal({
  delivery,
  customerDeliveryCount,
  onClose,
}: DeleteDeliveryModalProps) {
  const { deleteDelivery, pushToast } = useCalendar();

  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (delivery) {
      setPin('');
      setError(null);
      setSubmitting(false);
    }
  }, [delivery]);

  if (!delivery) return null;

  const isOnlyDelivery = customerDeliveryCount <= 1;

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
      setError('PIN gerencial incorreto. Digite o código de 4 dígitos para confirmar.');
      setPin('');
      return;
    }

    setSubmitting(true);
    try {
      await deleteDelivery(delivery);
      pushToast({
        kind: 'exception',
        title: 'Entrega Estornada com Sucesso',
        description: isOnlyDelivery
          ? `Registro removido. O cliente ${delivery.customerName} (#${delivery.registrationNumber}) voltou a ficar liberado para retirada.`
          : `Entrega removida de ${delivery.customerName} (#${delivery.registrationNumber}). Contagem ajustada automaticamente.`,
      });
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Não foi possível excluir a entrega. Tente novamente.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-delivery-title"
      className="fixed inset-0 z-50 bg-[#575A4E]/55 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto"
    >
      <div className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl border border-[#DDE7D9] shadow-2xl overflow-hidden my-auto">
        {/* Header */}
        <div className="px-6 py-5 bg-[#C84343]/10 border-b border-[#C84343]/25 flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#C84343] text-white flex items-center justify-center shrink-0">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h2
                id="delete-delivery-title"
                className="font-display font-semibold text-lg text-[#575A4E]"
              >
                Excluir / Estornar Entrega
              </h2>
              <p className="text-xs text-[#5E6954] mt-0.5">
                Confirmação obrigatória com o PIN da gerência
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

        <form onSubmit={(e) => void handleSubmit(e)} className="p-6 space-y-5">
          {/* Delivery Summary */}
          <div className="rounded-2xl bg-[#F8F9FA] border border-[#DDE7D9] p-4 space-y-1.5 text-sm">
            <div className="flex items-center justify-between gap-2">
              <span className="font-display font-semibold text-[#575A4E] truncate">
                {delivery.customerName}
              </span>
              <span className="font-display font-semibold text-xs text-[#64795A] tabular-nums shrink-0">
                #{delivery.registrationNumber}
              </span>
            </div>
            <p className="text-xs text-[#5E6954] tabular-nums">
              {delivery.branch} · {formatDateTimeBR(delivery.deliveredAt?.toDate() ?? null)}
            </p>
            <p className="text-xs font-medium text-[#64795A]">
              {delivery.type === 'MANAGER_EXCEPTION'
                ? `[LIBERAÇÃO GERENCIAL] ${delivery.justification}`
                : 'Entrega Comum (1 unidade)'}
            </p>
          </div>

          {/* Impact Warning */}
          <div className="rounded-2xl bg-[#D97706]/10 border border-[#D97706]/30 p-3.5 flex items-start gap-2.5 text-xs text-[#575A4E] leading-relaxed">
            <AlertTriangle className="w-4 h-4 text-[#D97706] shrink-0 mt-0.5" />
            <span>
              {isOnlyDelivery ? (
                <>
                  Esta é a <strong>única retirada</strong> registrada para este cadastro. Ao
                  excluir, o cliente voltará a ficar <strong>LIBERADO PARA RETIRADA</strong> em
                  todas as lojas.
                </>
              ) : (
                <>
                  Este cliente possui <strong>{customerDeliveryCount} entregas</strong> registradas.
                  Apenas este registro será apagado e a contagem será ajustada automaticamente.
                </>
              )}
            </span>
          </div>

          {/* Manager 4-Digit PIN */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label
                htmlFor="delete-pin-input"
                className="text-sm font-medium text-[#575A4E] flex items-center gap-1.5"
              >
                <Lock className="w-4 h-4 text-[#C84343]" />
                PIN do Gerente (4 dígitos)
              </label>
              <span className="text-xs text-[#64795A] tabular-nums">{pin.length}/4 dígitos</span>
            </div>

            <input
              id="delete-pin-input"
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={pin}
              autoFocus
              onChange={(e) => {
                const next = e.target.value.replace(/\D+/g, '').slice(0, 4);
                setPin(next);
                setError(null);
              }}
              placeholder="••••"
              className="w-full h-14 text-center text-2xl tracking-[0.65em] font-display font-bold tabular-nums rounded-2xl border border-[#DDE7D9] bg-[#F8F9FA] text-[#575A4E] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#C84343]"
            />

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

          {error && (
            <div className="rounded-2xl bg-[#C84343]/10 border border-[#C84343]/30 px-4 py-3 flex items-center gap-2.5 text-xs text-[#C84343]">
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
              className="min-h-[50px] px-5 rounded-2xl border border-[#DDE7D9] bg-white hover:bg-[#F8F9FA] text-[#5E6954] font-display font-medium text-sm transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting || pin.length < 4}
              className="flex-1 min-h-[50px] px-5 rounded-2xl bg-[#C84343] hover:bg-[#a83535] disabled:opacity-50 disabled:cursor-not-allowed text-white font-display font-semibold text-sm transition-colors cursor-pointer"
            >
              {submitting ? 'Excluindo...' : 'Confirmar Exclusão'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

import React from 'react';
import { CheckCircle2, ShieldAlert, ShieldCheck, X } from 'lucide-react';
import { useCalendar } from '../context/CalendarContext';

export function ToastContainer() {
  const { toasts, dismissToast } = useCalendar();

  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="fixed z-50 bottom-4 left-4 right-4 sm:top-20 sm:bottom-auto sm:left-auto sm:right-6 flex flex-col gap-2.5 sm:w-[390px] pointer-events-none"
    >
      {toasts.map((toast) => {
        const isSuccess = toast.kind === 'success';
        const isException = toast.kind === 'exception';
        const isBlocked = toast.kind === 'blocked' || toast.kind === 'error';

        const containerStyle = isSuccess
          ? 'bg-[#FFFFFF] border-[#649A4E]/40 text-[#575A4E]'
          : isException
          ? 'bg-[#FFFFFF] border-[#D97706]/45 text-[#575A4E]'
          : 'bg-[#FFFFFF] border-[#C84343]/45 text-[#575A4E]';

        const iconColor = isSuccess
          ? 'text-[#649A4E] bg-[#649A4E]/12'
          : isException
          ? 'text-[#D97706] bg-[#D97706]/12'
          : 'text-[#C84343] bg-[#C84343]/12';

        return (
          <div
            key={toast.id}
            role="status"
            className={`pointer-events-auto soft-card rounded-2xl border p-4 flex items-start gap-3 transition-all duration-200 ${containerStyle}`}
          >
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${iconColor}`}>
              {isSuccess && <CheckCircle2 className="w-5 h-5" />}
              {isException && <ShieldCheck className="w-5 h-5" />}
              {isBlocked && <ShieldAlert className="w-5 h-5" />}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-display font-semibold text-sm text-[#575A4E] leading-snug">
                {toast.title}
              </p>
              {toast.description && (
                <p className="text-xs text-[#5E6954] mt-0.5 leading-relaxed">
                  {toast.description}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => dismissToast(toast.id)}
              aria-label="Fechar notificação"
              className="min-w-[32px] min-h-[32px] rounded-lg flex items-center justify-center text-[#64795A] hover:bg-[#DDE7D9]/60 transition-colors cursor-pointer shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

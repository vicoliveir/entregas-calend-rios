import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Building2,
  CalendarCheck2,
  CheckCircle2,
  Clock,
  Hash,
  Lock,
  ShieldAlert,
  ShieldCheck,
  User as UserIcon,
  X,
} from 'lucide-react';
import { CustomerRecord } from '../types';
import { useCalendar } from '../context/CalendarContext';
import {
  formatDateTimeBR,
  formatTimeBR,
  isValidFullName,
  isValidRegistrationNumber,
  sanitizeRegistrationNumber,
} from '../utils/validation';
import { playBlockedAlertSound, playSuccessChime } from '../utils/sound';
import { ManagerExceptionModal } from './ManagerExceptionModal';

export function PosCounterView() {
  const {
    cashierSession,
    customersByNumber,
    deliveries,
    dataLoading,
    confirmRegularDelivery,
    pushToast,
  } = useCalendar();

  const [regInput, setRegInput] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [exceptionCustomer, setExceptionCustomer] = useState<CustomerRecord | null>(null);

  const regInputRef = useRef<HTMLInputElement | null>(null);
  const nameInputRef = useRef<HTMLInputElement | null>(null);
  const lastAlertedRegRef = useRef<string | null>(null);

  const cleanReg = sanitizeRegistrationNumber(regInput);
  const hasRegInput = isValidRegistrationNumber(cleanReg);

  // Instant lookup against real-time Firestore customers map
  const existingCustomer = hasRegInput ? customersByNumber.get(cleanReg) ?? null : null;
  const isBlocked = Boolean(existingCustomer && existingCustomer.hasPickedUp);
  const isEligible = hasRegInput && !isBlocked;

  // Auto-fill name when an existing customer matches; keep manual entry for new customers
  useEffect(() => {
    if (existingCustomer) {
      setNameInput(existingCustomer.fullName);
    }
  }, [existingCustomer]);

  // Trigger dual-tone POS alert sound once when a blocked customer is identified
  useEffect(() => {
    if (isBlocked && existingCustomer) {
      if (lastAlertedRegRef.current !== existingCustomer.registrationNumber) {
        lastAlertedRegRef.current = existingCustomer.registrationNumber;
        playBlockedAlertSound();
      }
    } else if (!hasRegInput || !isBlocked) {
      lastAlertedRegRef.current = null;
    }
  }, [isBlocked, existingCustomer, hasRegInput]);

  // Keep registration field focused on initial mount
  useEffect(() => {
    regInputRef.current?.focus();
  }, []);

  const resetFormForNextCustomer = () => {
    setRegInput('');
    setNameInput('');
    setLocalError(null);
    lastAlertedRegRef.current = null;
    window.setTimeout(() => {
      regInputRef.current?.focus();
    }, 30);
  };

  const handleRegChange = (raw: string) => {
    const cleaned = sanitizeRegistrationNumber(raw);
    setRegInput(cleaned);
    setLocalError(null);
    if (!customersByNumber.has(cleaned) && existingCustomer) {
      setNameInput('');
    }
  };

  const handleConfirmRegular = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cashierSession || !isEligible) return;

    setLocalError(null);
    if (!isValidFullName(nameInput)) {
      setLocalError('Digite o Nome e Sobrenome do cliente para confirmar a retirada.');
      return;
    }

    setSubmitting(true);
    try {
      await confirmRegularDelivery(cleanReg, nameInput);
      playSuccessChime();
      pushToast({
        kind: 'success',
        title: 'Entrega de 1 Calendário Confirmada',
        description: `${nameInput.trim()} (#${cleanReg}) · ${cashierSession.activeBranch}`,
      });
      resetFormForNextCustomer();
    } catch (err) {
      setLocalError(
        err instanceof Error ? err.message : 'Erro ao registrar a entrega. Tente novamente.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Active branch live summary
  const branchMetrics = useMemo(() => {
    if (!cashierSession) {
      return { todayCount: 0, totalBranchCount: 0, recent: [] as typeof deliveries };
    }
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayMs = todayStart.getTime();

    const branchDeliveries = deliveries.filter((d) => d.branch === cashierSession.activeBranch);
    const todayCount = branchDeliveries.filter((d) => {
      const ms = d.deliveredAt ? d.deliveredAt.toMillis() : Date.now();
      return ms >= todayMs;
    }).length;

    return {
      todayCount,
      totalBranchCount: branchDeliveries.length,
      recent: branchDeliveries.slice(0, 6),
    };
  }, [deliveries, cashierSession]);

  if (!cashierSession) return null;

  const todayFormatted = new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
  }).format(new Date());

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* PRIMARY COLUMN: Fast Counter Lookup & Verification */}
        <section className="lg:col-span-8 soft-card rounded-3xl border border-[#DDE7D9] p-5 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-5 mb-6 border-b border-[#DDE7D9]">
            <div>
              <h1 className="font-display text-xl sm:text-2xl font-semibold text-[#575A4E]">
                Controle de Entrega de Calendários
              </h1>
              <p className="text-xs sm:text-sm text-[#64795A] mt-0.5 capitalize">
                {cashierSession.activeBranch} · {todayFormatted}
              </p>
            </div>
            {hasRegInput && (
              <button
                type="button"
                onClick={resetFormForNextCustomer}
                className="min-h-[40px] px-3.5 rounded-full border border-[#DDE7D9] bg-[#F8F9FA] hover:bg-[#DDE7D9]/60 text-xs font-medium text-[#5E6954] inline-flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                Nova Consulta
              </button>
            )}
          </div>

          <form onSubmit={(e) => void handleConfirmRegular(e)} className="space-y-6">
            {/* Field 1: Registration Number (Primary Numeric Search) */}
            <div className="space-y-2">
              <label
                htmlFor="customer-reg-number"
                className="block text-sm font-semibold text-[#575A4E]"
              >
                Número de Cadastro do Cliente
              </label>
              <div className="relative">
                <Hash className="w-6 h-6 text-[#649A4E] absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  ref={regInputRef}
                  id="customer-reg-number"
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  value={regInput}
                  onChange={(e) => handleRegChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && isEligible && !isValidFullName(nameInput)) {
                      e.preventDefault();
                      nameInputRef.current?.focus();
                    }
                  }}
                  placeholder="Digite o número de cadastro..."
                  className="w-full h-16 sm:h-[72px] pl-13 pr-14 rounded-2xl border-2 border-[#DDE7D9] bg-[#F8F9FA] focus:bg-white focus:border-[#649A4E] focus:outline-none text-2xl sm:text-3xl font-display font-semibold text-[#575A4E] tabular-nums placeholder:text-[#A2B999] placeholder:font-normal placeholder:text-lg transition-colors"
                />
                {regInput.length > 0 && (
                  <button
                    type="button"
                    onClick={resetFormForNextCustomer}
                    aria-label="Limpar número de cadastro"
                    className="min-w-[44px] min-h-[44px] absolute right-2 top-1/2 -translate-y-1/2 rounded-xl flex items-center justify-center text-[#64795A] hover:bg-[#DDE7D9]/60 transition-colors cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>

            {/* Field 2: Customer Full Name (Auto-filled or Manual for New) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <label
                  htmlFor="customer-full-name"
                  className="block text-sm font-semibold text-[#575A4E]"
                >
                  Nome e Sobrenome do Cliente
                </label>
                {hasRegInput && !existingCustomer && (
                  <span className="text-xs text-[#649A4E] font-medium">
                    Novo cadastro — preencher no balcão
                  </span>
                )}
                {existingCustomer && (
                  <span className="text-xs text-[#64795A] font-medium">
                    Preenchido automaticamente da base
                  </span>
                )}
              </div>
              <div className="relative">
                <UserIcon className="w-5 h-5 text-[#64795A] absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  ref={nameInputRef}
                  id="customer-full-name"
                  type="text"
                  autoComplete="off"
                  maxLength={120}
                  readOnly={Boolean(existingCustomer)}
                  value={nameInput}
                  onChange={(e) => {
                    setNameInput(e.target.value);
                    setLocalError(null);
                  }}
                  placeholder={
                    hasRegInput
                      ? 'Digite o nome e sobrenome do cliente...'
                      : 'Informe o número de cadastro acima primeiro'
                  }
                  className={`w-full h-14 pl-12 pr-4 rounded-2xl border text-base font-medium transition-colors focus:outline-none ${
                    existingCustomer
                      ? 'bg-[#DDE7D9]/35 border-[#DDE7D9] text-[#575A4E] cursor-default'
                      : 'bg-[#F8F9FA] border-[#DDE7D9] text-[#575A4E] focus:bg-white focus:border-[#649A4E]'
                  }`}
                />
              </div>
            </div>

            {/* INSTANT VERIFICATION AREA */}
            {!hasRegInput ? (
              <div className="rounded-2xl bg-[#F8F9FA] border border-dashed border-[#A2B999] p-6 sm:p-8 text-center">
                <CalendarCheck2 className="w-9 h-9 text-[#649A4E] mx-auto mb-2.5" />
                <p className="font-display font-medium text-base text-[#575A4E]">
                  Pronto para consulta no balcão
                </p>
                <p className="text-sm text-[#64795A] mt-1 max-w-md mx-auto">
                  Digite o número de cadastro do cliente para verificar instantaneamente a
                  disponibilidade de retirada em toda a rede Casa do Campo.
                </p>
              </div>
            ) : isEligible ? (
              /* CENÁRIO A: CLIENTE APTO / NUNCA RETIROU */
              <div className="space-y-5">
                <div className="rounded-2xl bg-[#649A4E]/10 border border-[#649A4E]/35 p-5 flex items-start gap-4">
                  <div className="w-11 h-11 rounded-2xl bg-[#649A4E] text-white flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="inline-flex items-center gap-2 font-display font-bold text-sm sm:text-base text-[#649A4E] tracking-wide">
                      LIBERADO PARA RETIRADA
                    </div>
                    <p className="text-sm text-[#575A4E] mt-1">
                      {nameInput.trim() ? (
                        <>
                          Cliente: <strong className="font-semibold">{nameInput.trim()}</strong> ·
                          Cadastro <span className="tabular-nums font-semibold">#{cleanReg}</span>
                        </>
                      ) : (
                        <>
                          Cadastro <span className="tabular-nums font-semibold">#{cleanReg}</span>{' '}
                          sem retiradas anteriores. Informe Nome e Sobrenome acima para confirmar.
                        </>
                      )}
                    </p>
                  </div>
                </div>

                {localError && (
                  <p className="text-sm text-[#C84343] font-medium px-1">{localError}</p>
                )}

                <button
                  type="submit"
                  disabled={submitting || !isValidFullName(nameInput)}
                  className="w-full min-h-[64px] rounded-2xl bg-[#649A4E] hover:bg-[#5E6954] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed text-white font-display font-semibold text-base sm:text-lg px-6 py-4 flex items-center justify-center gap-3 shadow-lg shadow-[#649A4E]/20 transition-all cursor-pointer"
                >
                  <CalendarCheck2 className="w-6 h-6 shrink-0" />
                  <span>
                    {submitting ? 'Registrando Entrega...' : 'Confirmar Entrega de 1 Calendário'}
                  </span>
                </button>
              </div>
            ) : (
              /* CENÁRIO B: CLIENTE JÁ RETIROU - BLOQUEIO */
              <div className="space-y-5">
                <div
                  role="alert"
                  className="rounded-2xl bg-[#C84343]/10 border-2 border-[#C84343]/45 p-5 sm:p-6 space-y-4"
                >
                  <div className="flex items-start gap-3.5">
                    <div className="w-11 h-11 rounded-2xl bg-[#C84343] text-white flex items-center justify-center shrink-0">
                      <ShieldAlert className="w-6 h-6" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-display font-bold text-sm sm:text-base text-[#C84343] leading-snug">
                        ENTREGA BLOQUEADA: Este cliente já retirou 1 unidade
                      </p>
                      <p className="text-sm text-[#575A4E] font-medium mt-1">
                        {existingCustomer?.fullName} · Cadastro{' '}
                        <span className="tabular-nums">#{existingCustomer?.registrationNumber}</span>
                      </p>
                    </div>
                  </div>

                  {/* Previous Delivery Details */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-[#C84343]/20 text-sm">
                    <div className="flex items-center gap-2.5 text-[#575A4E]">
                      <Clock className="w-4 h-4 text-[#C84343] shrink-0" />
                      <div>
                        <div className="text-xs text-[#64795A]">Data e Hora da Retirada</div>
                        <div className="font-semibold tabular-nums">
                          {formatDateTimeBR(existingCustomer?.firstDeliveryAt?.toDate() ?? null)}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 text-[#575A4E]">
                      <Building2 className="w-4 h-4 text-[#C84343] shrink-0" />
                      <div>
                        <div className="text-xs text-[#64795A]">Loja Onde Foi Retirado</div>
                        <div className="font-semibold">{existingCustomer?.firstDeliveryBranch}</div>
                      </div>
                    </div>
                  </div>

                  {existingCustomer && existingCustomer.deliveryCount > 1 && (
                    <div className="text-xs text-[#D97706] font-medium pt-2 border-t border-[#C84343]/15 tabular-nums">
                      Total entregue a este cadastro (incluindo exceções):{' '}
                      {existingCustomer.deliveryCount} unidades · Última em{' '}
                      {existingCustomer.lastDeliveryBranch} (
                      {formatDateTimeBR(existingCustomer.lastDeliveryAt?.toDate() ?? null)})
                    </div>
                  )}
                </div>

                {/* Common confirmation button explicitly disabled + Manager Exception secondary CTA */}
                <div className="flex flex-col sm:flex-row items-stretch gap-3">
                  <button
                    type="button"
                    disabled
                    className="flex-1 min-h-[58px] rounded-2xl bg-[#DDE7D9]/70 text-[#64795A] font-display font-medium text-sm sm:text-base px-5 py-3.5 flex items-center justify-center gap-2.5 cursor-not-allowed opacity-75"
                  >
                    <Lock className="w-4 h-4 shrink-0" />
                    <span>Confirmar Entrega de 1 Calendário</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => existingCustomer && setExceptionCustomer(existingCustomer)}
                    className="min-h-[58px] rounded-2xl bg-[#D97706] hover:bg-[#B45309] active:scale-[0.99] text-white font-display font-semibold text-sm sm:text-base px-6 py-3.5 flex items-center justify-center gap-2 shadow-md shadow-[#D97706]/20 transition-all cursor-pointer whitespace-nowrap shrink-0"
                  >
                    <ShieldCheck className="w-5 h-5 shrink-0" />
                    <span>Liberar Exceção (Apenas Gerente)</span>
                  </button>
                </div>
              </div>
            )}
          </form>
        </section>

        {/* SECONDARY COLUMN: Active Branch Live Summary & Recent Deliveries */}
        <aside className="lg:col-span-4 space-y-5">
          {/* Active Branch Live Counter */}
          <div className="soft-card rounded-3xl border border-[#DDE7D9] p-6">
            <p className="text-xs font-medium text-[#64795A] uppercase tracking-wider">
              Resumo da Filial Ativa
            </p>
            <h2 className="font-display font-semibold text-lg text-[#575A4E] mt-0.5">
              {cashierSession.activeBranch}
            </h2>

            <div className="grid grid-cols-2 gap-4 mt-5 pt-5 border-t border-[#DDE7D9]">
              <div>
                <div className="text-xs text-[#64795A]">Entregues Hoje</div>
                <div className="font-display font-bold text-3xl text-[#649A4E] tabular-nums mt-1">
                  {dataLoading ? '—' : branchMetrics.todayCount}
                </div>
              </div>
              <div className="border-l border-[#DDE7D9] pl-4">
                <div className="text-xs text-[#64795A]">Total da Filial</div>
                <div className="font-display font-bold text-3xl text-[#575A4E] tabular-nums mt-1">
                  {dataLoading ? '—' : branchMetrics.totalBranchCount}
                </div>
              </div>
            </div>
          </div>

          {/* Recent Deliveries in Active Branch */}
          <div className="soft-card rounded-3xl border border-[#DDE7D9] p-6">
            <div className="flex items-center justify-between gap-2 mb-4">
              <h3 className="font-display font-semibold text-base text-[#575A4E]">
                Últimas Entregas na Loja
              </h3>
              <span className="text-xs text-[#64795A] tabular-nums">
                {branchMetrics.recent.length} recentes
              </span>
            </div>

            {dataLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((idx) => (
                  <div key={idx} className="h-14 rounded-2xl bg-[#F8F9FA] animate-pulse" />
                ))}
              </div>
            ) : branchMetrics.recent.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-sm text-[#64795A]">
                  Nenhuma entrega registrada nesta filial ainda.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-[#DDE7D9]/70">
                {branchMetrics.recent.map((item) => (
                  <li key={item.id} className="py-3 first:pt-0 last:pb-0 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[#575A4E] truncate">
                        {item.customerName}
                      </p>
                      <div className="flex items-center gap-1.5 text-xs text-[#64795A] mt-0.5 tabular-nums">
                        <span>#{item.registrationNumber}</span>
                        <span aria-hidden="true">·</span>
                        <span>{formatTimeBR(item.deliveredAt?.toDate() ?? null)}</span>
                      </div>
                      {item.type === 'MANAGER_EXCEPTION' && (
                        <p className="text-[11px] font-semibold text-[#D97706] mt-1">
                          [LIBERAÇÃO GERENCIAL]
                        </p>
                      )}
                    </div>
                    <span className="text-xs font-medium text-[#649A4E] shrink-0 mt-0.5">
                      1 un.
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>
      </div>

      {/* Manager Exception Modal */}
      <ManagerExceptionModal
        customer={exceptionCustomer}
        onClose={() => setExceptionCustomer(null)}
        onSuccess={() => {
          setExceptionCustomer(null);
          resetFormForNextCustomer();
        }}
      />
    </main>
  );
}

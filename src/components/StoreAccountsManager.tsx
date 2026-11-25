import React, { useState } from 'react';
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  Mail,
  PauseCircle,
  PlayCircle,
  Plus,
  ShieldCheck,
  Trash2,
  UserCheck,
} from 'lucide-react';
import { AuthorizedEmailRecord, BOOTSTRAP_ADMIN_EMAIL, BRANCHES, BranchName } from '../types';
import { useCalendar } from '../context/CalendarContext';
import { isValidEmail, isValidTerminalLabel } from '../utils/validation';

export function StoreAccountsManager() {
  const {
    user,
    isAdminUser,
    authorizedEmails,
    authorizedEmailsLoading,
    addAuthorizedEmail,
    updateAuthorizedEmail,
    removeAuthorizedEmail,
    pushToast,
  } = useCalendar();

  const [emailInput, setEmailInput] = useState('');
  const [branchInput, setBranchInput] = useState<BranchName>('Quixadá (Matriz)');
  const [labelInput, setLabelInput] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!isValidEmail(emailInput)) {
      setFormError('Informe um endereço de e-mail Google válido.');
      return;
    }

    const effectiveLabel = labelInput.trim() || `Caixa — ${branchInput}`;
    if (!isValidTerminalLabel(effectiveLabel)) {
      setFormError('Informe uma identificação válida para o caixa/loja.');
      return;
    }

    setSubmitting(true);
    try {
      await addAuthorizedEmail(emailInput, branchInput, effectiveLabel);
      pushToast({
        kind: 'success',
        title: 'Conta de Loja Autorizada',
        description: `${emailInput.trim().toLowerCase()} agora pode acessar o banco compartilhado (${branchInput}).`,
      });
      setEmailInput('');
      setLabelInput('');
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : 'Não foi possível autorizar este e-mail.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (record: AuthorizedEmailRecord) => {
    setBusyId(record.id);
    try {
      const nextActive = !record.active;
      await updateAuthorizedEmail(record, { active: nextActive });
      pushToast({
        kind: nextActive ? 'success' : 'exception',
        title: nextActive ? 'Acesso Reativado' : 'Acesso Suspenso',
        description: nextActive
          ? `${record.email} voltou a ter permissão ativa.`
          : `${record.email} foi bloqueado imediatamente em todos os terminais.`,
      });
    } catch (err) {
      pushToast({
        kind: 'error',
        title: 'Erro ao atualizar conta',
        description: err instanceof Error ? err.message : 'Tente novamente.',
      });
    } finally {
      setBusyId(null);
    }
  };

  const handleBranchChange = async (record: AuthorizedEmailRecord, nextBranch: BranchName) => {
    if (record.branch === nextBranch) return;
    setBusyId(record.id);
    try {
      await updateAuthorizedEmail(record, { branch: nextBranch });
      pushToast({
        kind: 'success',
        title: 'Filial Padrão Atualizada',
        description: `${record.email} vinculado à filial ${nextBranch}.`,
      });
    } catch (err) {
      pushToast({
        kind: 'error',
        title: 'Erro ao atualizar filial',
        description: err instanceof Error ? err.message : 'Tente novamente.',
      });
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (record: AuthorizedEmailRecord) => {
    setBusyId(record.id);
    try {
      await removeAuthorizedEmail(record.id);
      setConfirmDeleteId(null);
      pushToast({
        kind: 'exception',
        title: 'Conta Removida',
        description: `${record.email} não tem mais acesso ao sistema.`,
      });
    } catch (err) {
      pushToast({
        kind: 'error',
        title: 'Erro ao remover conta',
        description: err instanceof Error ? err.message : 'Tente novamente.',
      });
    } finally {
      setBusyId(null);
    }
  };

  if (!isAdminUser) {
    return (
      <section className="soft-card rounded-3xl border border-[#DDE7D9] p-6 sm:p-8">
        <div className="flex items-start gap-4">
          <div className="w-11 h-11 rounded-2xl bg-[#5E6954]/12 text-[#5E6954] flex items-center justify-center shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div className="space-y-2">
            <h2 className="font-display font-semibold text-lg text-[#575A4E]">
              Gestão Restrita ao Administrador Principal
            </h2>
            <p className="text-sm text-[#5E6954] leading-relaxed max-w-2xl">
              Você está conectado com a conta de loja{' '}
              <strong className="text-[#575A4E]">{user?.email}</strong>. Por segurança do banco de
              dados compartilhado, apenas o administrador principal (
              <strong className="text-[#575A4E]">{BOOTSTRAP_ADMIN_EMAIL}</strong>) pode autorizar,
              suspender ou remover e-mails Google de outras filiais.
            </p>
            <p className="text-xs text-[#64795A]">
              Para gerenciar os e-mails das lojas, entre com a conta Google{' '}
              <strong>{BOOTSTRAP_ADMIN_EMAIL}</strong> neste mesmo Painel Gerencial.
            </p>
          </div>
        </div>
      </section>
    );
  }

  const activeCount = authorizedEmails.filter((item) => item.active).length;

  return (
    <div className="space-y-6">
      {/* Add New Authorized Store Email Card */}
      <section className="soft-card rounded-3xl border border-[#DDE7D9] p-6">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-5">
          <div>
            <h2 className="font-display font-semibold text-lg text-[#575A4E]">
              Autorizar E-mail Google de Filial
            </h2>
            <p className="text-xs sm:text-sm text-[#64795A] mt-0.5">
              Todas as contas ativas abaixo compartilham o mesmo banco de dados, a trava de 1
              unidade e a contagem geral entre as 4 lojas.
            </p>
          </div>
          <span className="text-xs font-medium text-[#649A4E] tabular-nums">
            {activeCount} conta(s) ativa(s) + administrador
          </span>
        </div>

        <form onSubmit={(e) => void handleAdd(e)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5">
            <div className="md:col-span-5 space-y-1.5">
              <label htmlFor="store-email-input" className="block text-xs font-semibold text-[#575A4E]">
                E-mail Google da Loja / Caixa
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#64795A] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="store-email-input"
                  type="email"
                  required
                  value={emailInput}
                  onChange={(e) => {
                    setEmailInput(e.target.value);
                    setFormError(null);
                  }}
                  placeholder="ex: caixa.iguatu@gmail.com"
                  className="w-full h-12 pl-10 pr-4 rounded-2xl border border-[#DDE7D9] bg-[#F8F9FA] focus:bg-white text-sm text-[#575A4E] focus:outline-none focus:ring-2 focus:ring-[#649A4E]"
                />
              </div>
            </div>

            <div className="md:col-span-3 space-y-1.5">
              <label htmlFor="store-branch-select" className="block text-xs font-semibold text-[#575A4E]">
                Filial Padrão
              </label>
              <div className="relative">
                <Building2 className="w-4 h-4 text-[#64795A] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <select
                  id="store-branch-select"
                  value={branchInput}
                  onChange={(e) => setBranchInput(e.target.value as BranchName)}
                  className="w-full h-12 pl-10 pr-4 rounded-2xl border border-[#DDE7D9] bg-[#F8F9FA] focus:bg-white text-sm text-[#575A4E] focus:outline-none focus:ring-2 focus:ring-[#649A4E] cursor-pointer"
                >
                  {BRANCHES.map((branch) => (
                    <option key={branch} value={branch}>
                      {branch}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="md:col-span-4 space-y-1.5">
              <label htmlFor="store-label-input" className="block text-xs font-semibold text-[#575A4E]">
                Identificação (Opcional)
              </label>
              <input
                id="store-label-input"
                type="text"
                maxLength={80}
                value={labelInput}
                onChange={(e) => {
                  setLabelInput(e.target.value);
                  setFormError(null);
                }}
                placeholder={`Ex: Caixa 01 — ${branchInput}`}
                className="w-full h-12 px-4 rounded-2xl border border-[#DDE7D9] bg-[#F8F9FA] focus:bg-white text-sm text-[#575A4E] focus:outline-none focus:ring-2 focus:ring-[#649A4E]"
              />
            </div>
          </div>

          {formError && (
            <div className="rounded-2xl bg-[#C84343]/10 border border-[#C84343]/30 px-4 py-3 flex items-center gap-2.5 text-sm text-[#C84343]">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={submitting || !emailInput.trim()}
              className="min-h-[48px] px-6 rounded-full bg-[#649A4E] hover:bg-[#5E6954] disabled:opacity-50 text-white font-display font-semibold text-sm inline-flex items-center gap-2 transition-colors shadow-md shadow-[#649A4E]/15 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              {submitting ? 'Autorizando...' : 'Autorizar E-mail'}
            </button>
          </div>
        </form>
      </section>

      {/* Authorized Accounts List */}
      <section className="soft-card rounded-3xl border border-[#DDE7D9] overflow-hidden">
        <div className="p-5 sm:p-6 border-b border-[#DDE7D9] flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-[#649A4E]" />
            <h3 className="font-display font-semibold text-lg text-[#575A4E]">
              Contas Autorizadas na Rede
            </h3>
          </div>
          <span className="text-xs text-[#64795A] tabular-nums">
            {authorizedEmails.length + 1} conta(s) no total
          </span>
        </div>

        <div className="divide-y divide-[#DDE7D9]/70">
          {/* Permanent Bootstrap Admin Row */}
          <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#F8F9FA]/60">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-display font-semibold text-sm text-[#575A4E] break-all">
                  {BOOTSTRAP_ADMIN_EMAIL}
                </span>
                <span className="text-xs font-semibold text-[#649A4E]">
                  · Administrador Principal
                </span>
              </div>
              <p className="text-xs text-[#64795A] mt-0.5">
                Acesso permanente a todas as filiais e gestão de contas autorizadas
              </p>
            </div>
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#649A4E] shrink-0">
              <CheckCircle2 className="w-4 h-4" />
              Sempre Ativo
            </div>
          </div>

          {authorizedEmailsLoading ? (
            <div className="p-6 space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="h-14 rounded-2xl bg-[#F8F9FA] animate-pulse" />
              ))}
            </div>
          ) : authorizedEmails.length === 0 ? (
            <div className="py-10 px-6 text-center">
              <p className="font-display font-medium text-sm text-[#575A4E]">
                Nenhum e-mail adicional de filial cadastrado ainda
              </p>
              <p className="text-xs text-[#64795A] mt-1">
                Adicione acima os e-mails Google de Quixadá, Quixeramobim, Morada Nova ou Iguatu
                para que cada loja acesse com sua própria conta.
              </p>
            </div>
          ) : (
            authorizedEmails.map((item) => {
              const isBusy = busyId === item.id;
              const isConfirmingDelete = confirmDeleteId === item.id;

              return (
                <div
                  key={item.id}
                  className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:bg-[#F8F9FA]/60 transition-colors"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-display font-semibold text-sm text-[#575A4E] break-all">
                        {item.email}
                      </span>
                      <span
                        className={`text-xs font-semibold ${
                          item.active ? 'text-[#649A4E]' : 'text-[#C84343]'
                        }`}
                      >
                        · {item.active ? 'Ativo' : 'Suspenso'}
                      </span>
                    </div>
                    <p className="text-xs text-[#64795A]">{item.label}</p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                    {/* Branch reassignment dropdown */}
                    <select
                      aria-label={`Filial padrão de ${item.email}`}
                      disabled={isBusy}
                      value={item.branch}
                      onChange={(e) => void handleBranchChange(item, e.target.value as BranchName)}
                      className="min-h-[42px] px-3 rounded-xl border border-[#DDE7D9] bg-white text-xs font-medium text-[#575A4E] focus:outline-none focus:ring-2 focus:ring-[#649A4E] cursor-pointer"
                    >
                      {BRANCHES.map((branch) => (
                        <option key={branch} value={branch}>
                          {branch}
                        </option>
                      ))}
                    </select>

                    {/* Activate / Suspend button */}
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => void handleToggleActive(item)}
                      className={`min-h-[42px] px-3.5 rounded-xl border text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
                        item.active
                          ? 'border-[#D97706]/35 bg-[#D97706]/10 text-[#D97706] hover:bg-[#D97706]/20'
                          : 'border-[#649A4E]/35 bg-[#649A4E]/10 text-[#649A4E] hover:bg-[#649A4E]/20'
                      }`}
                    >
                      {item.active ? (
                        <>
                          <PauseCircle className="w-4 h-4" />
                          Suspender
                        </>
                      ) : (
                        <>
                          <PlayCircle className="w-4 h-4" />
                          Reativar
                        </>
                      )}
                    </button>

                    {/* Delete with inline confirmation */}
                    {isConfirmingDelete ? (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => void handleDelete(item)}
                          className="min-h-[42px] px-3 rounded-xl bg-[#C84343] hover:bg-[#a83535] text-white text-xs font-semibold cursor-pointer"
                        >
                          Confirmar
                        </button>
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => setConfirmDeleteId(null)}
                          className="min-h-[42px] px-3 rounded-xl border border-[#DDE7D9] bg-white text-xs font-medium text-[#5E6954] cursor-pointer"
                        >
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => setConfirmDeleteId(item.id)}
                        aria-label={`Remover acesso de ${item.email}`}
                        className="min-w-[42px] min-h-[42px] rounded-xl border border-[#DDE7D9] bg-white hover:border-[#C84343]/40 hover:text-[#C84343] text-[#64795A] flex items-center justify-center transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}

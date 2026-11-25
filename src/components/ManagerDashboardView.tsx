import React, { useMemo, useState } from 'react';
import {
  Building2,
  Calendar,
  CheckCircle2,
  Download,
  Filter,
  Search,
  ShieldCheck,
  X,
} from 'lucide-react';
import { BRANCHES, BranchName, DeliveryType } from '../types';
import { useCalendar } from '../context/CalendarContext';
import { formatDateTimeBR, toLocalDateInputValue } from '../utils/validation';
import { exportDeliveriesToCsv } from '../utils/csvExport';

export function ManagerDashboardView() {
  const { deliveries, dataLoading, pushToast } = useCalendar();

  const [branchFilter, setBranchFilter] = useState<'ALL' | BranchName>('ALL');
  const [typeFilter, setTypeFilter] = useState<'ALL' | DeliveryType>('ALL');
  const [dateFilter, setDateFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');

  // Overall & per-branch metrics
  const metrics = useMemo(() => {
    const total = deliveries.length;
    let regularCount = 0;
    let exceptionCount = 0;

    const byBranch: Record<
      BranchName,
      { total: number; regular: number; exception: number }
    > = {
      'Quixadá (Matriz)': { total: 0, regular: 0, exception: 0 },
      Quixeramobim: { total: 0, regular: 0, exception: 0 },
      'Morada Nova': { total: 0, regular: 0, exception: 0 },
      Iguatu: { total: 0, regular: 0, exception: 0 },
    };

    for (const d of deliveries) {
      if (d.type === 'MANAGER_EXCEPTION') {
        exceptionCount += 1;
      } else {
        regularCount += 1;
      }

      if (byBranch[d.branch]) {
        byBranch[d.branch].total += 1;
        if (d.type === 'MANAGER_EXCEPTION') {
          byBranch[d.branch].exception += 1;
        } else {
          byBranch[d.branch].regular += 1;
        }
      }
    }

    const regularPct = total > 0 ? Math.round((regularCount / total) * 100) : 0;
    const exceptionPct = total > 0 ? Math.round((exceptionCount / total) * 100) : 0;

    return {
      total,
      regularCount,
      exceptionCount,
      regularPct,
      exceptionPct,
      byBranch,
    };
  }, [deliveries]);

  // Filtered audit table records
  const filteredDeliveries = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return deliveries.filter((item) => {
      if (branchFilter !== 'ALL' && item.branch !== branchFilter) {
        return false;
      }
      if (typeFilter !== 'ALL' && item.type !== typeFilter) {
        return false;
      }
      if (dateFilter) {
        const dt = item.deliveredAt?.toDate();
        if (!dt || toLocalDateInputValue(dt) !== dateFilter) {
          return false;
        }
      }
      if (q) {
        const matchesReg = item.registrationNumber.toLowerCase().includes(q);
        const matchesName = item.customerName.toLowerCase().includes(q);
        const matchesJust = item.justification.toLowerCase().includes(q);
        if (!matchesReg && !matchesName && !matchesJust) {
          return false;
        }
      }
      return true;
    });
  }, [deliveries, branchFilter, typeFilter, dateFilter, searchQuery]);

  const hasActiveFilters =
    branchFilter !== 'ALL' || typeFilter !== 'ALL' || dateFilter !== '' || searchQuery.trim() !== '';

  const clearFilters = () => {
    setBranchFilter('ALL');
    setTypeFilter('ALL');
    setDateFilter('');
    setSearchQuery('');
  };

  const handleExport = () => {
    if (filteredDeliveries.length === 0) {
      pushToast({
        kind: 'blocked',
        title: 'Nenhum registro para exportar',
        description: 'Ajuste os filtros ou aguarde registros de entrega.',
      });
      return;
    }
    exportDeliveriesToCsv(filteredDeliveries);
    pushToast({
      kind: 'success',
      title: 'Relatório Exportado (.CSV / Excel)',
      description: `${filteredDeliveries.length} registro(s) exportado(s) com sucesso.`,
    });
  };

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      {/* Dashboard Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-semibold text-[#575A4E]">
            Painel Gerencial e Auditoria
          </h1>
          <p className="text-sm text-[#64795A] mt-1">
            Acompanhamento consolidado das entregas de calendários nas 4 filiais da Casa do Campo.
          </p>
        </div>

        <button
          type="button"
          onClick={handleExport}
          className="min-h-[48px] inline-flex items-center justify-center gap-2.5 bg-[#649A4E] hover:bg-[#5E6954] text-white font-display font-semibold text-sm px-5 py-3 rounded-full shadow-md shadow-[#649A4E]/15 transition-colors cursor-pointer whitespace-nowrap shrink-0"
        >
          <Download className="w-4 h-4" />
          Exportar Relatório (.CSV / Excel)
        </button>
      </div>

      {/* Primary KPI Row */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
        <div className="soft-card rounded-3xl border border-[#DDE7D9] p-6">
          <div className="text-xs font-medium text-[#64795A] uppercase tracking-wider">
            Total de Calendários Entregues
          </div>
          <div className="font-display font-bold text-4xl text-[#575A4E] tabular-nums mt-2">
            {dataLoading ? '—' : metrics.total}
          </div>
          <p className="text-xs text-[#64795A] mt-2">
            Soma geral de todas as 4 lojas da rede
          </p>
        </div>

        <div className="soft-card rounded-3xl border border-[#DDE7D9] p-6">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-[#64795A] uppercase tracking-wider">
              Liberações Comuns
            </span>
            <CheckCircle2 className="w-4 h-4 text-[#649A4E]" />
          </div>
          <div className="flex items-baseline gap-2.5 mt-2">
            <span className="font-display font-bold text-4xl text-[#649A4E] tabular-nums">
              {dataLoading ? '—' : metrics.regularCount}
            </span>
            {!dataLoading && (
              <span className="text-sm font-medium text-[#64795A] tabular-nums">
                {metrics.regularPct}% do total
              </span>
            )}
          </div>
          <p className="text-xs text-[#64795A] mt-2">
            Primeira unidade por cliente (regra padrão)
          </p>
        </div>

        <div className="soft-card rounded-3xl border border-[#DDE7D9] p-6">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-[#64795A] uppercase tracking-wider">
              Exceções Gerenciais
            </span>
            <ShieldCheck className="w-4 h-4 text-[#D97706]" />
          </div>
          <div className="flex items-baseline gap-2.5 mt-2">
            <span className="font-display font-bold text-4xl text-[#D97706] tabular-nums">
              {dataLoading ? '—' : metrics.exceptionCount}
            </span>
            {!dataLoading && (
              <span className="text-sm font-medium text-[#64795A] tabular-nums">
                {metrics.exceptionPct}% do total
              </span>
            )}
          </div>
          <p className="text-xs text-[#64795A] mt-2">
            Entregas adicionais liberadas com PIN de gerência
          </p>
        </div>
      </section>

      {/* Per-Branch Breakdown */}
      <section className="soft-card rounded-3xl border border-[#DDE7D9] p-6">
        <div className="flex items-center gap-2 mb-5">
          <Building2 className="w-5 h-5 text-[#649A4E]" />
          <h2 className="font-display font-semibold text-lg text-[#575A4E]">
            Entregas por Filial
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {BRANCHES.map((branch) => {
            const stat = metrics.byBranch[branch];
            const sharePct =
              metrics.total > 0 ? Math.round((stat.total / metrics.total) * 100) : 0;

            return (
              <div
                key={branch}
                className="rounded-2xl bg-[#F8F9FA] border border-[#DDE7D9] p-4 flex flex-col justify-between gap-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-display font-semibold text-sm text-[#575A4E] truncate">
                    {branch}
                  </span>
                  <span className="text-xs text-[#64795A] tabular-nums shrink-0">
                    {sharePct}%
                  </span>
                </div>

                <div className="font-display font-bold text-3xl text-[#575A4E] tabular-nums">
                  {dataLoading ? '—' : stat.total}
                </div>

                <div className="space-y-2">
                  <div className="w-full h-2 rounded-full bg-[#DDE7D9] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[#649A4E] transition-all duration-300"
                      style={{ width: `${sharePct}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs text-[#64795A] tabular-nums">
                    <span>Comuns: {stat.regular}</span>
                    <span>Exceções: {stat.exception}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Audit Table & Filters */}
      <section className="soft-card rounded-3xl border border-[#DDE7D9] overflow-hidden">
        <div className="p-5 sm:p-6 border-b border-[#DDE7D9] space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-[#649A4E]" />
              <h2 className="font-display font-semibold text-lg text-[#575A4E]">
                Tabela de Auditoria
              </h2>
            </div>
            <div className="flex items-center gap-3 text-xs text-[#64795A] tabular-nums">
              <span>
                Exibindo <strong className="text-[#575A4E]">{filteredDeliveries.length}</strong> de{' '}
                {deliveries.length} registro(s)
              </span>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="inline-flex items-center gap-1 text-[#C84343] hover:underline font-medium cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                  Limpar filtros
                </button>
              )}
            </div>
          </div>

          {/* Filter Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3">
            {/* Search by Reg Number / Name */}
            <div className="lg:col-span-5 relative">
              <Search className="w-4 h-4 text-[#64795A] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por Nº Cadastro, Nome ou Justificativa..."
                aria-label="Buscar por número de cadastro ou nome"
                className="w-full h-11 pl-10 pr-4 rounded-xl border border-[#DDE7D9] bg-[#F8F9FA] focus:bg-white text-sm text-[#575A4E] focus:outline-none focus:ring-2 focus:ring-[#649A4E]"
              />
            </div>

            {/* Branch Filter */}
            <div className="lg:col-span-3">
              <select
                aria-label="Filtrar por loja"
                value={branchFilter}
                onChange={(e) => setBranchFilter(e.target.value as 'ALL' | BranchName)}
                className="w-full h-11 px-3.5 rounded-xl border border-[#DDE7D9] bg-[#F8F9FA] focus:bg-white text-sm text-[#575A4E] focus:outline-none focus:ring-2 focus:ring-[#649A4E] cursor-pointer"
              >
                <option value="ALL">Todas as Lojas</option>
                {BRANCHES.map((branch) => (
                  <option key={branch} value={branch}>
                    {branch}
                  </option>
                ))}
              </select>
            </div>

            {/* Date Filter */}
            <div className="lg:col-span-2 relative">
              <Calendar className="w-4 h-4 text-[#64795A] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="date"
                aria-label="Filtrar por data"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-full h-11 pl-9 pr-3 rounded-xl border border-[#DDE7D9] bg-[#F8F9FA] focus:bg-white text-sm text-[#575A4E] tabular-nums focus:outline-none focus:ring-2 focus:ring-[#649A4E]"
              />
            </div>

            {/* Type Filter */}
            <div className="lg:col-span-2">
              <select
                aria-label="Filtrar por tipo de entrega"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as 'ALL' | DeliveryType)}
                className="w-full h-11 px-3.5 rounded-xl border border-[#DDE7D9] bg-[#F8F9FA] focus:bg-white text-sm text-[#575A4E] focus:outline-none focus:ring-2 focus:ring-[#649A4E] cursor-pointer"
              >
                <option value="ALL">Todos os Tipos</option>
                <option value="REGULAR">Entrega Comum</option>
                <option value="MANAGER_EXCEPTION">Exceção Gerencial</option>
              </select>
            </div>
          </div>
        </div>

        {/* Table Content */}
        {dataLoading ? (
          <div className="p-6 space-y-3">
            {[1, 2, 3, 4, 5].map((n) => (
              <div key={n} className="h-11 rounded-xl bg-[#F8F9FA] animate-pulse" />
            ))}
          </div>
        ) : filteredDeliveries.length === 0 ? (
          <div className="py-14 px-6 text-center">
            <p className="font-display font-medium text-base text-[#575A4E]">
              Nenhum registro encontrado
            </p>
            <p className="text-sm text-[#64795A] mt-1">
              {hasActiveFilters
                ? 'Tente ajustar os filtros de loja, data ou busca acima.'
                : 'As entregas registradas nos caixas das 4 filiais aparecerão aqui em tempo real.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#F8F9FA] border-b border-[#DDE7D9] text-xs font-semibold text-[#64795A] uppercase tracking-wider">
                  <th className="py-3.5 px-5 whitespace-nowrap">Data / Hora</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">Nº Cadastro</th>
                  <th className="py-3.5 px-4">Cliente</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">Filial</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">Tipo</th>
                  <th className="py-3.5 px-5">Justificativa</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DDE7D9]/70 text-sm">
                {filteredDeliveries.map((item) => {
                  const isException = item.type === 'MANAGER_EXCEPTION';
                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-[#F8F9FA]/80 transition-colors"
                    >
                      <td className="py-3.5 px-5 text-[#5E6954] tabular-nums whitespace-nowrap">
                        {formatDateTimeBR(item.deliveredAt?.toDate() ?? null)}
                      </td>
                      <td className="py-3.5 px-4 font-display font-semibold text-[#575A4E] tabular-nums whitespace-nowrap">
                        #{item.registrationNumber}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-[#575A4E]">
                        {item.customerName}
                      </td>
                      <td className="py-3.5 px-4 text-[#5E6954] whitespace-nowrap">
                        {item.branch}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {isException ? (
                          <span className="font-semibold text-xs text-[#D97706]">
                            [LIBERAÇÃO GERENCIAL]
                          </span>
                        ) : (
                          <span className="font-medium text-xs text-[#649A4E]">
                            Entrega Comum
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-5 text-xs text-[#5E6954] max-w-xs">
                        {isException ? item.justification : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}

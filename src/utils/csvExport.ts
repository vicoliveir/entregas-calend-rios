import { DeliveryRecord } from '../types';
import { formatDateTimeBR } from './validation';

function escapeCsvCell(value: string): string {
  const safe = value.replace(/"/g, '""');
  return `"${safe}"`;
}

/**
 * Exports audit delivery records as an Excel-friendly CSV (UTF-8 with BOM, semicolon delimiter).
 */
export function exportDeliveriesToCsv(records: DeliveryRecord[], filenamePrefix = 'casa-do-campo-calendarios'): void {
  const headers = [
    'Data e Hora',
    'Número de Cadastro',
    'Nome do Cliente',
    'Filial',
    'Tipo de Liberação',
    'Justificativa',
    'Operador',
  ];

  const rows = records.map((item) => {
    const dateStr = formatDateTimeBR(item.deliveredAt?.toDate() ?? null);
    const typeLabel =
      item.type === 'MANAGER_EXCEPTION' ? '[LIBERAÇÃO GERENCIAL]' : 'Entrega Comum';
    return [
      dateStr,
      item.registrationNumber,
      item.customerName,
      item.branch,
      typeLabel,
      item.justification || '-',
      item.operatorLabel,
    ]
      .map((cell) => escapeCsvCell(String(cell)))
      .join(';');
  });

  const csvContent = '\uFEFF' + [headers.map(escapeCsvCell).join(';'), ...rows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const now = new Date();
  const stamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
    now.getDate()
  ).padStart(2, '0')}`;

  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `${filenamePrefix}-${stamp}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

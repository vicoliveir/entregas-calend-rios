import { Timestamp } from 'firebase/firestore';

export type BranchName =
  | 'Quixadá (Matriz)'
  | 'Quixeramobim'
  | 'Morada Nova'
  | 'Iguatu';

export const BRANCHES: readonly BranchName[] = [
  'Quixadá (Matriz)',
  'Quixeramobim',
  'Morada Nova',
  'Iguatu',
] as const;

export type DeliveryType = 'REGULAR' | 'MANAGER_EXCEPTION';

export interface CustomerRecord {
  registrationNumber: string;
  fullName: string;
  hasPickedUp: boolean;
  deliveryCount: number;
  firstDeliveryAt: Timestamp | null;
  firstDeliveryBranch: BranchName;
  lastDeliveryAt: Timestamp | null;
  lastDeliveryBranch: BranchName;
  ownerUid: string;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export interface DeliveryRecord {
  id: string;
  registrationNumber: string;
  customerName: string;
  branch: BranchName;
  type: DeliveryType;
  justification: string;
  operatorLabel: string;
  ownerUid: string;
  deliveredAt: Timestamp | null;
}

export interface ToastMessage {
  id: string;
  kind: 'success' | 'blocked' | 'exception' | 'error';
  title: string;
  description?: string;
}

export const MANAGER_PIN = '1397';
export const BOOTSTRAP_ADMIN_EMAIL = 'victorhugoqxd@gmail.com';
export const DEFAULT_CASHIER_USER = 'caixa';
export const DEFAULT_CASHIER_PASS = 'campo2026';

export const QUICK_JUSTIFICATIONS: readonly string[] = [
  'Produtor parceiro',
  'Retirada autorizada pela diretoria',
  'Substituição de calendário danificado',
  'Cliente com múltiplas propriedades rurais',
] as const;

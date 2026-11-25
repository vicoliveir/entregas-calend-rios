import { BRANCHES, BranchName } from '../types';

// Synchronized verbatim with firebase-blueprint.json constraints
export const REGISTRATION_NUMBER_PATTERN = /^[0-9]+$/;
export const REGISTRATION_NUMBER_MAX_LENGTH = 20;
export const FULL_NAME_MIN_LENGTH = 2;
export const FULL_NAME_MAX_LENGTH = 120;
export const JUSTIFICATION_MIN_LENGTH = 3;
export const JUSTIFICATION_MAX_LENGTH = 300;
export const OPERATOR_LABEL_MAX_LENGTH = 80;

export function sanitizeRegistrationNumber(raw: string): string {
  return raw.replace(/\D+/g, '').slice(0, REGISTRATION_NUMBER_MAX_LENGTH);
}

export function isValidRegistrationNumber(value: string): boolean {
  return (
    value.length >= 1 &&
    value.length <= REGISTRATION_NUMBER_MAX_LENGTH &&
    REGISTRATION_NUMBER_PATTERN.test(value)
  );
}

export function sanitizeFullName(raw: string): string {
  return raw.replace(/\s+/g, ' ').trim().slice(0, FULL_NAME_MAX_LENGTH);
}

export function isValidFullName(value: string): boolean {
  const clean = sanitizeFullName(value);
  return clean.length >= FULL_NAME_MIN_LENGTH && clean.length <= FULL_NAME_MAX_LENGTH;
}

export function sanitizeJustification(raw: string): string {
  return raw.replace(/\s+/g, ' ').trim().slice(0, JUSTIFICATION_MAX_LENGTH);
}

export function isValidJustification(value: string): boolean {
  const clean = sanitizeJustification(value);
  return clean.length >= JUSTIFICATION_MIN_LENGTH && clean.length <= JUSTIFICATION_MAX_LENGTH;
}

export function sanitizeOperatorLabel(raw: string): string {
  const clean = raw.replace(/\s+/g, ' ').trim().slice(0, OPERATOR_LABEL_MAX_LENGTH);
  return clean.length > 0 ? clean : 'caixa';
}

export function isValidBranch(value: string): value is BranchName {
  return (BRANCHES as readonly string[]).includes(value);
}

export function formatDateTimeBR(date: Date | null | undefined): string {
  if (!date) return 'Sincronizando...';
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function formatTimeBR(date: Date | null | undefined): string {
  if (!date) return '--:--';
  return new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function toLocalDateInputValue(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

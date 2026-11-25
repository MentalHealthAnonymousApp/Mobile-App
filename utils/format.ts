import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export function formatSentDate(iso: string): string {
  try {
    const date = new Date(iso);
    if (isNaN(date.getTime())) return 'Recently';

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return 'Recently';
  }
}

/** Formats a Stripe amount (in minor units, e.g. cents) such as 4900 USD as "$49". */
export function formatPrice(amountMinor: number | null | undefined, currency?: string | null): string | null {
  if (typeof amountMinor !== 'number' || !currency) return null;
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
      minimumFractionDigits: amountMinor % 100 === 0 ? 0 : 2,
    }).format(amountMinor / 100);
  } catch {
    return null;
  }
}

/** Reads the message from an RTK Query error produced by the API layer. */
export function getApiErrorMessage(error: unknown, fallback: string): string {
  if (typeof error !== 'object' || error === null || !('data' in error)) return fallback;
  const data = (error as { data: unknown }).data;
  if (typeof data === 'string' && data.trim()) return data;
  if (typeof data === 'object' && data !== null && 'message' in data) {
    const message = (data as { message: unknown }).message;
    if (typeof message === 'string' && message.trim()) return message;
  }
  return fallback;
}

/** Status code of an RTK Query error produced by the API layer. */
export function getApiErrorStatus(error: unknown): number | undefined {
  if (typeof error !== 'object' || error === null || !('status' in error)) return undefined;
  const status = (error as { status: unknown }).status;
  return typeof status === 'number' ? status : undefined;
}

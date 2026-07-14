import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatPercent(value: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'percent',
    maximumFractionDigits: 2,
    signDisplay: 'always'
  }).format(value / 100);
}

export function formatLargeNumber(value: number) {
  if (value >= 10000000) {
    return `${(value / 10000000).toFixed(2)}Cr`;
  }
  if (value >= 100000) {
    return `${(value / 100000).toFixed(2)}L`;
  }
  return new Intl.NumberFormat('en-IN').format(value);
}

export function formatTime(isoString: string) {
  return new Date(isoString).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
}

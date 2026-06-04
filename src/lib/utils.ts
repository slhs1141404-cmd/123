import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(num: number): string {
  if (num >= 100000000) return (num / 100000000).toFixed(1) + ' 億';
  if (num >= 10000) return (num / 10000).toFixed(1) + ' 萬';
  return num.toLocaleString('zh-TW');
}

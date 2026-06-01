import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import type { Transaction } from "@/lib/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number, currency = 'INR') {
  const isNegative = amount < 0;
  const absoluteAmount = Math.abs(amount);

  const formattedAmount = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(absoluteAmount);

  return (isNegative ? '-' : '') + formattedAmount;
}

export function calculateBalance(transactions: Transaction[]): number {
  return transactions.reduce((acc, t) => {
    if (t.isDeleted) return acc;
    // Positive balance means you owe them (advance), negative means they owe you (due)
    if (t.type === 'GOT') {
      return acc + t.amount;
    } else { // 'GAVE'
      return acc - t.amount;
    }
  }, 0);
}

import { InvoiceLine, DiscountType, VatRate } from "@/types";

/**
 * Calcule les montants d'une ligne de facture
 */
export function calculateLine(line: {
  quantity: number;
  unitPrice: number;
  discountType: DiscountType;
  discountValue: number;
  vatApplicable: boolean;
  vatRate: VatRate | null;
}): { lineTotalExclVat: number; lineVatAmount: number; lineTotalInclVat: number } {
  const gross = line.quantity * line.unitPrice;

  let discount = 0;
  if (line.discountType === "amount") {
    discount = Math.min(line.discountValue, gross);
  } else if (line.discountType === "percent") {
    discount = gross * (line.discountValue / 100);
  }

  const lineTotalExclVat = Math.max(0, gross - discount);
  const vatRate = line.vatApplicable && line.vatRate !== null ? line.vatRate : 0;
  const lineVatAmount = lineTotalExclVat * (vatRate / 100);
  const lineTotalInclVat = lineTotalExclVat + lineVatAmount;

  return {
    lineTotalExclVat: round2(lineTotalExclVat),
    lineVatAmount: round2(lineVatAmount),
    lineTotalInclVat: round2(lineTotalInclVat),
  };
}

/**
 * Calcule les totaux d'une facture
 */
export function calculateInvoiceTotals(
  lines: InvoiceLine[],
  discountType: DiscountType,
  discountValue: number
): { subtotalExclVat: number; totalVat: number; totalInclVat: number } {
  const subtotalExclVat = round2(lines.reduce((sum, l) => sum + l.lineTotalExclVat, 0));
  const rawVat = round2(lines.reduce((sum, l) => sum + l.lineVatAmount, 0));

  let globalDiscount = 0;
  if (discountType === "amount") {
    globalDiscount = Math.min(discountValue, subtotalExclVat);
  } else if (discountType === "percent") {
    globalDiscount = subtotalExclVat * (discountValue / 100);
  }

  const discountedSubtotal = round2(subtotalExclVat - globalDiscount);
  // Recalculer TVA proportionnellement si remise globale
  const vatRatio = subtotalExclVat > 0 ? discountedSubtotal / subtotalExclVat : 1;
  const totalVat = round2(rawVat * vatRatio);
  const totalInclVat = round2(discountedSubtotal + totalVat);

  return { subtotalExclVat: discountedSubtotal, totalVat, totalInclVat };
}

/**
 * Calcule la date d'échéance
 */
export function calculateDueDate(invoiceDate: Date, delayDays: number): Date {
  const due = new Date(invoiceDate);
  due.setDate(due.getDate() + delayDays);
  return due;
}

/**
 * Détermine le statut de paiement selon les montants
 */
export function resolvePaymentStatus(
  amountPaid: number,
  totalInclVat: number,
  dueDate: Date,
  currentStatus: string
): "pending" | "overdue" | "partially_paid" | "paid" {
  if (amountPaid >= totalInclVat) return "paid";
  if (amountPaid > 0) return "partially_paid";
  if (new Date() > dueDate) return "overdue";
  return "pending";
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Formate un montant en CHF
 */
export function formatAmount(amount: number, currency = "CHF"): string {
  return `${currency} ${new Intl.NumberFormat("fr-CH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)}`;
}

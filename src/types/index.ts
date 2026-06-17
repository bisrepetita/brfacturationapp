// Types de base pour l'application Bis Repetita Facturation

export type InvoiceStatus =
  | "draft"
  | "validated"
  | "sent"
  | "pending"
  | "overdue"
  | "partially_paid"
  | "paid"
  | "cancelled";

export type Currency = "CHF" | "EUR";
export type VatRate = 0 | 2.6 | 8.1;
export type ServiceUnit = "heure" | "seance" | "forfait";
export type DiscountType = "none" | "amount" | "percent";
export type UserRole = "superadmin" | "admin" | "viewer";
export type ClientType = "person" | "company";
export type InvoiceLanguage = "fr" | "en";

export interface User {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

export interface Client {
  id: string;
  type: ClientType;
  firstName: string | null;
  lastName: string | null;
  companyName: string | null;
  displayName: string;
  email: string;
  addressLine1: string;
  addressLine2: string | null;
  postalCode: string;
  city: string;
  country: string;
  clientCode: string;
  nextInvoiceNumber: number;
  createdAt: Date;
  updatedAt: Date;
  archivedAt: Date | null;
}

export interface Service {
  id: string;
  name: string;
  description: string;
  defaultPrice: number;
  unit: ServiceUnit;
  vatApplicable: boolean;
  defaultVatRate: VatRate | null;
  createdAt: Date;
  updatedAt: Date;
  archivedAt: Date | null;
}

export interface InvoiceLine {
  id: string;
  serviceId: string | null;
  description: string;
  quantity: number;
  unit: ServiceUnit;
  unitPrice: number;
  discountType: DiscountType;
  discountValue: number;
  vatApplicable: boolean;
  vatRate: VatRate | null;
  lineTotalExclVat: number;
  lineVatAmount: number;
  lineTotalInclVat: number;
  serviceDate: Date | null;
}

export interface ClientSnapshot {
  displayName: string;
  email: string;
  addressLine1: string;
  addressLine2: string | null;
  postalCode: string;
  city: string;
  country: string;
  clientCode: string;
}

export interface Invoice {
  id: string;
  status: InvoiceStatus;
  clientId: string;
  clientSnapshot: ClientSnapshot;
  invoiceNumber: string | null;
  invoiceSequenceNumber: number | null;
  invoiceDate: Date;
  paymentDelayDays: number;
  dueDate: Date;
  currency: Currency;
  lines: InvoiceLine[];
  discountType: DiscountType;
  discountValue: number;
  subtotalExclVat: number;
  totalVat: number;
  totalInclVat: number;
  amountPaid: number;
  paymentDate: Date | null;
  paymentTermsText: string;
  additionalInfo: string | null;
  qrBillData: object | null;
  pdfStoragePath: string | null;
  pdfDownloadUrl: string | null;
  emailSentAt: Date | null;
  reminderSentAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  validatedAt: Date | null;
  cancelledAt: Date | null;
  createdBy: string;
  updatedBy: string;
}

export interface BillingSettings {
  companyName: string;
  addressLine1: string;
  postalCode: string;
  city: string;
  country: string;
  email: string;
  phone: string | null;
  iban: string;
  qrIban: string | null;
  useQrIban: boolean;
  defaultCurrency: Currency;
  defaultPaymentDelayDays: number;
  defaultPaymentTermsText: string;
  vatEnabled: boolean;
  defaultVatRate: VatRate | null;
  invoiceLanguage: InvoiceLanguage;
  logoUrl: string | null;
}

export interface EmailSettings {
  senderName: string;
  invoiceEmailSubject: string;
  invoiceEmailBody: string;
  reminderEmailSubject: string;
  reminderEmailBody: string;
  sendCopyToSelf: boolean;
  copyEmail: string | null;
}

export interface InvoiceHistory {
  id: string;
  action: string;
  previousStatus: InvoiceStatus | null;
  newStatus: InvoiceStatus | null;
  changedBy: string;
  changedAt: Date;
  details: object | null;
}

// Interface abstraite pour la QR-facture suisse
export interface QrBillResult {
  svg: string;
  payload: string;
}

export interface SwissQrBillGenerator {
  generate(invoice: Invoice, settings: BillingSettings): Promise<QrBillResult>;
}

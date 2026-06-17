import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  query,
  orderBy,
  where,
  runTransaction,
  Timestamp,
} from "firebase/firestore";
import { db } from "./firebase";
import { Invoice, InvoiceStatus, InvoiceLine, ClientSnapshot, DiscountType, Currency } from "@/types";

function toDate(val: unknown): Date {
  if (!val) return new Date();
  if (val instanceof Timestamp) return val.toDate();
  if (val instanceof Date) return val;
  return new Date();
}

function toInvoice(id: string, data: Record<string, unknown>): Invoice {
  return {
    id,
    status: data.status as InvoiceStatus,
    clientId: data.clientId as string,
    clientSnapshot: data.clientSnapshot as ClientSnapshot,
    invoiceNumber: (data.invoiceNumber as string) || null,
    invoiceSequenceNumber: (data.invoiceSequenceNumber as number) || null,
    invoiceDate: toDate(data.invoiceDate),
    paymentDelayDays: (data.paymentDelayDays as number) || 10,
    dueDate: toDate(data.dueDate),
    currency: (data.currency as Currency) || "CHF",
    lines: (data.lines as InvoiceLine[]) || [],
    discountType: (data.discountType as DiscountType) || "none",
    discountValue: (data.discountValue as number) || 0,
    subtotalExclVat: (data.subtotalExclVat as number) || 0,
    totalVat: (data.totalVat as number) || 0,
    totalInclVat: (data.totalInclVat as number) || 0,
    amountPaid: (data.amountPaid as number) || 0,
    paymentDate: data.paymentDate ? toDate(data.paymentDate) : null,
    paymentTermsText: (data.paymentTermsText as string) || "",
    additionalInfo: (data.additionalInfo as string) || null,
    qrBillData: (data.qrBillData as object) || null,
    pdfStoragePath: (data.pdfStoragePath as string) || null,
    pdfDownloadUrl: (data.pdfDownloadUrl as string) || null,
    emailSentAt: data.emailSentAt ? toDate(data.emailSentAt) : null,
    reminderSentAt: data.reminderSentAt ? toDate(data.reminderSentAt) : null,
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
    validatedAt: data.validatedAt ? toDate(data.validatedAt) : null,
    cancelledAt: data.cancelledAt ? toDate(data.cancelledAt) : null,
    createdBy: (data.createdBy as string) || "",
    updatedBy: (data.updatedBy as string) || "",
  };
}

export async function getInvoices(): Promise<Invoice[]> {
  const q = query(collection(db, "invoices"), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => toInvoice(d.id, d.data()));
}

export async function getInvoicesByClient(clientId: string): Promise<Invoice[]> {
  const q = query(collection(db, "invoices"), where("clientId", "==", clientId), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => toInvoice(d.id, d.data()));
}

export async function getInvoice(id: string): Promise<Invoice | null> {
  const snap = await getDoc(doc(db, "invoices", id));
  if (!snap.exists()) return null;
  return toInvoice(snap.id, snap.data());
}

export type CreateInvoiceData = Omit<
  Invoice,
  "id" | "createdAt" | "updatedAt" | "invoiceNumber" | "invoiceSequenceNumber" | "validatedAt" | "cancelledAt" | "pdfStoragePath" | "pdfDownloadUrl" | "emailSentAt" | "reminderSentAt" | "qrBillData" | "createdBy" | "updatedBy"
>;

export async function createDraftInvoice(
  data: CreateInvoiceData,
  userId: string
): Promise<string> {
  const ref = await addDoc(collection(db, "invoices"), {
    ...data,
    invoiceNumber: null,
    invoiceSequenceNumber: null,
    status: "draft",
    amountPaid: 0,
    paymentDate: null,
    qrBillData: null,
    pdfStoragePath: null,
    pdfDownloadUrl: null,
    emailSentAt: null,
    reminderSentAt: null,
    validatedAt: null,
    cancelledAt: null,
    createdBy: userId,
    updatedBy: userId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    // Stocker les dates comme Timestamps Firestore
    invoiceDate: Timestamp.fromDate(data.invoiceDate),
    dueDate: Timestamp.fromDate(data.dueDate),
  });

  // Log historique
  await addDoc(collection(db, "invoices", ref.id, "history"), {
    action: "Création brouillon",
    previousStatus: null,
    newStatus: "draft",
    changedBy: userId,
    changedAt: serverTimestamp(),
    details: null,
  });

  return ref.id;
}

export async function updateDraftInvoice(
  id: string,
  data: Partial<CreateInvoiceData>,
  userId: string
): Promise<void> {
  const updateData: Record<string, unknown> = {
    ...data,
    updatedBy: userId,
    updatedAt: serverTimestamp(),
  };
  if (data.invoiceDate) updateData.invoiceDate = Timestamp.fromDate(data.invoiceDate);
  if (data.dueDate) updateData.dueDate = Timestamp.fromDate(data.dueDate);

  await updateDoc(doc(db, "invoices", id), updateData);
}

export async function deleteDraftInvoice(id: string): Promise<void> {
  // Vérifier que c'est bien un brouillon avant de supprimer
  const snap = await getDoc(doc(db, "invoices", id));
  if (!snap.exists()) throw new Error("Facture introuvable");
  if (snap.data().status !== "draft") throw new Error("Seuls les brouillons peuvent être supprimés.");
  await deleteDoc(doc(db, "invoices", id));
}

/**
 * Validation officielle — transaction atomique
 * Génère le numéro de facture et incrémente nextInvoiceNumber du client
 */
export async function validateInvoice(
  invoiceId: string,
  userId: string
): Promise<string> {
  if (typeof window !== "undefined" && !navigator.onLine) {
    throw new Error("Cette action nécessite une connexion internet afin de garantir la numérotation officielle et la sécurité des données.");
  }

  return await runTransaction(db, async (transaction) => {
    const invoiceRef = doc(db, "invoices", invoiceId);
    const invoiceSnap = await transaction.get(invoiceRef);
    if (!invoiceSnap.exists()) throw new Error("Facture introuvable.");

    const invoiceData = invoiceSnap.data();
    if (invoiceData.status !== "draft") throw new Error("Seuls les brouillons peuvent être validés.");

    const clientRef = doc(db, "clients", invoiceData.clientId);
    const clientSnap = await transaction.get(clientRef);
    if (!clientSnap.exists()) throw new Error("Client introuvable.");

    const clientData = clientSnap.data();
    const nextNum = clientData.nextInvoiceNumber || 201;
    const invoiceNumber = `${clientData.clientCode}-${nextNum}`;

    transaction.update(invoiceRef, {
      status: "validated",
      invoiceNumber,
      invoiceSequenceNumber: nextNum,
      validatedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      updatedBy: userId,
    });

    transaction.update(clientRef, {
      nextInvoiceNumber: nextNum + 1,
      updatedAt: serverTimestamp(),
    });

    return invoiceNumber;
  });
}

export async function markInvoicePaid(
  id: string,
  amountPaid: number,
  paymentDate: Date,
  userId: string
): Promise<void> {
  const total = (await getInvoice(id))?.totalInclVat || 0;
  const newStatus = amountPaid >= total ? "paid" : amountPaid > 0 ? "partially_paid" : "pending";

  await updateDoc(doc(db, "invoices", id), {
    amountPaid,
    paymentDate: Timestamp.fromDate(paymentDate),
    status: newStatus,
    updatedBy: userId,
    updatedAt: serverTimestamp(),
  });

  await addDoc(collection(db, "invoices", id, "history"), {
    action: amountPaid >= total ? "Marqué payé" : "Paiement partiel",
    previousStatus: null,
    newStatus,
    changedBy: userId,
    changedAt: serverTimestamp(),
    details: { amountPaid, paymentDate: Timestamp.fromDate(paymentDate) },
  });
}

export async function cancelInvoice(id: string, userId: string): Promise<void> {
  const snap = await getDoc(doc(db, "invoices", id));
  if (!snap.exists()) throw new Error("Facture introuvable.");
  if (snap.data().status === "draft") throw new Error("Utilisez la suppression pour les brouillons.");

  await updateDoc(doc(db, "invoices", id), {
    status: "cancelled",
    cancelledAt: serverTimestamp(),
    updatedBy: userId,
    updatedAt: serverTimestamp(),
  });
}

export async function duplicateInvoice(id: string, userId: string): Promise<string> {
  const invoice = await getInvoice(id);
  if (!invoice) throw new Error("Facture introuvable.");

  const draftData: CreateInvoiceData = {
    status: "draft",
    clientId: invoice.clientId,
    clientSnapshot: invoice.clientSnapshot,
    invoiceDate: new Date(),
    paymentDelayDays: invoice.paymentDelayDays,
    dueDate: new Date(Date.now() + invoice.paymentDelayDays * 86400000),
    currency: invoice.currency,
    lines: invoice.lines,
    discountType: invoice.discountType,
    discountValue: invoice.discountValue,
    subtotalExclVat: invoice.subtotalExclVat,
    totalVat: invoice.totalVat,
    totalInclVat: invoice.totalInclVat,
    amountPaid: 0,
    paymentDate: null,
    paymentTermsText: invoice.paymentTermsText,
    additionalInfo: invoice.additionalInfo,
  };

  return createDraftInvoice(draftData, userId);
}

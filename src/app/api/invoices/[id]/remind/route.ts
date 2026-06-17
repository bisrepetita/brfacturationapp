import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { doc, getDoc, updateDoc, addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Invoice, BillingSettings, EmailSettings } from "@/types";
import { generateInvoicePdf } from "@/lib/generate-pdf";
import { buildEmailPayload } from "@/lib/email";

const resend = new Resend(process.env.RESEND_API_KEY);

function toDate(val: unknown): Date {
  if (val && typeof val === "object" && "toDate" in val) return (val as { toDate: () => Date }).toDate();
  if (val instanceof Date) return val;
  return new Date();
}

async function getSettings<T>(settingsId: string, defaults: T): Promise<T> {
  const snap = await getDoc(doc(db, "settings", settingsId));
  if (!snap.exists()) return defaults;
  return { ...defaults, ...snap.data() } as T;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const reqBody = await req.json().catch(() => ({}));
    const overrideSubject: string | undefined = reqBody.subject;
    const overrideBody: string | undefined = reqBody.body;

    const invoiceSnap = await getDoc(doc(db, "invoices", id));
    if (!invoiceSnap.exists()) {
      return NextResponse.json({ error: "Facture introuvable." }, { status: 404 });
    }

    const data = invoiceSnap.data();
    const sendableStatuses = ["sent", "pending", "overdue", "partially_paid"];
    if (!sendableStatuses.includes(data.status)) {
      return NextResponse.json({ error: "Impossible de relancer cette facture." }, { status: 400 });
    }

    const invoice = {
      id,
      ...data,
      invoiceDate: toDate(data.invoiceDate),
      dueDate: toDate(data.dueDate),
      createdAt: toDate(data.createdAt),
      updatedAt: toDate(data.updatedAt),
      validatedAt: data.validatedAt ? toDate(data.validatedAt) : null,
      cancelledAt: data.cancelledAt ? toDate(data.cancelledAt) : null,
      paymentDate: data.paymentDate ? toDate(data.paymentDate) : null,
      emailSentAt: data.emailSentAt ? toDate(data.emailSentAt) : null,
      reminderSentAt: data.reminderSentAt ? toDate(data.reminderSentAt) : null,
    } as Invoice;

    const billingDefaults: BillingSettings = {
      companyName: "Bis Repetita", addressLine1: "", postalCode: "", city: "",
      country: "CH", email: "", phone: null, iban: "", qrIban: null, useQrIban: false,
      defaultCurrency: "CHF", defaultPaymentDelayDays: 10, defaultPaymentTermsText: "",
      vatEnabled: false, defaultVatRate: null, invoiceLanguage: "fr", logoUrl: null,
    };
    const emailDefaults: EmailSettings = {
      senderName: "Bis Repetita",
      invoiceEmailSubject: "Facture {numero_facture} — Bis Repetita",
      invoiceEmailBody: "",
      reminderEmailSubject: "Rappel — Facture {numero_facture}",
      reminderEmailBody: "Bonjour {prenom},\n\nSauf erreur de notre part, la facture {numero_facture} d'un montant de {montant} est arrivée à échéance le {date_echeance}.\n\nMerci de procéder au paiement.\n\nBis Repetita",
      sendCopyToSelf: false,
      copyEmail: null,
    };

    const [billingSettings, emailSettings] = await Promise.all([
      getSettings<BillingSettings>("billing", billingDefaults),
      getSettings<EmailSettings>("email", emailDefaults),
    ]);

    const pdfBuffer = await generateInvoicePdf(invoice, billingSettings);
    const { subject: defaultSubject, body: defaultBody, to } = buildEmailPayload(invoice, emailSettings, "reminder");
    const subject = overrideSubject ?? defaultSubject;
    const body = overrideBody ?? defaultBody;

    const filename = `facture-${invoice.invoiceNumber ?? "brouillon"}.pdf`;

    const { error } = await resend.emails.send({
      from: `${emailSettings.senderName || billingSettings.companyName} <contact@bisrepetita.ch>`,
      to,
      subject,
      text: body,
      attachments: [{ filename, content: pdfBuffer }],
    });

    if (error) {
      console.error("Resend error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await updateDoc(doc(db, "invoices", id), {
      reminderSentAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    await addDoc(collection(db, "invoices", id, "history"), {
      action: "Relance envoyée",
      previousStatus: data.status,
      newStatus: data.status,
      changedBy: "system",
      changedAt: serverTimestamp(),
      details: { to: to[0] },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Send reminder error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

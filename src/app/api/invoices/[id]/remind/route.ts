import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { Invoice, BillingSettings, EmailSettings } from "@/types";
import { generateInvoicePdf } from "@/lib/generate-pdf";
import { buildEmailPayload } from "@/lib/email";

const resend = new Resend(process.env.RESEND_API_KEY);

function d(v: unknown): Date {
  if (v instanceof Date) return v;
  if (typeof v === "string" || typeof v === "number") return new Date(v);
  return new Date();
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));

    const raw = body.invoice;
    if (!raw || !body.billingSettings || !body.emailSettings) {
      return NextResponse.json({ error: "Données manquantes." }, { status: 400 });
    }

    const invoice: Invoice = {
      ...raw,
      id: raw.id ?? id,
      invoiceDate: d(raw.invoiceDate),
      dueDate: d(raw.dueDate),
      createdAt: d(raw.createdAt),
      updatedAt: d(raw.updatedAt),
      validatedAt: raw.validatedAt ? d(raw.validatedAt) : null,
      cancelledAt: raw.cancelledAt ? d(raw.cancelledAt) : null,
      paymentDate: raw.paymentDate ? d(raw.paymentDate) : null,
      emailSentAt: raw.emailSentAt ? d(raw.emailSentAt) : null,
      reminderSentAt: raw.reminderSentAt ? d(raw.reminderSentAt) : null,
    };
    const billingSettings: BillingSettings = body.billingSettings;
    const emailSettings: EmailSettings = body.emailSettings;
    const overrideSubject: string | undefined = body.subject;
    const overrideBody: string | undefined = body.body;

    const sendableStatuses = ["sent", "pending", "overdue", "partially_paid"];
    if (!sendableStatuses.includes(invoice.status)) {
      return NextResponse.json({ error: "Impossible de relancer cette facture." }, { status: 400 });
    }

    const pdfBuffer = await generateInvoicePdf(invoice, billingSettings);
    const { subject: defaultSubject, body: defaultBody, to } = buildEmailPayload(invoice, emailSettings, "reminder");

    const { error } = await resend.emails.send({
      from: `${emailSettings.senderName || billingSettings.companyName} <contact@bisrepetita.ch>`,
      to,
      subject: overrideSubject ?? defaultSubject,
      text: overrideBody ?? defaultBody,
      attachments: [{ filename: `facture-${invoice.invoiceNumber ?? "brouillon"}.pdf`, content: pdfBuffer }],
    });

    if (error) {
      console.error("Resend error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Send reminder error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

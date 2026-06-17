import { NextRequest, NextResponse } from "next/server";
import JSZip from "jszip";
import { Invoice, BillingSettings } from "@/types";
import { generateInvoicePdf } from "@/lib/generate-pdf";

function d(v: unknown): Date {
  if (v instanceof Date) return v;
  if (typeof v === "string" || typeof v === "number") return new Date(v);
  return new Date();
}

function fixDates(raw: Invoice): Invoice {
  return {
    ...raw,
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
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const rawInvoices: Invoice[] = body.invoices;
    const billingSettings: BillingSettings = body.billingSettings;

    if (!rawInvoices || rawInvoices.length === 0) {
      return NextResponse.json({ error: "Aucune facture sélectionnée." }, { status: 400 });
    }
    if (!billingSettings) {
      return NextResponse.json({ error: "Paramètres manquants." }, { status: 400 });
    }

    const zip = new JSZip();

    await Promise.all(
      rawInvoices.map(async (raw) => {
        const invoice = fixDates(raw);
        const pdfBuffer = await generateInvoicePdf(invoice, billingSettings);
        const filename = invoice.invoiceNumber
          ? `facture-${invoice.invoiceNumber}.pdf`
          : `brouillon-${invoice.id.slice(0, 6)}.pdf`;
        zip.file(filename, pdfBuffer);
      })
    );

    const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });
    const date = new Date().toISOString().split("T")[0];

    return new NextResponse(new Uint8Array(zipBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="factures-${date}.zip"`,
        "Content-Length": String(zipBuffer.length),
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Bulk PDF error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

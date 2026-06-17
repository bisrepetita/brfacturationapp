import { NextRequest, NextResponse } from "next/server";
import JSZip from "jszip";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Invoice, BillingSettings } from "@/types";
import { generateInvoicePdf } from "@/lib/generate-pdf";

function toDate(val: unknown): Date {
  if (val && typeof val === "object" && "toDate" in val) return (val as { toDate: () => Date }).toDate();
  if (val instanceof Date) return val;
  return new Date();
}

const BILLING_DEFAULTS: BillingSettings = {
  companyName: "Bis Repetita", addressLine1: "", postalCode: "", city: "",
  country: "CH", email: "", phone: null, iban: "", qrIban: null, useQrIban: false,
  defaultCurrency: "CHF", defaultPaymentDelayDays: 10, defaultPaymentTermsText: "",
  vatEnabled: false, defaultVatRate: null, invoiceLanguage: "fr", logoUrl: null,
};

export async function POST(req: NextRequest) {
  try {
    const { ids }: { ids: string[] } = await req.json();

    if (!ids || ids.length === 0) {
      return NextResponse.json({ error: "Aucune facture sélectionnée." }, { status: 400 });
    }

    const settingsSnap = await getDoc(doc(db, "settings", "billing"));
    const billingSettings: BillingSettings = settingsSnap.exists()
      ? { ...BILLING_DEFAULTS, ...settingsSnap.data() }
      : BILLING_DEFAULTS;

    const zip = new JSZip();

    await Promise.all(
      ids.map(async (id) => {
        const snap = await getDoc(doc(db, "invoices", id));
        if (!snap.exists()) return;

        const data = snap.data();
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

        const pdfBuffer = await generateInvoicePdf(invoice, billingSettings);
        const filename = invoice.invoiceNumber
          ? `facture-${invoice.invoiceNumber}.pdf`
          : `brouillon-${id.slice(0, 6)}.pdf`;

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

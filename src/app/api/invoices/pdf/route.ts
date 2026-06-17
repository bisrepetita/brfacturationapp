import { NextRequest, NextResponse } from "next/server";
import { Invoice, BillingSettings } from "@/types";
import { generateInvoicePdf } from "@/lib/generate-pdf";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const invoice: Invoice = body.invoice;
    const settings: BillingSettings = body.settings;

    const pdfBuffer = await generateInvoicePdf(invoice, settings);

    const filename = invoice.invoiceNumber
      ? `facture-${invoice.invoiceNumber}.pdf`
      : "brouillon.pdf";

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": String(pdfBuffer.length),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("PDF generation error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

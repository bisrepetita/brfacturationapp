import path from "path";
import PDFDocument from "pdfkit";
import { SwissQRBill } from "swissqrbill/pdf";
import type { Data } from "swissqrbill/types";
import { Invoice, BillingSettings } from "@/types";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const BLACK = "#1A1A18";
const GRAY = "#7A7570";
const LIGHT = "#A09890";
const BORDER = "#E5E1DA";
const BG = "#F9F8F6";

function fmtAmount(n: number): string {
  return new Intl.NumberFormat("fr-CH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

function fmtDate(d: string | Date): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return format(date, "dd.MM.yyyy", { locale: fr });
}

export async function generateInvoicePdf(
  invoice: Invoice,
  settings: BillingSettings
): Promise<Buffer> {
  const margin = 56;
  const pageWidth = 595.28;
  const contentWidth = pageWidth - margin * 2;
  const hasVat = invoice.totalVat > 0;

  const doc = new PDFDocument({
    size: "A4",
    margin: 0,
    info: {
      Title: invoice.invoiceNumber || "Brouillon",
      Author: settings.companyName,
      Creator: "Bis Repetita Facturation",
    },
  });

  const chunks: Buffer[] = [];
  doc.on("data", (chunk: Buffer) => chunks.push(chunk));

  await new Promise<void>((resolve, reject) => {
    doc.on("end", resolve);
    doc.on("error", reject);

    // ─── EN-TÊTE ──────────────────────────────────────────────────────
    const logoPath = path.join(process.cwd(), "asset", "Icone Gauche & BR noir.png");
    doc.image(logoPath, margin, margin, { height: 13 });

    const invoiceLabel = invoice.invoiceNumber || "Brouillon";
    doc
      .font("Helvetica")
      .fontSize(8)
      .fillColor(LIGHT)
      .text("FACTURE", margin, margin, { width: contentWidth, align: "right" });

    doc
      .font("Helvetica-Bold")
      .fontSize(18)
      .fillColor(BLACK)
      .text(invoiceLabel, margin, margin + 12, { width: contentWidth, align: "right" });

    doc
      .font("Helvetica")
      .fontSize(8)
      .fillColor(GRAY)
      .text(`Date : ${fmtDate(invoice.invoiceDate)}`, margin, margin + 38, {
        width: contentWidth,
        align: "right",
      })
      .text(`Échéance : ${fmtDate(invoice.dueDate)}`, margin, margin + 50, {
        width: contentWidth,
        align: "right",
      });

    // ─── SÉPARATEUR ───────────────────────────────────────────────────
    const dividerY = margin + 68;
    doc
      .moveTo(margin, dividerY)
      .lineTo(pageWidth - margin, dividerY)
      .strokeColor(BORDER)
      .lineWidth(0.5)
      .stroke();

    // ─── ADRESSES ─────────────────────────────────────────────────────
    const addrY = dividerY + 16;
    const colW = contentWidth / 2;

    doc.font("Helvetica").fontSize(7).fillColor(LIGHT).text("ÉMETTEUR", margin, addrY);
    doc.font("Helvetica-Bold").fontSize(10).fillColor(BLACK).text(settings.companyName, margin, addrY + 10);
    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor(GRAY)
      .text(settings.addressLine1, margin, addrY + 23)
      .text(`${settings.postalCode} ${settings.city}`, margin, addrY + 35);

    const clientX = margin + colW;
    doc.font("Helvetica").fontSize(7).fillColor(LIGHT).text("FACTURÉ À", clientX, addrY);
    doc
      .font("Helvetica-Bold")
      .fontSize(10)
      .fillColor(BLACK)
      .text(invoice.clientSnapshot.displayName, clientX, addrY + 10);

    let clientLineY = addrY + 23;
    if (invoice.clientSnapshot.addressLine1) {
      doc.font("Helvetica").fontSize(9).fillColor(GRAY).text(invoice.clientSnapshot.addressLine1, clientX, clientLineY);
      clientLineY += 12;
    }
    if (invoice.clientSnapshot.postalCode) {
      doc
        .font("Helvetica")
        .fontSize(9)
        .fillColor(GRAY)
        .text(`${invoice.clientSnapshot.postalCode} ${invoice.clientSnapshot.city}`, clientX, clientLineY);
    }

    // ─── TABLEAU ──────────────────────────────────────────────────────
    const tableY = addrY + 70;

    const colDesc = { x: margin, w: hasVat ? contentWidth * 0.42 : contentWidth * 0.48 };
    const colQty = { x: colDesc.x + colDesc.w, w: 36 };
    const colPrice = { x: colQty.x + colQty.w, w: 60 };
    const colVat = hasVat ? { x: colPrice.x + colPrice.w, w: 40 } : null;
    const colTotal = { x: colVat ? colVat.x + colVat.w : colPrice.x + colPrice.w, w: 0 };
    const rightEdge = margin + contentWidth;

    const tableHeaderH = 20;
    doc.rect(margin, tableY, contentWidth, tableHeaderH).fill(BG);

    doc.font("Helvetica-Bold").fontSize(7).fillColor(LIGHT);

    const headerCells = [
      { text: "DESCRIPTION", x: colDesc.x + 6, align: "left" as const },
      { text: "QTÉ", x: colQty.x, align: "right" as const },
      { text: "P.U.", x: colPrice.x, align: "right" as const },
      ...(colVat ? [{ text: "TVA", x: colVat.x, align: "right" as const }] : []),
      { text: "TOTAL", x: colTotal.x, align: "right" as const },
    ];

    for (const cell of headerCells) {
      if (cell.align === "right") {
        doc.text(cell.text, cell.x, tableY + 6, {
          width: cell.x === colTotal.x ? rightEdge - cell.x : 60,
          align: "right",
        });
      } else {
        doc.text(cell.text, cell.x, tableY + 6);
      }
    }

    let rowY = tableY + tableHeaderH;
    const rowH = 26;

    for (const line of invoice.lines) {
      doc.moveTo(margin, rowY).lineTo(rightEdge, rowY).strokeColor(BORDER).lineWidth(0.5).stroke();

      const textY = rowY + 6;

      doc.font("Helvetica").fontSize(9).fillColor(BLACK).text(line.description, colDesc.x + 6, textY, {
        width: colDesc.w - 12,
        ellipsis: true,
        lineBreak: false,
      });
      doc.font("Helvetica").fontSize(7.5).fillColor(LIGHT).text(line.unit, colDesc.x + 6, textY + 11);
      doc.font("Helvetica").fontSize(9).fillColor(BLACK).text(String(line.quantity), colQty.x, textY, {
        width: colQty.w,
        align: "right",
      });
      doc.font("Helvetica").fontSize(9).fillColor(BLACK).text(fmtAmount(line.unitPrice), colPrice.x, textY, {
        width: colPrice.w,
        align: "right",
      });

      if (colVat) {
        doc.font("Helvetica").fontSize(9).fillColor(BLACK).text(
          line.vatApplicable && line.vatRate ? `${line.vatRate}%` : "—",
          colVat.x,
          textY,
          { width: colVat.w, align: "right" }
        );
      }

      doc.font("Helvetica").fontSize(9).fillColor(BLACK).text(fmtAmount(line.lineTotalInclVat), colTotal.x, textY, {
        width: rightEdge - colTotal.x,
        align: "right",
      });

      rowY += rowH;
    }

    doc.moveTo(margin, rowY).lineTo(rightEdge, rowY).strokeColor(BORDER).lineWidth(0.5).stroke();

    // ─── TOTAUX ───────────────────────────────────────────────────────
    const totalsX = rightEdge - 200;
    const totalsW = 200;
    let totalsY = rowY + 16;

    if (hasVat) {
      doc
        .font("Helvetica")
        .fontSize(8.5)
        .fillColor(GRAY)
        .text("Sous-total HT", totalsX, totalsY)
        .text(`${invoice.currency} ${fmtAmount(invoice.subtotalExclVat)}`, totalsX, totalsY, {
          width: totalsW,
          align: "right",
        });

      totalsY += 14;

      doc
        .text("TVA", totalsX, totalsY)
        .text(`${invoice.currency} ${fmtAmount(invoice.totalVat)}`, totalsX, totalsY, {
          width: totalsW,
          align: "right",
        });

      totalsY += 10;

      doc.moveTo(totalsX, totalsY).lineTo(rightEdge, totalsY).strokeColor(BORDER).lineWidth(0.5).stroke();
      totalsY += 8;
    }

    doc
      .font("Helvetica-Bold")
      .fontSize(11)
      .fillColor(BLACK)
      .text("Total TTC", totalsX, totalsY)
      .text(`${invoice.currency} ${fmtAmount(invoice.totalInclVat)}`, totalsX, totalsY, {
        width: totalsW,
        align: "right",
      });

    // ─── CONDITIONS ────────────────────────────────────────────────────
    totalsY += 30;
    doc.font("Helvetica").fontSize(8).fillColor(GRAY).text(invoice.paymentTermsText, margin, totalsY, {
      width: contentWidth,
    });

    if (invoice.additionalInfo) {
      doc.text(invoice.additionalInfo, margin, totalsY + 14, { width: contentWidth });
    }

    // ─── QR-FACTURE SUISSE ────────────────────────────────────────────
    const iban = (
      settings.useQrIban && settings.qrIban ? settings.qrIban : settings.iban || ""
    ).replace(/\s/g, "");

    if (!iban) {
      throw new Error("IBAN manquant dans les paramètres.");
    }

    const qrData: Data = {
      currency: invoice.currency as "CHF" | "EUR",
      amount: invoice.totalInclVat,
      creditor: {
        name: settings.companyName,
        address: settings.addressLine1,
        zip: settings.postalCode,
        city: settings.city,
        country: settings.country || "CH",
        account: iban,
      },
      ...(invoice.clientSnapshot.displayName
        ? {
            debtor: {
              name: invoice.clientSnapshot.displayName,
              address: invoice.clientSnapshot.addressLine1 || "",
              zip: invoice.clientSnapshot.postalCode || "",
              city: invoice.clientSnapshot.city || "",
              country: invoice.clientSnapshot.country || "CH",
            },
          }
        : {}),
      ...(invoice.invoiceNumber
        ? { additionalInformation: `Facture ${invoice.invoiceNumber}` }
        : {}),
    };

    const qrBill = new SwissQRBill(qrData, { language: "FR" });
    doc.fillColor("#000000");
    qrBill.attachTo(doc);

    doc.end();
  });

  return Buffer.concat(chunks);
}

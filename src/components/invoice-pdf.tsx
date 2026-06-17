import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
} from "@react-pdf/renderer";
import { Invoice, BillingSettings } from "@/types";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

// Couleurs
const C = {
  black: "#1A1A18",
  gray: "#7A7570",
  light: "#A09890",
  border: "#E5E1DA",
  bg: "#F9F8F6",
};

const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 9,
    color: C.black,
    paddingTop: 40,
    paddingBottom: 130, // Espace pour le slip QR (105mm)
    paddingHorizontal: 40,
    backgroundColor: "#FFFFFF",
  },

  // ── En-tête ──────────────────────────────────────────────────
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 30,
  },
  companyName: {
    fontSize: 16,
    fontFamily: "Helvetica-Bold",
    color: C.black,
    marginBottom: 4,
  },
  companyDetail: {
    fontSize: 8,
    color: C.gray,
    lineHeight: 1.5,
  },
  invoiceMeta: {
    alignItems: "flex-end",
  },
  invoiceLabel: {
    fontSize: 8,
    color: C.light,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 2,
  },
  invoiceNumber: {
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
    color: C.black,
  },
  invoiceDate: {
    fontSize: 8,
    color: C.gray,
    marginTop: 4,
  },

  // ── Divider ──────────────────────────────────────────────────
  divider: {
    borderBottom: "1 solid #E5E1DA",
    marginVertical: 16,
  },

  // ── Adresses ─────────────────────────────────────────────────
  addresses: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  addressBlock: {
    flex: 1,
  },
  addressLabel: {
    fontSize: 7,
    color: C.light,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 4,
  },
  addressName: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: C.black,
    marginBottom: 2,
  },
  addressLine: {
    fontSize: 9,
    color: C.gray,
    lineHeight: 1.5,
  },

  // ── Tableau prestations ────────────────────────────────────────
  tableHeader: {
    flexDirection: "row",
    backgroundColor: C.bg,
    padding: "6 8",
    marginBottom: 0,
  },
  tableHeaderCell: {
    fontSize: 7,
    color: C.light,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    fontFamily: "Helvetica-Bold",
  },
  tableRow: {
    flexDirection: "row",
    borderBottom: "1 solid #E5E1DA",
    padding: "8 8",
    alignItems: "flex-start",
  },
  colDesc: { flex: 1 },
  colQty: { width: 40, textAlign: "right" },
  colPrice: { width: 55, textAlign: "right" },
  colVat: { width: 40, textAlign: "right" },
  colTotal: { width: 65, textAlign: "right" },
  descMain: {
    fontSize: 9,
    color: C.black,
    marginBottom: 1,
  },
  descSub: {
    fontSize: 7.5,
    color: C.light,
  },
  cellText: {
    fontSize: 9,
    color: C.black,
  },
  cellMono: {
    fontSize: 9,
    fontFamily: "Helvetica",
    color: C.black,
  },

  // ── Totaux ────────────────────────────────────────────────────
  totalsSection: {
    alignItems: "flex-end",
    marginTop: 16,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: 200,
    marginBottom: 4,
  },
  totalLabel: {
    fontSize: 8.5,
    color: C.gray,
  },
  totalValue: {
    fontSize: 8.5,
    color: C.black,
    fontFamily: "Helvetica",
  },
  totalDivider: {
    width: 200,
    borderBottom: "1 solid #E5E1DA",
    marginBottom: 6,
    marginTop: 2,
  },
  totalFinalLabel: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: C.black,
  },
  totalFinalValue: {
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
    color: C.black,
  },

  // ── Conditions ────────────────────────────────────────────────
  conditions: {
    marginTop: 20,
    fontSize: 8,
    color: C.gray,
    lineHeight: 1.5,
  },

  // ── QR Slip (105mm = ~297pts en points PDF) ──
  // A4 = 595.28 x 841.89 pts
  qrSlip: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 297, // ~105mm en points
    borderTop: "1 solid #000000",
    flexDirection: "row",
  },
  // Section gauche : Récépissé (42mm = 119pts)
  receipt: {
    width: 119,
    borderRight: "1 solid #000000",
    padding: "12 8",
    flexDirection: "column",
    justifyContent: "space-between",
  },
  receiptTitle: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    marginBottom: 8,
  },
  receiptLabel: {
    fontSize: 6,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    marginBottom: 2,
    marginTop: 6,
  },
  receiptValue: {
    fontSize: 8,
    lineHeight: 1.4,
  },
  receiptAmountBox: {
    flexDirection: "column",
  },
  receiptCurrencyAmount: {
    flexDirection: "row",
    alignItems: "baseline",
    marginTop: 4,
  },
  acceptanceSection: {
    borderTop: "0.5 solid #000000",
    paddingTop: 6,
    marginTop: 8,
  },
  acceptanceText: {
    fontSize: 6,
    color: C.gray,
  },

  // Section droite : Paiement
  payment: {
    flex: 1,
    padding: "12 16",
    flexDirection: "column",
  },
  paymentTitle: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    marginBottom: 10,
  },
  paymentTop: {
    flexDirection: "row",
    marginBottom: 10,
  },
  qrCodeImage: {
    width: 130, // 46mm ≈ 130pts
    height: 130,
    marginRight: 16,
  },
  paymentRight: {
    flex: 1,
  },
  paymentLabel: {
    fontSize: 6,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    marginBottom: 2,
    marginTop: 6,
  },
  paymentValue: {
    fontSize: 9,
    lineHeight: 1.4,
  },
  paymentCurrencyAmount: {
    flexDirection: "row",
    alignItems: "baseline",
    marginTop: 4,
  },
  paymentCurrency: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
  },
  paymentAmount: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
  },
  paymentBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginTop: 8,
  },
  cornerMark: {
    width: 30,
    height: 30,
    borderRight: "1 solid #000000",
    borderBottom: "1 solid #000000",
  },
});

function fmtAmount(n: number): string {
  return new Intl.NumberFormat("fr-CH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

function fmtDate(d: Date): string {
  return format(d, "dd.MM.yyyy", { locale: fr });
}

interface InvoicePDFProps {
  invoice: Invoice;
  settings: BillingSettings;
  qrCodeBase64: string;
}

export function InvoicePDF({ invoice, settings, qrCodeBase64 }: InvoicePDFProps) {
  const hasVat = invoice.totalVat > 0;

  const ibanFormatted = (settings.useQrIban && settings.qrIban
    ? settings.qrIban
    : settings.iban
  ).replace(/\s/g, "").replace(/(.{4})/g, "$1 ").trim();

  return (
    <Document
      title={invoice.invoiceNumber || "Brouillon"}
      author={settings.companyName}
      creator="Bis Repetita Facturation"
    >
      <Page size="A4" style={styles.page}>

        {/* ── En-tête ────────────────────────────────────────────── */}
        <View style={styles.header}>
          <View>
            <Text style={styles.companyName}>{settings.companyName}</Text>
            <Text style={styles.companyDetail}>{settings.addressLine1}</Text>
            <Text style={styles.companyDetail}>{settings.postalCode} {settings.city}</Text>
            {settings.email && <Text style={styles.companyDetail}>{settings.email}</Text>}
          </View>
          <View style={styles.invoiceMeta}>
            <Text style={styles.invoiceLabel}>Facture</Text>
            <Text style={styles.invoiceNumber}>
              {invoice.invoiceNumber || "Brouillon"}
            </Text>
            <Text style={styles.invoiceDate}>
              Date : {fmtDate(invoice.invoiceDate)}
            </Text>
            <Text style={styles.invoiceDate}>
              Échéance : {fmtDate(invoice.dueDate)}
            </Text>
          </View>
        </View>

        <View style={styles.divider} />

        {/* ── Adresses ──────────────────────────────────────────── */}
        <View style={styles.addresses}>
          <View style={styles.addressBlock}>
            <Text style={styles.addressLabel}>Émetteur</Text>
            <Text style={styles.addressName}>{settings.companyName}</Text>
            <Text style={styles.addressLine}>{settings.addressLine1}</Text>
            <Text style={styles.addressLine}>{settings.postalCode} {settings.city}</Text>
          </View>
          <View style={styles.addressBlock}>
            <Text style={styles.addressLabel}>Facturé à</Text>
            <Text style={styles.addressName}>{invoice.clientSnapshot.displayName}</Text>
            {invoice.clientSnapshot.addressLine1 && (
              <Text style={styles.addressLine}>{invoice.clientSnapshot.addressLine1}</Text>
            )}
            {invoice.clientSnapshot.postalCode && (
              <Text style={styles.addressLine}>
                {invoice.clientSnapshot.postalCode} {invoice.clientSnapshot.city}
              </Text>
            )}
            <Text style={styles.addressLine}>{invoice.clientSnapshot.email}</Text>
          </View>
        </View>

        {/* ── Tableau des prestations ───────────────────────────── */}
        <View style={styles.tableHeader}>
          <View style={styles.colDesc}><Text style={styles.tableHeaderCell}>Description</Text></View>
          <View style={styles.colQty}><Text style={styles.tableHeaderCell}>Qté</Text></View>
          <View style={styles.colPrice}><Text style={styles.tableHeaderCell}>P.U.</Text></View>
          {hasVat && <View style={styles.colVat}><Text style={styles.tableHeaderCell}>TVA</Text></View>}
          <View style={styles.colTotal}><Text style={styles.tableHeaderCell}>Total</Text></View>
        </View>

        {invoice.lines.map((line) => (
          <View key={line.id} style={styles.tableRow}>
            <View style={styles.colDesc}>
              <Text style={styles.descMain}>{line.description}</Text>
              <Text style={styles.descSub}>{line.quantity} {line.unit}</Text>
            </View>
            <View style={styles.colQty}>
              <Text style={styles.cellText}>{line.quantity}</Text>
            </View>
            <View style={styles.colPrice}>
              <Text style={styles.cellMono}>{fmtAmount(line.unitPrice)}</Text>
            </View>
            {hasVat && (
              <View style={styles.colVat}>
                <Text style={styles.cellText}>
                  {line.vatApplicable && line.vatRate ? `${line.vatRate}%` : "—"}
                </Text>
              </View>
            )}
            <View style={styles.colTotal}>
              <Text style={styles.cellMono}>{fmtAmount(line.lineTotalInclVat)}</Text>
            </View>
          </View>
        ))}

        {/* ── Totaux ─────────────────────────────────────────────── */}
        <View style={styles.totalsSection}>
          {hasVat && (
            <>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Sous-total HT</Text>
                <Text style={styles.totalValue}>{invoice.currency} {fmtAmount(invoice.subtotalExclVat)}</Text>
              </View>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>TVA</Text>
                <Text style={styles.totalValue}>{invoice.currency} {fmtAmount(invoice.totalVat)}</Text>
              </View>
            </>
          )}
          <View style={styles.totalDivider} />
          <View style={styles.totalRow}>
            <Text style={styles.totalFinalLabel}>Total TTC</Text>
            <Text style={styles.totalFinalValue}>{invoice.currency} {fmtAmount(invoice.totalInclVat)}</Text>
          </View>
        </View>

        {/* ── Conditions ─────────────────────────────────────────── */}
        <Text style={styles.conditions}>{invoice.paymentTermsText}</Text>
        {invoice.additionalInfo && (
          <Text style={[styles.conditions, { marginTop: 6 }]}>{invoice.additionalInfo}</Text>
        )}

        {/* ── QR-Facture Suisse ───────────────────────────────────── */}
        <View style={styles.qrSlip}>

          {/* Récépissé (gauche) */}
          <View style={styles.receipt}>
            <View>
              <Text style={styles.receiptTitle}>Récépissé</Text>

              <Text style={styles.receiptLabel}>Compte / Payable à</Text>
              <Text style={styles.receiptValue}>{ibanFormatted}</Text>
              <Text style={styles.receiptValue}>{settings.companyName}</Text>
              <Text style={styles.receiptValue}>{settings.addressLine1}</Text>
              <Text style={styles.receiptValue}>{settings.postalCode} {settings.city}</Text>

              <Text style={styles.receiptLabel}>Payable par</Text>
              <Text style={styles.receiptValue}>{invoice.clientSnapshot.displayName}</Text>
              {invoice.clientSnapshot.addressLine1 && (
                <Text style={styles.receiptValue}>{invoice.clientSnapshot.addressLine1}</Text>
              )}
              {invoice.clientSnapshot.postalCode && (
                <Text style={styles.receiptValue}>{invoice.clientSnapshot.postalCode} {invoice.clientSnapshot.city}</Text>
              )}

              <View style={styles.receiptCurrencyAmount}>
                <Text style={{ fontSize: 8, fontFamily: "Helvetica-Bold", marginRight: 4 }}>{invoice.currency}</Text>
                <Text style={{ fontSize: 11, fontFamily: "Helvetica-Bold" }}>{fmtAmount(invoice.totalInclVat)}</Text>
              </View>
            </View>

            <View style={styles.acceptanceSection}>
              <Text style={styles.acceptanceText}>Point de dépôt</Text>
              <View style={{ width: 50, height: 20, borderBottom: "0.5 solid #000000", marginTop: 24 }} />
            </View>
          </View>

          {/* Section paiement (droite) */}
          <View style={styles.payment}>
            <Text style={styles.paymentTitle}>Section paiement</Text>

            <View style={styles.paymentTop}>
              {/* QR Code */}
              <Image src={qrCodeBase64} style={styles.qrCodeImage} />

              {/* Infos droite */}
              <View style={styles.paymentRight}>
                <Text style={styles.paymentLabel}>Compte / Payable à</Text>
                <Text style={styles.paymentValue}>{ibanFormatted}</Text>
                <Text style={styles.paymentValue}>{settings.companyName}</Text>
                <Text style={styles.paymentValue}>{settings.addressLine1}</Text>
                <Text style={styles.paymentValue}>{settings.postalCode} {settings.city}</Text>

                <Text style={styles.paymentLabel}>Payable par</Text>
                <Text style={styles.paymentValue}>{invoice.clientSnapshot.displayName}</Text>
                {invoice.clientSnapshot.addressLine1 && (
                  <Text style={styles.paymentValue}>{invoice.clientSnapshot.addressLine1}</Text>
                )}
                {invoice.clientSnapshot.postalCode && (
                  <Text style={styles.paymentValue}>{invoice.clientSnapshot.postalCode} {invoice.clientSnapshot.city}</Text>
                )}
              </View>
            </View>

            <View style={styles.paymentBottom}>
              <View>
                <Text style={styles.paymentLabel}>Monnaie</Text>
                <Text style={[styles.paymentValue, { fontFamily: "Helvetica-Bold" }]}>{invoice.currency}</Text>
              </View>
              <View>
                <Text style={styles.paymentLabel}>Montant</Text>
                <Text style={[styles.paymentValue, { fontSize: 14, fontFamily: "Helvetica-Bold" }]}>
                  {fmtAmount(invoice.totalInclVat)}
                </Text>
              </View>
              <View style={styles.cornerMark} />
            </View>
          </View>
        </View>

      </Page>
    </Document>
  );
}

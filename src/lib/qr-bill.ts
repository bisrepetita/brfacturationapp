import QRCode from "qrcode";
import { Invoice, BillingSettings } from "@/types";

/**
 * Génère le payload texte SPC (Swiss Payments Code)
 * Conforme Swiss Payment Standards 2.0
 */
export function buildSwissQrPayload(
  invoice: Invoice,
  settings: BillingSettings
): string {
  const iban = (settings.useQrIban && settings.qrIban
    ? settings.qrIban
    : settings.iban
  ).replace(/\s/g, "");

  const amount = invoice.totalInclVat.toFixed(2);
  const currency = invoice.currency;

  const creditorName = settings.companyName;
  const creditorStreet = settings.addressLine1;
  const creditorPostalCity = `${settings.postalCode} ${settings.city}`;
  const creditorCountry = settings.country || "CH";

  const debtor = invoice.clientSnapshot;
  const debtorName = debtor.displayName;
  const debtorStreet = debtor.addressLine1 || "";
  const debtorPostalCity = debtor.postalCode && debtor.city
    ? `${debtor.postalCode} ${debtor.city}`
    : "";
  const debtorCountry = debtor.country || "CH";

  const additionalInfo = invoice.invoiceNumber
    ? `Facture ${invoice.invoiceNumber}`
    : "";

  // Format SPC — séparateur CRLF obligatoire selon la norme
  const lines = [
    "SPC",           // Swiss Payments Code
    "0200",          // Version
    "1",             // Coding type UTF-8
    iban,            // IBAN/QR-IBAN
    "K",             // Address type: K = combined
    creditorName,    // Créancier nom
    creditorStreet,  // Créancier adresse ligne 1
    creditorPostalCity, // Créancier NPA + ville
    "",              // Créancier adresse ligne 3 (vide pour K)
    "",              // Créancier adresse ligne 4 (vide pour K)
    creditorCountry, // Créancier pays
    "",              // Débiteur type (vide = S par défaut)
    debtorName,      // Débiteur nom
    debtorStreet,    // Débiteur adresse ligne 1
    debtorPostalCity,// Débiteur NPA + ville
    "",              // Débiteur adresse ligne 3
    "",              // Débiteur adresse ligne 4
    debtorCountry,   // Débiteur pays
    amount,          // Montant
    currency,        // Devise CHF ou EUR
    "NON",           // Type référence: NON = sans référence
    "",              // Référence (vide pour NON)
    additionalInfo,  // Information supplémentaire
    "EPD",           // End Payment Data
  ];

  return lines.join("\r\n");
}

/**
 * Génère le QR code suisse en base64 PNG
 */
export async function generateSwissQrCodeBase64(
  payload: string
): Promise<string> {
  return await QRCode.toDataURL(payload, {
    errorCorrectionLevel: "M",
    width: 300,
    margin: 0,
    color: { dark: "#000000", light: "#FFFFFF" },
  });
}

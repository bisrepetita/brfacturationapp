import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";
import { BillingSettings, EmailSettings } from "@/types";

const DEFAULT_BILLING: BillingSettings = {
  companyName: "Bis Repetita",
  addressLine1: "",
  postalCode: "",
  city: "",
  country: "CH",
  email: "",
  phone: null,
  iban: "",
  qrIban: null,
  useQrIban: false,
  defaultCurrency: "CHF",
  defaultPaymentDelayDays: 10,
  defaultPaymentTermsText: "Payable dans les 10 jours",
  vatEnabled: false,
  defaultVatRate: null,
  invoiceLanguage: "fr",
  logoUrl: null,
};

const DEFAULT_EMAIL: EmailSettings = {
  senderName: "Bis Repetita",
  invoiceEmailSubject: "Facture {numero_facture} — Bis Repetita",
  invoiceEmailBody: `Bonjour {prenom},\n\nVous trouverez ci-joint votre facture {numero_facture} d'un montant de {montant}.\n\nElle est payable jusqu'au {date_echeance}.\n\nMerci beaucoup,\nBis Repetita`,
  reminderEmailSubject: "Rappel — Facture {numero_facture}",
  reminderEmailBody: `Bonjour {prenom},\n\nSauf erreur de notre part, la facture {numero_facture} d'un montant de {montant} est arrivée à échéance le {date_echeance}.\n\nMerci de procéder au paiement dès que possible.\n\nBis Repetita`,
  sendCopyToSelf: false,
  copyEmail: null,
};

export async function getBillingSettings(): Promise<BillingSettings> {
  const snap = await getDoc(doc(db, "settings", "billing"));
  if (!snap.exists()) return DEFAULT_BILLING;
  return { ...DEFAULT_BILLING, ...snap.data() } as BillingSettings;
}

export async function saveBillingSettings(data: BillingSettings): Promise<void> {
  await setDoc(doc(db, "settings", "billing"), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function getEmailSettings(): Promise<EmailSettings> {
  const snap = await getDoc(doc(db, "settings", "email"));
  if (!snap.exists()) return DEFAULT_EMAIL;
  return { ...DEFAULT_EMAIL, ...snap.data() } as EmailSettings;
}

export async function saveEmailSettings(data: EmailSettings): Promise<void> {
  await setDoc(doc(db, "settings", "email"), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

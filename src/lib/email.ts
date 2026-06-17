import { Invoice, EmailSettings } from "@/types";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

function fmtAmount(n: number, currency: string): string {
  return `${currency} ${new Intl.NumberFormat("fr-CH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n)}`;
}

export function interpolateTemplate(template: string, invoice: Invoice): string {
  const firstName = invoice.clientSnapshot.displayName.split(" ")[0] ?? invoice.clientSnapshot.displayName;
  const vars: Record<string, string> = {
    prenom: firstName,
    nom: invoice.clientSnapshot.displayName,
    client: invoice.clientSnapshot.displayName,
    numero_facture: invoice.invoiceNumber ?? "—",
    montant: fmtAmount(invoice.totalInclVat, invoice.currency),
    date_echeance: format(invoice.dueDate, "dd MMMM yyyy", { locale: fr }),
  };

  return template.replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? `{${key}}`);
}

export function buildEmailPayload(
  invoice: Invoice,
  emailSettings: EmailSettings,
  type: "invoice" | "reminder"
) {
  const subjectTemplate =
    type === "invoice"
      ? emailSettings.invoiceEmailSubject
      : emailSettings.reminderEmailSubject;
  const bodyTemplate =
    type === "invoice"
      ? emailSettings.invoiceEmailBody
      : emailSettings.reminderEmailBody;

  const subject = interpolateTemplate(subjectTemplate, invoice);
  const body = interpolateTemplate(bodyTemplate, invoice);

  const to = [invoice.clientSnapshot.email];
  if (emailSettings.sendCopyToSelf && emailSettings.copyEmail) {
    to.push(emailSettings.copyEmail);
  }

  return { subject, body, to };
}

import { format } from "date-fns";
import { Invoice, Client } from "@/types";

const STATUS_LABELS: Record<string, string> = {
  draft: "Brouillon",
  validated: "Validée",
  sent: "Envoyée",
  pending: "En attente",
  overdue: "En retard",
  partially_paid: "Partiellement payée",
  paid: "Payée",
  cancelled: "Annulée",
};

type CellValue = string | number | null | undefined;

function esc(v: CellValue): string {
  if (v == null) return "";
  const s = String(v);
  if (s.includes(";") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function downloadCSV(rows: CellValue[][], filename: string) {
  const csv = rows.map((r) => r.map(esc).join(";")).join("\r\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportInvoicesCSV(invoices: Invoice[], filename?: string) {
  const headers = [
    "Numéro", "Date", "Échéance", "Client", "Statut", "Devise",
    "Montant HT", "TVA", "Montant TTC", "Montant payé", "Reste dû",
  ];

  const rows: CellValue[][] = invoices.map((inv) => [
    inv.invoiceNumber || "Brouillon",
    format(inv.invoiceDate, "dd.MM.yyyy"),
    format(inv.dueDate, "dd.MM.yyyy"),
    inv.clientSnapshot.displayName,
    STATUS_LABELS[inv.status] || inv.status,
    inv.currency,
    inv.subtotalExclVat,
    inv.totalVat,
    inv.totalInclVat,
    inv.amountPaid,
    Math.max(0, inv.totalInclVat - inv.amountPaid),
  ]);

  const date = format(new Date(), "yyyy-MM-dd");
  downloadCSV([headers, ...rows], filename || `factures-${date}.csv`);
}

export function exportClientsCSV(clients: Client[], filename?: string) {
  const headers = ["Code client", "Type", "Nom", "Email", "Adresse", "NPA", "Ville", "Pays"];

  const rows: CellValue[][] = clients.map((c) => [
    c.clientCode,
    c.type === "company" ? "Société" : "Personne",
    c.displayName,
    c.email,
    c.addressLine1,
    c.postalCode,
    c.city,
    c.country,
  ]);

  const date = format(new Date(), "yyyy-MM-dd");
  downloadCSV([headers, ...rows], filename || `clients-${date}.csv`);
}

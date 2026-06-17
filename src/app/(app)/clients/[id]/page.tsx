"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getClient, updateClient, archiveClient, unarchiveClient } from "@/lib/clients";
import { getInvoicesByClient } from "@/lib/invoices";
import { Client, Invoice } from "@/types";
import { InvoiceStatusBadge } from "@/components/ui/invoice-status-badge";
import { ClientForm } from "@/components/ui/client-form";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  ChevronLeft, Plus, Pencil, Archive, ArchiveRestore,
  Loader2, FileText, X, Mail, MapPin, Hash
} from "lucide-react";

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [client, setClient] = useState<Client | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    const [c, invs] = await Promise.all([getClient(id), getInvoicesByClient(id)]);
    setClient(c);
    setInvoices(invs);
    setLoading(false);
  };

  useEffect(() => { load(); }, [id]);

  const handleEdit = async (data: Parameters<typeof updateClient>[1]) => {
    await updateClient(id, data);
    setEditOpen(false);
    load();
  };

  const handleArchiveToggle = async () => {
    if (!client) return;
    if (client.archivedAt) await unarchiveClient(id);
    else await archiveClient(id);
    load();
  };

  if (loading) {
    return (
      <main className="p-4 md:p-8 max-w-2xl mx-auto flex justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: "#C8C4BC" }} />
      </main>
    );
  }

  if (!client) {
    return (
      <main className="p-4 md:p-8 max-w-2xl mx-auto">
        <p style={{ color: "#7A7570" }}>Client introuvable.</p>
      </main>
    );
  }

  // Calcul stats
  const totalFacture = invoices.filter(i => i.status !== "cancelled").reduce((s, i) => s + i.totalInclVat, 0);
  const enAttente = invoices.filter(i => ["validated", "sent", "pending", "partially_paid"].includes(i.status)).reduce((s, i) => s + (i.totalInclVat - i.amountPaid), 0);
  const enRetard = invoices.filter(i => i.status === "overdue").reduce((s, i) => s + (i.totalInclVat - i.amountPaid), 0);

  return (
    <main className="p-4 md:p-8 max-w-2xl mx-auto pb-24">
      {/* Retour */}
      <button
        onClick={() => router.push("/clients")}
        className="flex items-center gap-1.5 text-[13px] mb-5 -ml-1 transition-colors"
        style={{ color: "#7A7570" }}
      >
        <ChevronLeft className="w-4 h-4" />
        Clients
      </button>

      {/* Header client */}
      <div className="rounded-[12px] border p-5 mb-4" style={{ borderColor: "#E5E1DA", backgroundColor: "#FFFFFF" }}>
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center shrink-0 text-[15px] font-semibold"
              style={{ backgroundColor: "#F0EDE8", color: "#7A7570" }}
            >
              {client.displayName.substring(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-[18px] font-semibold" style={{ color: "#1A1A18" }}>{client.displayName}</h1>
                {client.archivedAt && (
                  <span className="text-[11px] px-1.5 py-0.5 rounded font-semibold uppercase" style={{ backgroundColor: "#E5E1DA", color: "#7A7570" }}>
                    Archivé
                  </span>
                )}
              </div>
              <span className="font-mono text-[12px]" style={{ color: "#A09890" }}>{client.clientCode}</span>
            </div>
          </div>

          <div className="flex gap-1 shrink-0">
            <button
              onClick={() => setEditOpen(true)}
              className="w-9 h-9 flex items-center justify-center rounded-[8px] transition-colors"
              style={{ color: "#7A7570" }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#F0EDE8")}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
            >
              <Pencil className="w-4 h-4" />
            </button>
            <button
              onClick={handleArchiveToggle}
              className="w-9 h-9 flex items-center justify-center rounded-[8px] transition-colors"
              style={{ color: "#7A7570" }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#F0EDE8")}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
            >
              {client.archivedAt ? <ArchiveRestore className="w-4 h-4" /> : <Archive className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-[13px]" style={{ color: "#7A7570" }}>
            <Mail className="w-3.5 h-3.5 shrink-0" />
            <span>{client.email}</span>
          </div>
          {client.addressLine1 && (
            <div className="flex items-start gap-2 text-[13px]" style={{ color: "#7A7570" }}>
              <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>{client.addressLine1}{client.addressLine2 ? `, ${client.addressLine2}` : ""}, {client.postalCode} {client.city}</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-[13px]" style={{ color: "#7A7570" }}>
            <Hash className="w-3.5 h-3.5 shrink-0" />
            <span>{client.type === "company" ? "Société" : "Personne physique"}</span>
          </div>
        </div>
      </div>

      {/* Stats */}
      {invoices.length > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-4">
          {[
            { label: "Facturé", value: totalFacture, color: "#1A1A18" },
            { label: "En attente", value: enAttente, color: "#A05C00" },
            { label: "En retard", value: enRetard, color: "#C0392B" },
          ].map((s) => (
            <div key={s.label} className="rounded-[10px] border p-3 text-center" style={{ borderColor: "#E5E1DA", backgroundColor: "#FFFFFF" }}>
              <p className="text-[11px] uppercase tracking-widest font-semibold mb-1" style={{ color: "#A09890" }}>{s.label}</p>
              <p className="font-mono text-[14px] font-semibold" style={{ color: s.value > 0 ? s.color : "#C8C4BC" }}>
                {s.value.toFixed(2)}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* CTA nouvelle facture */}
      <button
        onClick={() => router.push(`/factures/nouvelle?clientId=${id}`)}
        className="flex items-center justify-center gap-2 w-full h-11 rounded-[8px] text-[14px] font-medium text-white mb-6"
        style={{ backgroundColor: "#1A1A18" }}
      >
        <Plus className="w-4 h-4" />
        Nouvelle facture pour ce client
      </button>

      {/* Liste des factures */}
      <h2 className="text-[11px] font-semibold uppercase tracking-widest mb-3" style={{ color: "#7A7570" }}>
        Factures ({invoices.length})
      </h2>

      {invoices.length === 0 ? (
        <div className="rounded-[10px] border p-8 text-center" style={{ borderColor: "#E5E1DA", backgroundColor: "#FFFFFF" }}>
          <FileText className="w-8 h-8 mx-auto mb-3" style={{ color: "#C8C4BC" }} />
          <p className="text-[14px] font-medium mb-1" style={{ color: "#1A1A18" }}>Aucune facture</p>
          <p className="text-[13px]" style={{ color: "#7A7570" }}>Ce client n'a pas encore de facture.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {invoices.map((inv) => (
            <button
              key={inv.id}
              onClick={() => router.push(`/factures/${inv.id}`)}
              className="w-full text-left rounded-[10px] border p-4 transition-colors"
              style={{ borderColor: "#E5E1DA", backgroundColor: "#FFFFFF" }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#F9F8F6")}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#FFFFFF")}
            >
              <div className="flex items-center justify-between gap-3 mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[13px]" style={{ color: "#7A7570" }}>
                    {inv.status === "draft" ? "Brouillon" : inv.invoiceNumber}
                  </span>
                  <InvoiceStatusBadge status={inv.status} />
                </div>
                <span className="font-mono text-[15px] font-semibold" style={{ color: "#1A1A18" }}>
                  CHF {inv.totalInclVat.toFixed(2)}
                </span>
              </div>
              <p className="text-[12px]" style={{ color: "#A09890" }}>
                {inv.status === "draft"
                  ? `Créé le ${format(inv.createdAt, "dd.MM.yyyy", { locale: fr })}`
                  : `Éch. ${format(inv.dueDate, "dd.MM.yyyy", { locale: fr })}`}
                {inv.status === "partially_paid" && ` · payé CHF ${inv.amountPaid.toFixed(2)}`}
              </p>
            </button>
          ))}
        </div>
      )}

      {/* Modal édition */}
      {editOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4"
          style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
          onClick={(e) => e.target === e.currentTarget && setEditOpen(false)}
        >
          <div
            className="w-full md:max-w-lg rounded-t-[20px] md:rounded-[16px] p-6 max-h-[90vh] overflow-y-auto"
            style={{ backgroundColor: "#FFFFFF" }}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-[18px] font-semibold" style={{ color: "#1A1A18" }}>Modifier le client</h2>
              <button
                onClick={() => setEditOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full"
                style={{ backgroundColor: "#F0EDE8", color: "#7A7570" }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <ClientForm
              initial={client}
              onSubmit={handleEdit}
              onCancel={() => setEditOpen(false)}
              submitLabel="Enregistrer"
            />
          </div>
        </div>
      )}
    </main>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { useInvoices } from "@/hooks/use-invoices";
import { deleteDraftInvoice, cancelInvoice, duplicateInvoice, markInvoicePaid, validateInvoice } from "@/lib/invoices";
import { Invoice, InvoiceStatus } from "@/types";
import { PageHeader } from "@/components/ui/page-header";
import { InvoiceStatusBadge } from "@/components/ui/invoice-status-badge";
import { EmptyStatePremium } from "@/components/ui/empty-state-premium";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  FileText, Plus, Search, MoreVertical, Trash2, Copy,
  CheckCircle, XCircle, Eye, Loader2, ChevronRight, AlertCircle, Pencil,
  Download, ChevronLeft, Square, CheckSquare, FileSpreadsheet, Mail, BellRing
} from "lucide-react";
import { exportInvoicesCSV } from "@/lib/export";

const PAGE_SIZE = 20;

// ─── Filtres ──────────────────────────────────────────────────────────────────

type FilterValue = "all" | "draft" | "pending" | "overdue" | "paid" | "cancelled";

const FILTERS: { value: FilterValue; label: string }[] = [
  { value: "all", label: "Toutes" },
  { value: "draft", label: "Brouillons" },
  { value: "pending", label: "En attente" },
  { value: "overdue", label: "En retard" },
  { value: "paid", label: "Payées" },
  { value: "cancelled", label: "Annulées" },
];

function matchesFilter(invoice: Invoice, filter: FilterValue): boolean {
  if (filter === "all") return true;
  if (filter === "pending") return invoice.status === "pending" || invoice.status === "sent" || invoice.status === "validated" || invoice.status === "partially_paid";
  return invoice.status === (filter as InvoiceStatus);
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function FacturesPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { invoices, loading, refresh } = useInvoices();

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterValue>("all");
  const [actionMenu, setActionMenu] = useState<string | null>(null);
  const [payModal, setPayModal] = useState<Invoice | null>(null);
  const [processing, setProcessing] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [downloading, setDownloading] = useState(false);
  const [batchAction, setBatchAction] = useState<"send" | "remind" | null>(null);
  const [batchProgress, setBatchProgress] = useState({ done: 0, total: 0 });

  const filtered = invoices.filter((inv) => {
    const matchSearch =
      !search ||
      inv.clientSnapshot.displayName.toLowerCase().includes(search.toLowerCase()) ||
      (inv.invoiceNumber || "").toLowerCase().includes(search.toLowerCase());
    return matchSearch && matchesFilter(inv, filter);
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  // Reset page on filter/search change
  const handleSearch = (v: string) => { setSearch(v); setPage(1); };
  const handleFilter = (v: FilterValue) => { setFilter(v); setPage(1); };

  const downloadablePdfIds = selected.size > 0
    ? [...selected].filter((id) => {
        const inv = invoices.find((i) => i.id === id);
        return inv && inv.status !== "draft";
      })
    : [];

  const sendableIds = [...selected].filter((id) => {
    const inv = invoices.find((i) => i.id === id);
    return inv && !["draft", "cancelled"].includes(inv.status);
  });

  const remindableIds = [...selected].filter((id) => {
    const inv = invoices.find((i) => i.id === id);
    return inv && ["sent", "pending", "overdue", "partially_paid"].includes(inv.status);
  });

  async function handleBatchEmail(type: "send" | "remind") {
    const ids = type === "send" ? sendableIds : remindableIds;
    if (ids.length === 0) return;
    setBatchAction(type);
    setBatchProgress({ done: 0, total: ids.length });
    const endpoint = type === "send" ? "send" : "remind";
    let done = 0;
    for (const id of ids) {
      try {
        await fetch(`/api/invoices/${id}/${endpoint}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
      } catch {
        // on continue même si un envoi échoue
      }
      done++;
      setBatchProgress({ done, total: ids.length });
    }
    setBatchAction(null);
    refresh();
    exitSelection();
  }

  async function handleBulkDownload() {
    if (downloadablePdfIds.length === 0) return;
    setDownloading(true);
    try {
      const res = await fetch("/api/invoices/pdf/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: downloadablePdfIds }),
      });
      if (!res.ok) throw new Error("Erreur lors de la génération");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `factures-${new Date().toISOString().split("T")[0]}.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setDownloading(false);
    }
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    const allIds = filtered.map((i) => i.id);
    const allSelected = allIds.every((id) => selected.has(id));
    setSelected(allSelected ? new Set() : new Set(allIds));
  }

  function exitSelection() {
    setSelectionMode(false);
    setSelected(new Set());
  }

  const allPageSelected = paginated.length > 0 && paginated.every((i) => selected.has(i.id));
  const allFilteredSelected = filtered.length > 0 && filtered.every((i) => selected.has(i.id));

  // Comptes par filtre
  const counts: Record<FilterValue, number> = {
    all: invoices.length,
    draft: invoices.filter((i) => i.status === "draft").length,
    pending: invoices.filter((i) => ["pending", "sent", "validated", "partially_paid"].includes(i.status)).length,
    overdue: invoices.filter((i) => i.status === "overdue").length,
    paid: invoices.filter((i) => i.status === "paid").length,
    cancelled: invoices.filter((i) => i.status === "cancelled").length,
  };

  const handleDelete = async (invoice: Invoice) => {
    if (!confirm("Supprimer ce brouillon ?")) return;
    setProcessing(invoice.id);
    try {
      await deleteDraftInvoice(invoice.id);
      refresh();
    } finally {
      setProcessing(null);
      setActionMenu(null);
    }
  };

  const handleDuplicate = async (invoice: Invoice) => {
    if (!user) return;
    setProcessing(invoice.id);
    try {
      await duplicateInvoice(invoice.id, user.uid);
      refresh();
    } finally {
      setProcessing(null);
      setActionMenu(null);
    }
  };

  const handleCancel = async (invoice: Invoice) => {
    if (!confirm("Annuler cette facture ? Cette action est irréversible.")) return;
    if (!user) return;
    setProcessing(invoice.id);
    try {
      await cancelInvoice(invoice.id, user.uid);
      refresh();
    } finally {
      setProcessing(null);
      setActionMenu(null);
    }
  };

  const handleValidate = async (invoice: Invoice) => {
    if (!user) return;
    setProcessing(invoice.id);
    try {
      await validateInvoice(invoice.id, user.uid);
      refresh();
    } finally {
      setProcessing(null);
      setActionMenu(null);
    }
  };

  const handleMarkPaid = async (invoice: Invoice, amount: number, date: Date) => {
    if (!user) return;
    setProcessing(invoice.id);
    try {
      await markInvoicePaid(invoice.id, amount, date, user.uid);
      refresh();
    } finally {
      setProcessing(null);
      setPayModal(null);
    }
  };

  return (
    <main className="p-4 md:p-8 max-w-2xl mx-auto">
      <PageHeader
        title="Factures"
        action={
          <div className="flex items-center gap-2">
            <button
              onClick={() => exportInvoicesCSV(filtered)}
              disabled={filtered.length === 0}
              className="flex items-center gap-1.5 h-9 px-3 rounded-[8px] text-[13px] font-medium border disabled:opacity-40"
              style={{ borderColor: "#E5E1DA", color: "#7A7570", backgroundColor: "transparent" }}
              title="Exporter en Excel"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Exporter</span>
            </button>
            <button
              onClick={() => { setSelectionMode(!selectionMode); setSelected(new Set()); }}
              className="flex items-center gap-1.5 h-9 px-3 rounded-[8px] text-[13px] font-medium border"
              style={{ borderColor: "#E5E1DA", color: selectionMode ? "#1A1A18" : "#7A7570", backgroundColor: selectionMode ? "#F0EDE8" : "transparent" }}
            >
              <CheckSquare className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sélectionner</span>
            </button>
            <button
              onClick={() => router.push("/factures/nouvelle")}
              className="flex items-center gap-2 h-9 px-4 rounded-[8px] text-[13px] font-medium text-white"
              style={{ backgroundColor: "#1A1A18" }}
            >
              <Plus className="w-4 h-4" />
              Nouvelle
            </button>
          </div>
        }
      />

      {/* Recherche */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#A09890" }} />
        <input
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Client, numéro…"
          className="w-full h-12 pl-10 pr-4 rounded-[8px] border text-[14px] outline-none"
          style={{ backgroundColor: "#FFFFFF", borderColor: "#E5E1DA", color: "#1A1A18" }}
          onFocus={(e) => (e.target.style.borderColor = "#1A1A18")}
          onBlur={(e) => (e.target.style.borderColor = "#E5E1DA")}
        />
      </div>

      {/* Filtres chips */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-4" style={{ scrollbarWidth: "none" }}>
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => handleFilter(f.value)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-medium whitespace-nowrap transition-colors shrink-0"
            style={{
              backgroundColor: filter === f.value ? "#1A1A18" : "#FFFFFF",
              color: filter === f.value ? "#FFFFFF" : "#7A7570",
              border: `1px solid ${filter === f.value ? "#1A1A18" : "#E5E1DA"}`,
            }}
          >
            {f.label}
            {counts[f.value] > 0 && (
              <span
                className="text-[11px] px-1.5 rounded-full"
                style={{
                  backgroundColor: filter === f.value ? "rgba(255,255,255,0.2)" : "#F0EDE8",
                  color: filter === f.value ? "#FFFFFF" : "#7A7570",
                }}
              >
                {counts[f.value]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Liste */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 rounded-[10px] border animate-pulse" style={{ borderColor: "#E5E1DA", backgroundColor: "#F0EDE8" }} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyStatePremium
          icon={FileText}
          title={search || filter !== "all" ? "Aucun résultat" : "Aucune facture"}
          description={
            search || filter !== "all"
              ? "Modifiez vos filtres ou votre recherche."
              : "Créez votre première facture pour commencer."
          }
          action={
            !search && filter === "all" ? (
              <button
                onClick={() => router.push("/factures/nouvelle")}
                className="flex items-center gap-2 h-10 px-4 rounded-[8px] text-[14px] font-medium text-white"
                style={{ backgroundColor: "#1A1A18" }}
              >
                <Plus className="w-4 h-4" />
                Nouvelle facture
              </button>
            ) : undefined
          }
        />
      ) : (
        <>
          {/* Barre de sélection */}
          {selectionMode && (
            <div className="flex items-center gap-3 mb-3 px-3 h-10 rounded-[8px]" style={{ backgroundColor: "#F0EDE8" }}>
              <button onClick={toggleSelectAll} className="flex items-center gap-2 text-[13px] font-medium" style={{ color: "#1A1A18" }}>
                {allFilteredSelected
                  ? <CheckSquare className="w-4 h-4" />
                  : <Square className="w-4 h-4" style={{ color: "#A09890" }} />
                }
                {allFilteredSelected ? "Tout désélectionner" : `Tout sélectionner (${filtered.length})`}
              </button>
              <span className="text-[12px]" style={{ color: "#7A7570" }}>
                {selected.size > 0 ? `${selected.size} sélectionnée${selected.size > 1 ? "s" : ""}` : ""}
              </span>
              <div className="flex-1" />
              <button onClick={exitSelection} className="text-[12px]" style={{ color: "#7A7570" }}>Annuler</button>
            </div>
          )}

          <div className="space-y-2">
            {paginated.map((invoice) => (
              <InvoiceCard
                key={invoice.id}
                invoice={invoice}
                processing={processing === invoice.id}
                menuOpen={actionMenu === invoice.id}
                onMenuToggle={() => setActionMenu(actionMenu === invoice.id ? null : invoice.id)}
                onMenuClose={() => setActionMenu(null)}
                onView={() => selectionMode ? toggleSelect(invoice.id) : router.push(`/factures/${invoice.id}`)}
                onEdit={() => router.push(`/factures/${invoice.id}/modifier`)}
                onDelete={() => handleDelete(invoice)}
                onDuplicate={() => handleDuplicate(invoice)}
                onCancel={() => handleCancel(invoice)}
                onValidate={() => handleValidate(invoice)}
                onMarkPaid={() => setPayModal(invoice)}
                selectionMode={selectionMode}
                selected={selected.has(invoice.id)}
                onToggleSelect={() => toggleSelect(invoice.id)}
              />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t" style={{ borderColor: "#E5E1DA" }}>
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={safePage === 1}
                className="flex items-center gap-1 h-9 px-3 rounded-[8px] text-[13px] font-medium disabled:opacity-40"
                style={{ backgroundColor: "#F0EDE8", color: "#1A1A18" }}
              >
                <ChevronLeft className="w-4 h-4" />
                Précédent
              </button>
              <span className="text-[13px]" style={{ color: "#7A7570" }}>
                {safePage} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={safePage === totalPages}
                className="flex items-center gap-1 h-9 px-3 rounded-[8px] text-[13px] font-medium disabled:opacity-40"
                style={{ backgroundColor: "#F0EDE8", color: "#1A1A18" }}
              >
                Suivant
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </>
      )}

      {/* Barre d'action flottante sélection */}
      {selectionMode && selected.size > 0 && (
        <div
          className="fixed bottom-20 md:bottom-6 md:left-[calc(50%+7rem)] left-1/2 -translate-x-1/2 z-30 flex items-center gap-3 px-4 h-14 rounded-full shadow-lg overflow-x-auto max-w-[calc(100vw-2rem)]"
          style={{ backgroundColor: "#1A1A18" }}
        >
          <span className="text-[13px] font-medium text-white shrink-0">
            {selected.size} facture{selected.size > 1 ? "s" : ""}
          </span>

          <div className="w-px h-5 bg-white/20 shrink-0" />

          {/* PDF */}
          <button
            onClick={handleBulkDownload}
            disabled={!!batchAction || downloading || downloadablePdfIds.length === 0}
            className="flex items-center gap-1.5 text-[13px] font-medium disabled:opacity-40 shrink-0"
            style={{ color: downloadablePdfIds.length > 0 ? "#C8A96E" : "#7A7570" }}
            title="Télécharger les PDF"
          >
            {downloading
              ? <span className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: "rgba(255,255,255,0.3)", borderTopColor: "#C8A96E" }} />
              : <Download className="w-4 h-4" />
            }
            <span className="hidden sm:inline">PDF</span>
            {downloadablePdfIds.length > 0 && <span className="text-[11px] opacity-70">({downloadablePdfIds.length})</span>}
          </button>

          {/* Excel */}
          <button
            onClick={() => exportInvoicesCSV(invoices.filter((i) => selected.has(i.id)))}
            disabled={!!batchAction}
            className="flex items-center gap-1.5 text-[13px] font-medium disabled:opacity-40 shrink-0"
            style={{ color: "#C8A96E" }}
            title="Exporter en Excel"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span className="hidden sm:inline">Excel</span>
          </button>

          <div className="w-px h-5 bg-white/20 shrink-0" />

          {/* Envoyer */}
          <button
            onClick={() => handleBatchEmail("send")}
            disabled={!!batchAction || sendableIds.length === 0}
            className="flex items-center gap-1.5 text-[13px] font-medium disabled:opacity-40 shrink-0"
            style={{ color: sendableIds.length > 0 ? "#C8A96E" : "#7A7570" }}
            title="Envoyer par email"
          >
            {batchAction === "send"
              ? <span className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: "rgba(255,255,255,0.3)", borderTopColor: "#C8A96E" }} />
              : <Mail className="w-4 h-4" />
            }
            {batchAction === "send"
              ? <span className="hidden sm:inline">{batchProgress.done}/{batchProgress.total}</span>
              : <span className="hidden sm:inline">Envoyer{sendableIds.length > 0 ? ` (${sendableIds.length})` : ""}</span>
            }
          </button>

          {/* Relancer */}
          <button
            onClick={() => handleBatchEmail("remind")}
            disabled={!!batchAction || remindableIds.length === 0}
            className="flex items-center gap-1.5 text-[13px] font-medium disabled:opacity-40 shrink-0"
            style={{ color: remindableIds.length > 0 ? "#C8A96E" : "#7A7570" }}
            title="Envoyer une relance"
          >
            {batchAction === "remind"
              ? <span className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: "rgba(255,255,255,0.3)", borderTopColor: "#C8A96E" }} />
              : <BellRing className="w-4 h-4" />
            }
            {batchAction === "remind"
              ? <span className="hidden sm:inline">{batchProgress.done}/{batchProgress.total}</span>
              : <span className="hidden sm:inline">Relancer{remindableIds.length > 0 ? ` (${remindableIds.length})` : ""}</span>
            }
          </button>
        </div>
      )}

      {/* Fermer menu au clic extérieur */}
      {actionMenu && (
        <div className="fixed inset-0 z-10" onClick={() => setActionMenu(null)} />
      )}

      {/* Modal paiement */}
      {payModal && (
        <PayModal
          invoice={payModal}
          onConfirm={handleMarkPaid}
          onClose={() => setPayModal(null)}
        />
      )}
    </main>
  );
}

// ─── InvoiceCard ──────────────────────────────────────────────────────────────

function InvoiceCard({
  invoice,
  processing,
  menuOpen,
  onMenuToggle,
  onMenuClose,
  onView,
  onEdit,
  onDelete,
  onDuplicate,
  onCancel,
  onValidate,
  onMarkPaid,
  selectionMode = false,
  selected = false,
  onToggleSelect,
}: {
  invoice: Invoice;
  processing: boolean;
  menuOpen: boolean;
  onMenuToggle: () => void;
  onMenuClose: () => void;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onCancel: () => void;
  onValidate: () => void;
  onMarkPaid: () => void;
  selectionMode?: boolean;
  selected?: boolean;
  onToggleSelect?: () => void;
}) {
  const isDraft = invoice.status === "draft";
  const isOverdue = invoice.status === "overdue";
  const isPaid = invoice.status === "paid" || invoice.status === "cancelled";
  const canPay = ["validated", "sent", "pending", "overdue", "partially_paid"].includes(invoice.status);

  // suppress unused warning — onMenuClose is kept for API consistency
  void onMenuClose;

  return (
    <div
      className="rounded-[10px] border relative"
      style={{ borderColor: selected ? "#1A1A18" : "#E5E1DA", backgroundColor: "#FFFFFF" }}
    >
      {/* Contenu principal cliquable */}
      <button
        onClick={onView}
        className="w-full text-left p-4 flex items-start gap-3"
      >
        {selectionMode && (
          <div className="shrink-0 mt-0.5" onClick={(e) => { e.stopPropagation(); onToggleSelect?.(); }}>
            {selected
              ? <CheckSquare className="w-5 h-5" style={{ color: "#1A1A18" }} />
              : <Square className="w-5 h-5" style={{ color: "#C8C4BC" }} />
            }
          </div>
        )}
        <div className="flex-1 min-w-0 space-y-2">
          {/* Ligne 1 : numéro + badge */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-[13px] font-medium" style={{ color: "#7A7570" }}>
              {isDraft ? "Brouillon" : invoice.invoiceNumber}
            </span>
            <InvoiceStatusBadge status={invoice.status} />
          </div>

          {/* Ligne 2 : client + montant */}
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-[15px] font-medium truncate" style={{ color: "#1A1A18" }}>
              {invoice.clientSnapshot.displayName}
            </span>
            <span className="font-mono text-[15px] font-semibold shrink-0" style={{ color: "#1A1A18" }}>
              {invoice.currency} {invoice.totalInclVat.toFixed(2)}
            </span>
          </div>

          {/* Ligne 3 : échéance */}
          <div className="flex items-center gap-1.5">
            {isOverdue && <AlertCircle className="w-3.5 h-3.5 shrink-0" style={{ color: "#C0392B" }} />}
            <span className="text-[12px]" style={{ color: isOverdue ? "#C0392B" : "#A09890" }}>
              {isDraft
                ? `Créé le ${format(invoice.createdAt, "dd.MM.yyyy", { locale: fr })}`
                : `Éch. ${format(invoice.dueDate, "dd.MM.yyyy", { locale: fr })}`}
            </span>
            {invoice.status === "partially_paid" && (
              <span className="text-[12px]" style={{ color: "#A05C00" }}>
                · payé {invoice.currency} {invoice.amountPaid.toFixed(2)}
              </span>
            )}
          </div>
        </div>

        <ChevronRight className="w-4 h-4 shrink-0 mt-1" style={{ color: "#C8C4BC" }} />
      </button>

      {/* Actions rapides + menu */}
      <div className="px-4 pb-3 flex items-center gap-2 border-t" style={{ borderColor: "#F0EDE8" }}>
        {processing ? (
          <Loader2 className="w-4 h-4 animate-spin" style={{ color: "#A09890" }} />
        ) : (
          <>
            {canPay && (
              <button
                onClick={onMarkPaid}
                className="flex items-center gap-1.5 h-8 px-3 rounded-[6px] text-[12px] font-medium transition-colors"
                style={{ backgroundColor: "#D4EDDA", color: "#1A5C35" }}
              >
                <CheckCircle className="w-3.5 h-3.5" />
                Marquer payé
              </button>
            )}
            {isDraft && (
              <button
                onClick={onValidate}
                className="flex items-center gap-1.5 h-8 px-3 rounded-[6px] text-[12px] font-medium"
                style={{ backgroundColor: "#1A1A18", color: "#FFFFFF" }}
              >
                Valider
              </button>
            )}
            <div className="flex-1" />
            <div className="relative">
              <button
                onClick={onMenuToggle}
                className="w-8 h-8 flex items-center justify-center rounded-[6px]"
                style={{ color: "#7A7570" }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#F0EDE8")}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
              >
                <MoreVertical className="w-4 h-4" />
              </button>

              {menuOpen && (
                <div
                  className="absolute right-0 bottom-10 rounded-[10px] border shadow-lg z-20 py-1 w-44"
                  style={{ backgroundColor: "#FFFFFF", borderColor: "#E5E1DA" }}
                >
                  <MenuItem icon={Eye} label="Voir" onClick={onView} />
                  {isDraft && <MenuItem icon={Pencil} label="Modifier" onClick={onEdit} />}
                  <MenuItem icon={Copy} label="Dupliquer" onClick={onDuplicate} />
                  {isDraft && <MenuItem icon={Trash2} label="Supprimer" onClick={onDelete} danger />}
                  {!isDraft && !isPaid && <MenuItem icon={XCircle} label="Annuler" onClick={onCancel} danger />}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function MenuItem({
  icon: Icon,
  label,
  onClick,
  danger = false,
}: {
  icon: React.ElementType;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] text-left transition-colors"
      style={{ color: danger ? "#C0392B" : "#1A1A18" }}
      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = danger ? "#FDECEA" : "#F0EDE8")}
      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
    >
      <Icon className="w-3.5 h-3.5 shrink-0" />
      {label}
    </button>
  );
}

// ─── PayModal ────────────────────────────────────────────────────────────────

function PayModal({
  invoice,
  onConfirm,
  onClose,
}: {
  invoice: Invoice;
  onConfirm: (invoice: Invoice, amount: number, date: Date) => void;
  onClose: () => void;
}) {
  const [amount, setAmount] = useState(String(invoice.totalInclVat.toFixed(2)));
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));

  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center"
      style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full md:max-w-sm rounded-t-[20px] md:rounded-[16px] p-6"
        style={{ backgroundColor: "#FFFFFF" }}
      >
        <h3 className="text-[18px] font-semibold mb-1" style={{ color: "#1A1A18" }}>Enregistrer un paiement</h3>
        <p className="text-[13px] mb-5" style={{ color: "#7A7570" }}>
          {invoice.invoiceNumber} · {invoice.clientSnapshot.displayName}
        </p>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-[13px] font-medium" style={{ color: "#1A1A18" }}>Montant reçu ({invoice.currency})</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full h-12 px-4 rounded-[8px] border text-[14px] outline-none font-mono"
              style={{ backgroundColor: "#FFFFFF", borderColor: "#E5E1DA", color: "#1A1A18" }}
              onFocus={(e) => (e.target.style.borderColor = "#1A1A18")}
              onBlur={(e) => (e.target.style.borderColor = "#E5E1DA")}
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-[13px] font-medium" style={{ color: "#1A1A18" }}>Date de paiement</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full h-12 px-4 rounded-[8px] border text-[14px] outline-none"
              style={{ backgroundColor: "#FFFFFF", borderColor: "#E5E1DA", color: "#1A1A18" }}
              onFocus={(e) => (e.target.style.borderColor = "#1A1A18")}
              onBlur={(e) => (e.target.style.borderColor = "#E5E1DA")}
            />
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button onClick={onClose}
            className="flex-1 h-12 rounded-[8px] border text-[14px] font-medium"
            style={{ borderColor: "#E5E1DA", color: "#1A1A18" }}>
            Annuler
          </button>
          <button
            onClick={() => onConfirm(invoice, parseFloat(amount) || 0, new Date(date + "T12:00:00"))}
            className="flex-1 h-12 rounded-[8px] text-[14px] font-medium text-white"
            style={{ backgroundColor: "#1A1A18" }}>
            Enregistrer
          </button>
        </div>
      </div>
    </div>
  );
}

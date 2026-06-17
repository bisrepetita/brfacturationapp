"use client";

import { useState } from "react";
import { useServices } from "@/hooks/use-services";
import { createService, updateService, archiveService, unarchiveService } from "@/lib/services";
import { Service, ServiceUnit, VatRate } from "@/types";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyStatePremium } from "@/components/ui/empty-state-premium";
import {
  Boxes, Plus, Search, Archive, Pencil, ArchiveRestore, X, Loader2,
} from "lucide-react";

type Modal =
  | { type: "create" }
  | { type: "edit"; service: Service }
  | null;

const UNIT_LABELS: Record<ServiceUnit, string> = {
  heure: "Heure",
  seance: "Séance",
  forfait: "Forfait",
};

const VAT_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "Sans TVA" },
  { value: "0", label: "0%" },
  { value: "2.6", label: "2.6% (réduit)" },
  { value: "8.1", label: "8.1% (normal)" },
];

export default function ServicesPage() {
  const [showArchived, setShowArchived] = useState(false);
  const { services, loading, refresh } = useServices(showArchived);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<Modal>(null);

  const filtered = services.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.description.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreate = async (data: Omit<Service, "id" | "createdAt" | "updatedAt" | "archivedAt">) => {
    await createService(data);
    refresh();
    setModal(null);
  };

  const handleEdit = async (data: Omit<Service, "id" | "createdAt" | "updatedAt" | "archivedAt">) => {
    if (modal?.type !== "edit") return;
    await updateService(modal.service.id, data);
    refresh();
    setModal(null);
  };

  const handleArchiveToggle = async (service: Service) => {
    if (service.archivedAt) {
      await unarchiveService(service.id);
    } else {
      await archiveService(service.id);
    }
    refresh();
  };

  return (
    <main className="p-4 md:p-8 max-w-2xl mx-auto">
      <PageHeader
        title="Services"
        subtitle={`${services.filter((s) => !s.archivedAt).length} service${services.filter((s) => !s.archivedAt).length !== 1 ? "s" : ""}`}
        action={
          <button
            onClick={() => setModal({ type: "create" })}
            className="flex items-center gap-2 h-10 px-4 rounded-[8px] text-[13px] font-medium text-white"
            style={{ backgroundColor: "#1A1A18" }}
          >
            <Plus className="w-4 h-4" />
            Nouveau
          </button>
        }
      />

      {/* Recherche */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#A09890" }} />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher un service…"
          className="w-full h-12 pl-10 pr-4 rounded-[8px] border text-[14px] outline-none"
          style={{ backgroundColor: "#FFFFFF", borderColor: "#E5E1DA", color: "#1A1A18" }}
          onFocus={(e) => (e.target.style.borderColor = "#1A1A18")}
          onBlur={(e) => (e.target.style.borderColor = "#E5E1DA")}
        />
      </div>

      {/* Toggle archivés */}
      <div className="flex items-center justify-end mb-4">
        <button
          onClick={() => setShowArchived((v) => !v)}
          className="flex items-center gap-1.5 text-[13px] transition-colors"
          style={{ color: showArchived ? "#1A1A18" : "#A09890" }}
        >
          <Archive className="w-3.5 h-3.5" />
          {showArchived ? "Masquer les archivés" : "Afficher les archivés"}
        </button>
      </div>

      {/* Liste */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 rounded-[10px] border animate-pulse" style={{ borderColor: "#E5E1DA", backgroundColor: "#F0EDE8" }} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyStatePremium
          icon={Boxes}
          title={search ? "Aucun résultat" : "Aucun service"}
          description={
            search
              ? `Aucun service ne correspond à "${search}".`
              : "Créez vos prestations pour les ajouter rapidement à vos factures."
          }
          action={
            !search ? (
              <button
                onClick={() => setModal({ type: "create" })}
                className="flex items-center gap-2 h-10 px-4 rounded-[8px] text-[14px] font-medium text-white"
                style={{ backgroundColor: "#1A1A18" }}
              >
                <Plus className="w-4 h-4" />
                Nouveau service
              </button>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-2">
          {filtered.map((service) => (
            <ServiceCard
              key={service.id}
              service={service}
              onEdit={() => setModal({ type: "edit", service })}
              onArchiveToggle={() => handleArchiveToggle(service)}
            />
          ))}
        </div>
      )}

      {/* Modal */}
      {modal && (
        <ModalWrapper onClose={() => setModal(null)}>
          {modal.type === "create" && (
            <>
              <ModalHeader title="Nouveau service" onClose={() => setModal(null)} />
              <ServiceForm onSubmit={handleCreate} onCancel={() => setModal(null)} submitLabel="Créer le service" />
            </>
          )}
          {modal.type === "edit" && (
            <>
              <ModalHeader title="Modifier le service" onClose={() => setModal(null)} />
              <ServiceForm initial={modal.service} onSubmit={handleEdit} onCancel={() => setModal(null)} submitLabel="Enregistrer" />
            </>
          )}
        </ModalWrapper>
      )}
    </main>
  );
}

// ─── ServiceCard ──────────────────────────────────────────────────────────────

function ServiceCard({
  service,
  onEdit,
  onArchiveToggle,
}: {
  service: Service;
  onEdit: () => void;
  onArchiveToggle: () => void;
}) {
  const isArchived = !!service.archivedAt;
  const priceFormatted = new Intl.NumberFormat("fr-CH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(service.defaultPrice);

  return (
    <div
      className="rounded-[10px] border p-4 flex items-center gap-3"
      style={{
        borderColor: "#E5E1DA",
        backgroundColor: isArchived ? "#F9F8F6" : "#FFFFFF",
        opacity: isArchived ? 0.7 : 1,
      }}
    >
      {/* Icône unité */}
      <div
        className="w-10 h-10 rounded-[8px] flex items-center justify-center shrink-0 text-[11px] font-semibold uppercase tracking-wide"
        style={{ backgroundColor: "#F0EDE8", color: "#7A7570" }}
      >
        {service.unit === "heure" ? "h" : service.unit === "seance" ? "séa" : "forf"}
      </div>

      {/* Infos */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[14px] font-medium truncate" style={{ color: "#1A1A18" }}>
            {service.name}
          </span>
          {isArchived && (
            <span className="text-[11px] px-1.5 py-0.5 rounded-[4px] font-semibold uppercase tracking-wide shrink-0" style={{ backgroundColor: "#E5E1DA", color: "#7A7570" }}>
              Archivé
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          <span className="font-mono text-[13px] font-medium" style={{ color: "#1A1A18" }}>
            CHF {priceFormatted}
          </span>
          <span style={{ color: "#E5E1DA" }}>·</span>
          <span className="text-[13px]" style={{ color: "#7A7570" }}>
            {UNIT_LABELS[service.unit]}
          </span>
          {service.vatApplicable && service.defaultVatRate !== null && (
            <>
              <span style={{ color: "#E5E1DA" }}>·</span>
              <span className="text-[13px]" style={{ color: "#7A7570" }}>
                TVA {service.defaultVatRate}%
              </span>
            </>
          )}
        </div>
        {service.description && (
          <p className="text-[12px] truncate mt-0.5" style={{ color: "#A09890" }}>
            {service.description}
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={onEdit}
          title="Modifier le service"
          className="w-9 h-9 flex items-center justify-center rounded-[8px] transition-colors"
          style={{ color: "#7A7570" }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#F0EDE8")}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
        >
          <Pencil className="w-4 h-4" />
        </button>
        <button
          onClick={onArchiveToggle}
          title={isArchived ? "Désarchiver le service" : "Archiver le service"}
          className="w-9 h-9 flex items-center justify-center rounded-[8px] transition-colors"
          style={{ color: "#7A7570" }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#F0EDE8")}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
        >
          {isArchived ? <ArchiveRestore className="w-4 h-4" /> : <Archive className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}

// ─── ServiceForm ──────────────────────────────────────────────────────────────

type ServiceFormData = {
  name: string;
  description: string;
  defaultPrice: string;
  unit: ServiceUnit;
  vatApplicable: boolean;
  defaultVatRate: string;
};

function ServiceForm({
  initial,
  onSubmit,
  onCancel,
  submitLabel = "Enregistrer",
}: {
  initial?: Service;
  onSubmit: (data: Omit<Service, "id" | "createdAt" | "updatedAt" | "archivedAt">) => Promise<void>;
  onCancel: () => void;
  submitLabel?: string;
}) {
  const [form, setForm] = useState<ServiceFormData>({
    name: initial?.name || "",
    description: initial?.description || "",
    defaultPrice: initial?.defaultPrice !== undefined ? String(initial.defaultPrice) : "",
    unit: initial?.unit || "heure",
    vatApplicable: initial?.vatApplicable ?? false,
    defaultVatRate: initial?.defaultVatRate !== null && initial?.defaultVatRate !== undefined ? String(initial.defaultVatRate) : "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const set = <K extends keyof ServiceFormData>(key: K, value: ServiceFormData[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!form.name.trim()) { setError("Le nom est requis."); return; }
    const price = parseFloat(form.defaultPrice.replace(",", "."));
    if (isNaN(price) || price < 0) { setError("Prix invalide."); return; }

    setLoading(true);
    try {
      await onSubmit({
        name: form.name.trim(),
        description: form.description.trim(),
        defaultPrice: price,
        unit: form.unit,
        vatApplicable: form.vatApplicable,
        defaultVatRate: form.vatApplicable && form.defaultVatRate !== ""
          ? (parseFloat(form.defaultVatRate) as VatRate)
          : null,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue.");
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full h-12 px-4 rounded-[8px] border text-[14px] outline-none transition-colors";
  const inputStyle = { backgroundColor: "#FFFFFF", borderColor: "#E5E1DA", color: "#1A1A18" };
  const focusIn = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    (e.target.style.borderColor = "#1A1A18");
  const focusOut = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    (e.target.style.borderColor = "#E5E1DA");

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Nom */}
      <div className="space-y-1.5">
        <label className="block text-[13px] font-medium" style={{ color: "#1A1A18" }}>Nom *</label>
        <input className={inputClass} style={inputStyle} onFocus={focusIn} onBlur={focusOut}
          value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Cours de boxe" />
      </div>

      {/* Description */}
      <div className="space-y-1.5">
        <label className="block text-[13px] font-medium" style={{ color: "#1A1A18" }}>Description</label>
        <input className={inputClass} style={inputStyle} onFocus={focusIn} onBlur={focusOut}
          value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="Description optionnelle" />
      </div>

      {/* Prix + Unité */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="block text-[13px] font-medium" style={{ color: "#1A1A18" }}>Prix (CHF) *</label>
          <input className={inputClass} style={inputStyle} onFocus={focusIn} onBlur={focusOut}
            type="number" min="0" step="0.05"
            value={form.defaultPrice} onChange={(e) => set("defaultPrice", e.target.value)} placeholder="80.00" />
        </div>
        <div className="space-y-1.5">
          <label className="block text-[13px] font-medium" style={{ color: "#1A1A18" }}>Unité</label>
          <select
            className="w-full h-12 px-4 rounded-[8px] border text-[14px] outline-none appearance-none"
            style={inputStyle} onFocus={focusIn} onBlur={focusOut}
            value={form.unit} onChange={(e) => set("unit", e.target.value as ServiceUnit)}
          >
            <option value="heure">Heure</option>
            <option value="seance">Séance</option>
            <option value="forfait">Forfait</option>
          </select>
        </div>
      </div>

      {/* TVA */}
      <div
        className="rounded-[10px] border p-4 space-y-3"
        style={{ borderColor: "#E5E1DA" }}
      >
        <label className="flex items-center justify-between cursor-pointer">
          <span className="text-[14px]" style={{ color: "#1A1A18" }}>TVA applicable</span>
          <button
            type="button"
            onClick={() => set("vatApplicable", !form.vatApplicable)}
            className="relative w-11 h-6 rounded-full transition-colors shrink-0"
            style={{ backgroundColor: form.vatApplicable ? "#1A1A18" : "#E5E1DA" }}
          >
            <span
              className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform"
              style={{ transform: form.vatApplicable ? "translateX(20px)" : "translateX(0)" }}
            />
          </button>
        </label>
        {form.vatApplicable && (
          <div className="space-y-1.5">
            <label className="block text-[13px] font-medium" style={{ color: "#1A1A18" }}>Taux TVA par défaut</label>
            <select
              className="w-full h-12 px-4 rounded-[8px] border text-[14px] outline-none appearance-none"
              style={inputStyle} onFocus={focusIn} onBlur={focusOut}
              value={form.defaultVatRate} onChange={(e) => set("defaultVatRate", e.target.value)}
            >
              {VAT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {error && (
        <p className="text-[13px] px-4 py-3 rounded-[8px]" style={{ backgroundColor: "#FDECEA", color: "#C0392B" }}>
          {error}
        </p>
      )}

      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onCancel}
          className="flex-1 h-12 rounded-[8px] border text-[14px] font-medium"
          style={{ borderColor: "#E5E1DA", color: "#1A1A18", backgroundColor: "#FFFFFF" }}>
          Annuler
        </button>
        <button type="submit" disabled={loading}
          className="flex-1 h-12 rounded-[8px] text-[14px] font-medium text-white flex items-center justify-center gap-2 disabled:opacity-60"
          style={{ backgroundColor: "#1A1A18" }}>
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          {submitLabel}
        </button>
      </div>
    </form>
  );
}

// ─── Modal ────────────────────────────────────────────────────────────────────

function ModalWrapper({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full md:max-w-lg rounded-t-[20px] md:rounded-[16px] p-6 max-h-[90vh] overflow-y-auto"
        style={{ backgroundColor: "#FFFFFF" }}
      >
        {children}
      </div>
    </div>
  );
}

function ModalHeader({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <div className="flex items-center justify-between mb-6">
      <h2 className="text-[18px] font-semibold" style={{ color: "#1A1A18" }}>{title}</h2>
      <button onClick={onClose}
        className="w-8 h-8 flex items-center justify-center rounded-full"
        style={{ backgroundColor: "#F0EDE8", color: "#7A7570" }}>
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

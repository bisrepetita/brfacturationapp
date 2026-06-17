"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { Client, Service, InvoiceLine, DiscountType, Currency, ServiceUnit, VatRate } from "@/types";
import { calculateLine, calculateInvoiceTotals, calculateDueDate, formatAmount } from "@/lib/calculations";
import { createDraftInvoice, validateInvoice, CreateInvoiceData } from "@/lib/invoices";
import { getClients, getClient } from "@/lib/clients";
import { getServices } from "@/lib/services";
import { getBillingSettings } from "@/lib/settings";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  ChevronLeft, ChevronRight, Check, Plus, Trash2, Search,
  Loader2, X, Calendar
} from "lucide-react";
import { v4 as uuidv4 } from "uuid";

// ─── Types wizard ─────────────────────────────────────────────────────────────

type WizardStep = 1 | 2 | 3 | 4;

interface WizardState {
  // Étape 1
  selectedClient: Client | null;
  // Étape 2
  lines: InvoiceLine[];
  // Étape 3
  invoiceDate: string; // YYYY-MM-DD
  paymentDelayDays: number;
  currency: Currency;
  discountType: DiscountType;
  discountValue: string;
  paymentTermsText: string;
  additionalInfo: string;
}

const STEP_LABELS = ["Client", "Prestations", "Conditions", "Aperçu"];

// ─── Page principale ──────────────────────────────────────────────────────────

export default function NouvellePage() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedClientId = searchParams.get("clientId");

  const [step, setStep] = useState<WizardStep>(1);
  const [state, setState] = useState<WizardState>({
    selectedClient: null,
    lines: [],
    invoiceDate: format(new Date(), "yyyy-MM-dd"),
    paymentDelayDays: 10,
    currency: "CHF",
    discountType: "none",
    discountValue: "",
    paymentTermsText: "Payable dans les 10 jours",
    additionalInfo: "",
  });
  const [saving, setSaving] = useState(false);
  const [validating, setValidating] = useState(false);
  const [error, setError] = useState("");

  // Charger les settings par défaut au montage
  useState(() => {
    getBillingSettings().then((s) => {
      setState((prev) => ({
        ...prev,
        currency: s.defaultCurrency,
        paymentDelayDays: s.defaultPaymentDelayDays,
        paymentTermsText: s.defaultPaymentTermsText,
      }));
    });
  });

  // Pré-sélectionner le client si clientId dans l'URL
  useEffect(() => {
    if (!preselectedClientId) return;
    getClient(preselectedClientId).then((client) => {
      if (!client) return;
      setState((prev) => ({ ...prev, selectedClient: client }));
      setStep(2);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preselectedClientId]);

  const totals = calculateInvoiceTotals(
    state.lines,
    state.discountType,
    parseFloat(state.discountValue) || 0
  );

  const invoiceDate = new Date(state.invoiceDate + "T12:00:00");
  const dueDate = calculateDueDate(invoiceDate, state.paymentDelayDays);

  const canGoNext = () => {
    if (step === 1) return !!state.selectedClient;
    if (step === 2) return state.lines.length > 0;
    return true;
  };

  const buildInvoiceData = (): CreateInvoiceData => {
    const client = state.selectedClient!;
    return {
      status: "draft",
      clientId: client.id,
      clientSnapshot: {
        displayName: client.displayName,
        email: client.email,
        addressLine1: client.addressLine1,
        addressLine2: client.addressLine2,
        postalCode: client.postalCode,
        city: client.city,
        country: client.country,
        clientCode: client.clientCode,
      },
      invoiceDate,
      paymentDelayDays: state.paymentDelayDays,
      dueDate,
      currency: state.currency,
      lines: state.lines,
      discountType: state.discountType,
      discountValue: parseFloat(state.discountValue) || 0,
      ...totals,
      amountPaid: 0,
      paymentDate: null,
      paymentTermsText: state.paymentTermsText,
      additionalInfo: state.additionalInfo || null,
    };
  };

  const handleSaveDraft = async () => {
    if (!user) return;
    setSaving(true);
    setError("");
    try {
      await createDraftInvoice(buildInvoiceData(), user.uid);
      router.push("/factures");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur lors de la sauvegarde.");
    } finally {
      setSaving(false);
    }
  };

  const handleValidate = async (invoiceId?: string) => {
    if (!user) return;
    setValidating(true);
    setError("");
    try {
      let id = invoiceId;
      if (!id) {
        id = await createDraftInvoice(buildInvoiceData(), user.uid);
      }
      await validateInvoice(id, user.uid);
      router.push("/factures");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur lors de la validation.");
    } finally {
      setValidating(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#F9F8F6" }}>
      {/* Header */}
      <div
        className="sticky top-0 z-10 flex items-center gap-3 px-4 h-14 border-b"
        style={{ backgroundColor: "#FFFFFF", borderColor: "#E5E1DA" }}
      >
        <button
          onClick={() => step === 1 ? router.push("/factures") : setStep((s) => (s - 1) as WizardStep)}
          className="w-8 h-8 flex items-center justify-center rounded-full"
          style={{ backgroundColor: "#F0EDE8", color: "#7A7570" }}
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: "#A09890" }}>
            Nouvelle facture
          </p>
          <p className="text-[14px] font-medium" style={{ color: "#1A1A18" }}>
            {STEP_LABELS[step - 1]}
          </p>
        </div>
        {/* Progress dots */}
        <div className="flex items-center gap-1.5">
          {([1, 2, 3, 4] as WizardStep[]).map((s) => (
            <div
              key={s}
              className="rounded-full transition-all"
              style={{
                width: s === step ? 20 : 6,
                height: 6,
                backgroundColor: s === step ? "#1A1A18" : s < step ? "#C8C4BC" : "#E5E1DA",
              }}
            />
          ))}
        </div>
      </div>

      {/* Contenu de l'étape */}
      <div className="flex-1 overflow-y-auto p-4 pb-32">
        {step === 1 && (
          <Step1Client
            selected={state.selectedClient}
            onSelect={(client) => setState((s) => ({ ...s, selectedClient: client }))}
          />
        )}
        {step === 2 && (
          <Step2Lines
            lines={state.lines}
            currency={state.currency}
            onChange={(lines) => setState((s) => ({ ...s, lines }))}
          />
        )}
        {step === 3 && (
          <Step3Conditions
            state={state}
            dueDate={dueDate}
            onChange={(patch) => setState((s) => ({ ...s, ...patch }))}
          />
        )}
        {step === 4 && (
          <Step4Preview
            state={state}
            totals={totals}
            dueDate={dueDate}
            error={error}
            saving={saving}
            validating={validating}
            onSaveDraft={handleSaveDraft}
            onValidate={() => handleValidate()}
            onBack={() => setStep(3)}
          />
        )}
      </div>

      {/* Barre de navigation bas — visible étapes 1-3 */}
      {step < 4 && (
        <div
          className="fixed bottom-0 left-0 right-0 z-20 p-4 border-t"
          style={{ backgroundColor: "#FFFFFF", borderColor: "#E5E1DA" }}
        >
          {/* Résumé discret */}
          {state.selectedClient && (
            <div className="flex items-center justify-between mb-3 px-1">
              <span className="text-[13px] truncate" style={{ color: "#7A7570" }}>
                {state.selectedClient.displayName}
              </span>
              <span className="font-mono text-[14px] font-semibold" style={{ color: "#1A1A18" }}>
                {formatAmount(totals.totalInclVat, state.currency)}
              </span>
            </div>
          )}
          <button
            onClick={() => setStep((s) => (s + 1) as WizardStep)}
            disabled={!canGoNext()}
            className="w-full h-12 rounded-[8px] text-[14px] font-medium text-white flex items-center justify-center gap-2 disabled:opacity-40 transition-opacity"
            style={{ backgroundColor: "#1A1A18" }}
          >
            {step === 3 ? "Aperçu" : "Suivant"}
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Étape 1 — Client ─────────────────────────────────────────────────────────

function Step1Client({
  selected,
  onSelect,
}: {
  selected: Client | null;
  onSelect: (c: Client) => void;
}) {
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useState(() => {
    getClients().then((data) => {
      setClients(data);
      setLoading(false);
    });
  });

  const filtered = clients.filter((c) =>
    c.displayName.toLowerCase().includes(search.toLowerCase()) ||
    c.clientCode.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {selected && (
        <div
          className="rounded-[10px] border-2 p-4 flex items-center gap-3"
          style={{ borderColor: "#1A1A18", backgroundColor: "#FFFFFF" }}
        >
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-[13px] font-semibold shrink-0"
            style={{ backgroundColor: "#F0EDE8", color: "#7A7570" }}
          >
            {selected.displayName.substring(0, 2).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[14px] font-medium" style={{ color: "#1A1A18" }}>{selected.displayName}</p>
            <p className="text-[13px]" style={{ color: "#7A7570" }}>{selected.email}</p>
          </div>
          <Check className="w-5 h-5 shrink-0" style={{ color: "#1A1A18" }} />
        </div>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#A09890" }} />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher un client…"
          className="w-full h-12 pl-10 pr-4 rounded-[8px] border text-[14px] outline-none"
          style={{ backgroundColor: "#FFFFFF", borderColor: "#E5E1DA", color: "#1A1A18" }}
          onFocus={(e) => (e.target.style.borderColor = "#1A1A18")}
          onBlur={(e) => (e.target.style.borderColor = "#E5E1DA")}
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin" style={{ color: "#C8C4BC" }} />
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((client) => (
            <button
              key={client.id}
              onClick={() => onSelect(client)}
              className="w-full rounded-[10px] border p-4 flex items-center gap-3 text-left transition-colors"
              style={{
                borderColor: selected?.id === client.id ? "#1A1A18" : "#E5E1DA",
                backgroundColor: "#FFFFFF",
              }}
            >
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center text-[12px] font-semibold shrink-0"
                style={{ backgroundColor: "#F0EDE8", color: "#7A7570" }}
              >
                {client.displayName.substring(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-medium truncate" style={{ color: "#1A1A18" }}>{client.displayName}</p>
                <p className="text-[12px]" style={{ color: "#7A7570" }}>{client.clientCode}</p>
              </div>
              {selected?.id === client.id && <Check className="w-4 h-4 shrink-0" style={{ color: "#1A1A18" }} />}
            </button>
          ))}
          {filtered.length === 0 && !loading && (
            <p className="text-center py-8 text-[14px]" style={{ color: "#A09890" }}>
              Aucun client trouvé.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Étape 2 — Prestations ────────────────────────────────────────────────────

function Step2Lines({
  lines,
  currency,
  onChange,
}: {
  lines: InvoiceLine[];
  currency: Currency;
  onChange: (lines: InvoiceLine[]) => void;
}) {
  const [services, setServices] = useState<Service[]>([]);
  const [showServicePicker, setShowServicePicker] = useState(false);
  const [showMultiDate, setShowMultiDate] = useState<{ serviceId: string | null; service: Service } | null>(null);
  const [serviceSearch, setServiceSearch] = useState("");

  useState(() => {
    getServices().then(setServices);
  });

  const addLine = useCallback((patch: Partial<InvoiceLine>) => {
    const base: InvoiceLine = {
      id: uuidv4(),
      serviceId: null,
      description: "",
      quantity: 1,
      unit: "heure",
      unitPrice: 0,
      discountType: "none",
      discountValue: 0,
      vatApplicable: false,
      vatRate: null,
      lineTotalExclVat: 0,
      lineVatAmount: 0,
      lineTotalInclVat: 0,
      serviceDate: null,
      ...patch,
    };
    const calced = calculateLine(base);
    onChange([...lines, { ...base, ...calced }]);
  }, [lines, onChange]);

  const updateLine = useCallback((id: string, patch: Partial<InvoiceLine>) => {
    onChange(lines.map((l) => {
      if (l.id !== id) return l;
      const updated = { ...l, ...patch };
      const calced = calculateLine(updated);
      return { ...updated, ...calced };
    }));
  }, [lines, onChange]);

  const removeLine = useCallback((id: string) => {
    onChange(lines.filter((l) => l.id !== id));
  }, [lines, onChange]);

  const addFromService = (service: Service) => {
    addLine({
      serviceId: service.id,
      description: service.name,
      unit: service.unit,
      unitPrice: service.defaultPrice,
      vatApplicable: service.vatApplicable,
      vatRate: service.defaultVatRate,
    });
    setShowServicePicker(false);
    setServiceSearch("");
  };

  const addMultipleDates = (service: Service, dates: Date[]) => {
    const newLines: InvoiceLine[] = dates.map((date) => {
      const base: InvoiceLine = {
        id: uuidv4(),
        serviceId: service.id,
        description: `${service.name} du ${format(date, "dd.MM.yyyy", { locale: fr })}`,
        quantity: 1,
        unit: service.unit,
        unitPrice: service.defaultPrice,
        discountType: "none",
        discountValue: 0,
        vatApplicable: service.vatApplicable,
        vatRate: service.defaultVatRate,
        lineTotalExclVat: 0,
        lineVatAmount: 0,
        lineTotalInclVat: 0,
        serviceDate: date,
      };
      return { ...base, ...calculateLine(base) };
    });
    onChange([...lines, ...newLines]);
    setShowMultiDate(null);
  };

  const filteredServices = services.filter((s) =>
    s.name.toLowerCase().includes(serviceSearch.toLowerCase())
  );

  return (
    <div className="space-y-3">
      {lines.length === 0 && (
        <div
          className="rounded-[10px] border-2 border-dashed p-8 text-center"
          style={{ borderColor: "#E5E1DA" }}
        >
          <p className="text-[14px] mb-1" style={{ color: "#1A1A18" }}>Aucune prestation</p>
          <p className="text-[13px]" style={{ color: "#A09890" }}>Ajoutez des services ou des lignes libres</p>
        </div>
      )}

      {lines.map((line) => (
        <LineCard key={line.id} line={line} currency={currency} onUpdate={updateLine} onRemove={removeLine} />
      ))}

      {/* Boutons ajout */}
      <div className="grid grid-cols-2 gap-2 pt-2">
        <button
          onClick={() => setShowServicePicker(true)}
          className="h-12 rounded-[8px] border text-[13px] font-medium flex items-center justify-center gap-2"
          style={{ borderColor: "#E5E1DA", backgroundColor: "#FFFFFF", color: "#1A1A18" }}
        >
          <Plus className="w-4 h-4" />
          Service
        </button>
        <button
          onClick={() => addLine({})}
          className="h-12 rounded-[8px] border text-[13px] font-medium flex items-center justify-center gap-2"
          style={{ borderColor: "#E5E1DA", backgroundColor: "#FFFFFF", color: "#1A1A18" }}
        >
          <Plus className="w-4 h-4" />
          Ligne libre
        </button>
      </div>

      {/* Service picker */}
      {showServicePicker && (
        <ModalOverlay onClose={() => { setShowServicePicker(false); setServiceSearch(""); }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[16px] font-semibold" style={{ color: "#1A1A18" }}>Choisir un service</h3>
            <button onClick={() => { setShowServicePicker(false); setServiceSearch(""); }}
              className="w-7 h-7 flex items-center justify-center rounded-full"
              style={{ backgroundColor: "#F0EDE8", color: "#7A7570" }}>
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#A09890" }} />
            <input value={serviceSearch} onChange={(e) => setServiceSearch(e.target.value)}
              placeholder="Rechercher…" autoFocus
              className="w-full h-10 pl-9 pr-4 rounded-[8px] border text-[14px] outline-none"
              style={{ backgroundColor: "#F9F8F6", borderColor: "#E5E1DA", color: "#1A1A18" }}
              onFocus={(e) => (e.target.style.borderColor = "#1A1A18")}
              onBlur={(e) => (e.target.style.borderColor = "#E5E1DA")}
            />
          </div>
          <div className="space-y-1.5 max-h-64 overflow-y-auto">
            {filteredServices.map((s) => (
              <div key={s.id} className="flex items-center gap-2">
                <button
                  onClick={() => addFromService(s)}
                  className="flex-1 text-left px-3 py-2.5 rounded-[8px] text-[14px] transition-colors"
                  style={{ color: "#1A1A18" }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#F0EDE8")}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                >
                  <span className="font-medium">{s.name}</span>
                  <span className="ml-2 text-[13px]" style={{ color: "#7A7570" }}>
                    CHF {s.defaultPrice.toFixed(2)} / {s.unit}
                  </span>
                </button>
                <button
                  onClick={() => { setShowMultiDate({ serviceId: s.id, service: s }); setShowServicePicker(false); }}
                  title="Ajouter plusieurs dates"
                  className="h-8 px-2 rounded-[6px] text-[11px] font-medium flex items-center gap-1 shrink-0"
                  style={{ backgroundColor: "#F0EDE8", color: "#7A7570" }}
                >
                  <Calendar className="w-3.5 h-3.5" />
                  Multiple
                </button>
              </div>
            ))}
          </div>
        </ModalOverlay>
      )}

      {/* Multi-dates picker */}
      {showMultiDate && (
        <MultiDatePicker
          service={showMultiDate.service}
          onConfirm={addMultipleDates}
          onClose={() => setShowMultiDate(null)}
        />
      )}
    </div>
  );
}

// ─── LineCard ─────────────────────────────────────────────────────────────────

function LineCard({
  line,
  currency,
  onUpdate,
  onRemove,
}: {
  line: InvoiceLine;
  currency: Currency;
  onUpdate: (id: string, patch: Partial<InvoiceLine>) => void;
  onRemove: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(!line.description);

  const inputStyle = {
    backgroundColor: "#F9F8F6",
    borderColor: "#E5E1DA",
    color: "#1A1A18",
  };

  return (
    <div className="rounded-[10px] border" style={{ borderColor: "#E5E1DA", backgroundColor: "#FFFFFF" }}>
      <div className="p-3 flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <input
            value={line.description}
            onChange={(e) => onUpdate(line.id, { description: e.target.value })}
            placeholder="Description de la prestation"
            className="w-full text-[14px] font-medium outline-none bg-transparent"
            style={{ color: "#1A1A18" }}
          />
          <div className="flex items-center gap-2 mt-1.5">
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={line.quantity}
              onChange={(e) => onUpdate(line.id, { quantity: parseFloat(e.target.value) || 1 })}
              className="w-14 h-8 px-2 rounded-[6px] border text-[13px] text-center outline-none"
              style={inputStyle}
            />
            <span className="text-[13px]" style={{ color: "#7A7570" }}>×</span>
            <input
              type="number"
              min="0"
              step="0.05"
              value={line.unitPrice}
              onChange={(e) => onUpdate(line.id, { unitPrice: parseFloat(e.target.value) || 0 })}
              className="w-20 h-8 px-2 rounded-[6px] border text-[13px] outline-none"
              style={inputStyle}
            />
            <button
              onClick={() => setExpanded((v) => !v)}
              className="text-[11px] px-2 h-8 rounded-[6px]"
              style={{ backgroundColor: "#F0EDE8", color: "#7A7570" }}
            >
              {expanded ? "Moins" : "Options"}
            </button>
          </div>
          {expanded && (
            <div className="mt-2 space-y-2">
              <div className="flex items-center gap-2">
                <select
                  value={line.unit}
                  onChange={(e) => onUpdate(line.id, { unit: e.target.value as ServiceUnit })}
                  className="h-8 px-2 rounded-[6px] border text-[13px] outline-none appearance-none flex-1"
                  style={inputStyle}
                >
                  <option value="heure">Heure</option>
                  <option value="seance">Séance</option>
                  <option value="forfait">Forfait</option>
                </select>
                <select
                  value={`${line.discountType}:${line.discountValue}`}
                  onChange={(e) => {
                    const [type, val] = e.target.value.split(":");
                    onUpdate(line.id, { discountType: type as DiscountType, discountValue: parseFloat(val) || 0 });
                  }}
                  className="h-8 px-2 rounded-[6px] border text-[13px] outline-none appearance-none flex-1"
                  style={inputStyle}
                >
                  <option value="none:0">Sans rabais</option>
                  <option value="percent:5">-5%</option>
                  <option value="percent:10">-10%</option>
                  <option value="percent:15">-15%</option>
                  <option value="percent:20">-20%</option>
                </select>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={line.vatApplicable}
                  onChange={(e) => onUpdate(line.id, { vatApplicable: e.target.checked })}
                  className="w-4 h-4 rounded"
                />
                <span className="text-[13px]" style={{ color: "#1A1A18" }}>TVA</span>
                {line.vatApplicable && (
                  <select
                    value={String(line.vatRate ?? "")}
                    onChange={(e) => onUpdate(line.id, { vatRate: e.target.value ? parseFloat(e.target.value) as VatRate : null })}
                    className="h-7 px-2 rounded-[6px] border text-[13px] outline-none appearance-none"
                    style={inputStyle}
                  >
                    <option value="">0%</option>
                    <option value="2.6">2.6%</option>
                    <option value="8.1">8.1%</option>
                  </select>
                )}
              </label>
            </div>
          )}
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <span className="font-mono text-[14px] font-semibold" style={{ color: "#1A1A18" }}>
            {formatAmount(line.lineTotalInclVat, currency)}
          </span>
          <button onClick={() => onRemove(line.id)} title="Supprimer"
            className="w-7 h-7 flex items-center justify-center rounded-[6px]"
            style={{ color: "#C0392B" }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#FDECEA")}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── MultiDatePicker ──────────────────────────────────────────────────────────

function MultiDatePicker({
  service,
  onConfirm,
  onClose,
}: {
  service: Service;
  onConfirm: (service: Service, dates: Date[]) => void;
  onClose: () => void;
}) {
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  const toggleDate = (dateStr: string) => {
    setSelectedDates((prev) =>
      prev.includes(dateStr) ? prev.filter((d) => d !== dateStr) : [...prev, dateStr].sort()
    );
  };

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDay = (new Date(viewYear, viewMonth, 1).getDay() + 6) % 7; // Lundi = 0

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear((y) => y - 1); setViewMonth(11); }
    else setViewMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear((y) => y + 1); setViewMonth(0); }
    else setViewMonth((m) => m + 1);
  };

  const monthStr = new Date(viewYear, viewMonth).toLocaleDateString("fr-CH", { month: "long", year: "numeric" });

  return (
    <ModalOverlay onClose={onClose}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[16px] font-semibold" style={{ color: "#1A1A18" }}>{service.name}</h3>
        <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-full" style={{ backgroundColor: "#F0EDE8", color: "#7A7570" }}>
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
      <p className="text-[13px] mb-4" style={{ color: "#7A7570" }}>Sélectionnez plusieurs dates pour créer une ligne par date.</p>

      {/* Navigation mois */}
      <div className="flex items-center justify-between mb-3">
        <button onClick={prevMonth} className="w-8 h-8 flex items-center justify-center rounded-[6px]" style={{ backgroundColor: "#F0EDE8", color: "#7A7570" }}>
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-[14px] font-medium capitalize" style={{ color: "#1A1A18" }}>{monthStr}</span>
        <button onClick={nextMonth} className="w-8 h-8 flex items-center justify-center rounded-[6px]" style={{ backgroundColor: "#F0EDE8", color: "#7A7570" }}>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Jours semaine */}
      <div className="grid grid-cols-7 mb-1">
        {["L", "M", "M", "J", "V", "S", "D"].map((d, i) => (
          <div key={i} className="text-center text-[11px] font-semibold py-1" style={{ color: "#A09890" }}>{d}</div>
        ))}
      </div>

      {/* Grille jours */}
      <div className="grid grid-cols-7 gap-0.5">
        {Array.from({ length: firstDay }).map((_, i) => <div key={`empty-${i}`} />)}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const selected = selectedDates.includes(dateStr);
          return (
            <button
              key={day}
              onClick={() => toggleDate(dateStr)}
              className="aspect-square rounded-[6px] text-[13px] font-medium transition-colors"
              style={{
                backgroundColor: selected ? "#1A1A18" : "transparent",
                color: selected ? "#FFFFFF" : "#1A1A18",
              }}
              onMouseEnter={(e) => { if (!selected) e.currentTarget.style.backgroundColor = "#F0EDE8"; }}
              onMouseLeave={(e) => { if (!selected) e.currentTarget.style.backgroundColor = "transparent"; }}
            >
              {day}
            </button>
          );
        })}
      </div>

      {selectedDates.length > 0 && (
        <div className="mt-3 text-[13px]" style={{ color: "#7A7570" }}>
          {selectedDates.length} date{selectedDates.length > 1 ? "s" : ""} sélectionnée{selectedDates.length > 1 ? "s" : ""}
        </div>
      )}

      <button
        onClick={() => {
          const dates = selectedDates.map((d) => new Date(d + "T12:00:00"));
          onConfirm(service, dates);
        }}
        disabled={selectedDates.length === 0}
        className="w-full h-12 mt-4 rounded-[8px] text-[14px] font-medium text-white disabled:opacity-40"
        style={{ backgroundColor: "#1A1A18" }}
      >
        Ajouter {selectedDates.length > 0 ? `${selectedDates.length} ligne${selectedDates.length > 1 ? "s" : ""}` : ""}
      </button>
    </ModalOverlay>
  );
}

// ─── Étape 3 — Conditions ─────────────────────────────────────────────────────

function Step3Conditions({
  state,
  dueDate,
  onChange,
}: {
  state: WizardState;
  dueDate: Date;
  onChange: (patch: Partial<WizardState>) => void;
}) {
  const inputClass = "w-full h-12 px-4 rounded-[8px] border text-[14px] outline-none";
  const inputStyle = { backgroundColor: "#FFFFFF", borderColor: "#E5E1DA", color: "#1A1A18" };
  const fi = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => (e.target.style.borderColor = "#1A1A18");
  const fo = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => (e.target.style.borderColor = "#E5E1DA");

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="block text-[13px] font-medium" style={{ color: "#1A1A18" }}>Date de facture</label>
          <input type="date" className={inputClass} style={inputStyle} onFocus={fi} onBlur={fo}
            value={state.invoiceDate}
            onChange={(e) => onChange({ invoiceDate: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <label className="block text-[13px] font-medium" style={{ color: "#1A1A18" }}>Délai (jours)</label>
          <input type="number" min="0" className={inputClass} style={inputStyle} onFocus={fi} onBlur={fo}
            value={state.paymentDelayDays}
            onChange={(e) => onChange({ paymentDelayDays: parseInt(e.target.value) || 0 })} />
        </div>
      </div>

      <div
        className="rounded-[8px] px-4 py-3 text-[13px]"
        style={{ backgroundColor: "#F0EDE8", color: "#7A7570" }}
      >
        Échéance : <strong style={{ color: "#1A1A18" }}>{format(dueDate, "dd MMMM yyyy", { locale: fr })}</strong>
      </div>

      <div className="space-y-1.5">
        <label className="block text-[13px] font-medium" style={{ color: "#1A1A18" }}>Devise</label>
        <select className={inputClass + " appearance-none"} style={inputStyle} onFocus={fi} onBlur={fo}
          value={state.currency}
          onChange={(e) => onChange({ currency: e.target.value as Currency })}>
          <option value="CHF">CHF — Franc suisse</option>
          <option value="EUR">EUR — Euro</option>
        </select>
      </div>

      <div className="space-y-1.5">
        <label className="block text-[13px] font-medium" style={{ color: "#1A1A18" }}>Rabais global</label>
        <div className="flex gap-2">
          <select
            value={state.discountType}
            onChange={(e) => onChange({ discountType: e.target.value as DiscountType })}
            className="h-12 px-3 rounded-[8px] border text-[14px] outline-none appearance-none"
            style={{ ...inputStyle, width: 130 }}
            onFocus={fi} onBlur={fo}
          >
            <option value="none">Aucun</option>
            <option value="percent">%</option>
            <option value="amount">CHF</option>
          </select>
          {state.discountType !== "none" && (
            <input type="number" min="0" step="0.01" className={inputClass} style={inputStyle} onFocus={fi} onBlur={fo}
              value={state.discountValue}
              onChange={(e) => onChange({ discountValue: e.target.value })}
              placeholder={state.discountType === "percent" ? "10" : "50.00"} />
          )}
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="block text-[13px] font-medium" style={{ color: "#1A1A18" }}>Conditions de paiement</label>
        <input className={inputClass} style={inputStyle} onFocus={fi} onBlur={fo}
          value={state.paymentTermsText}
          onChange={(e) => onChange({ paymentTermsText: e.target.value })} />
      </div>

      <div className="space-y-1.5">
        <label className="block text-[13px] font-medium" style={{ color: "#1A1A18" }}>Informations supplémentaires</label>
        <textarea rows={3}
          className="w-full px-4 py-3 rounded-[8px] border text-[14px] outline-none resize-none"
          style={inputStyle} onFocus={fi} onBlur={fo}
          value={state.additionalInfo}
          onChange={(e) => onChange({ additionalInfo: e.target.value })}
          placeholder="Optionnel…" />
      </div>
    </div>
  );
}

// ─── Étape 4 — Aperçu ────────────────────────────────────────────────────────

function Step4Preview({
  state,
  totals,
  dueDate,
  error,
  saving,
  validating,
  onSaveDraft,
  onValidate,
  onBack,
}: {
  state: WizardState;
  totals: { subtotalExclVat: number; totalVat: number; totalInclVat: number };
  dueDate: Date;
  error: string;
  saving: boolean;
  validating: boolean;
  onSaveDraft: () => void;
  onValidate: () => void;
  onBack: () => void;
}) {
  const client = state.selectedClient!;
  const invoiceDate = new Date(state.invoiceDate + "T12:00:00");

  return (
    <div className="space-y-4">
      {/* Aperçu facture */}
      <div className="rounded-[10px] border overflow-hidden" style={{ borderColor: "#E5E1DA", backgroundColor: "#FFFFFF" }}>
        {/* En-tête */}
        <div className="p-5 border-b" style={{ borderColor: "#E5E1DA" }}>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest mb-1" style={{ color: "#A09890" }}>Facture</p>
              <p className="text-[20px] font-bold" style={{ color: "#1A1A18" }}>Brouillon</p>
            </div>
            <div className="text-right">
              <p className="text-[12px]" style={{ color: "#7A7570" }}>
                {format(invoiceDate, "dd.MM.yyyy", { locale: fr })}
              </p>
              <p className="text-[12px]" style={{ color: "#7A7570" }}>
                Éch. {format(dueDate, "dd.MM.yyyy", { locale: fr })}
              </p>
            </div>
          </div>
        </div>

        {/* Client */}
        <div className="px-5 py-4 border-b" style={{ borderColor: "#E5E1DA" }}>
          <p className="text-[11px] font-semibold uppercase tracking-widest mb-1.5" style={{ color: "#A09890" }}>Facturé à</p>
          <p className="text-[14px] font-medium" style={{ color: "#1A1A18" }}>{client.displayName}</p>
          <p className="text-[13px]" style={{ color: "#7A7570" }}>{client.addressLine1}</p>
          <p className="text-[13px]" style={{ color: "#7A7570" }}>{client.postalCode} {client.city}</p>
        </div>

        {/* Lignes */}
        <div className="px-5 py-4 border-b" style={{ borderColor: "#E5E1DA" }}>
          <p className="text-[11px] font-semibold uppercase tracking-widest mb-3" style={{ color: "#A09890" }}>Prestations</p>
          <div className="space-y-2">
            {state.lines.map((line) => (
              <div key={line.id} className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-[13px]" style={{ color: "#1A1A18" }}>{line.description}</p>
                  <p className="text-[12px]" style={{ color: "#A09890" }}>
                    {line.quantity} × {state.currency} {line.unitPrice.toFixed(2)}
                    {line.vatApplicable && line.vatRate ? ` + TVA ${line.vatRate}%` : ""}
                  </p>
                </div>
                <span className="font-mono text-[13px] font-medium shrink-0" style={{ color: "#1A1A18" }}>
                  {state.currency} {line.lineTotalInclVat.toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Totaux */}
        <div className="px-5 py-4">
          {totals.totalVat > 0 && (
            <>
              <div className="flex justify-between text-[13px] mb-1">
                <span style={{ color: "#7A7570" }}>Sous-total HT</span>
                <span className="font-mono" style={{ color: "#1A1A18" }}>{state.currency} {totals.subtotalExclVat.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-[13px] mb-2">
                <span style={{ color: "#7A7570" }}>TVA</span>
                <span className="font-mono" style={{ color: "#1A1A18" }}>{state.currency} {totals.totalVat.toFixed(2)}</span>
              </div>
            </>
          )}
          <div className="flex justify-between items-baseline pt-2 border-t" style={{ borderColor: "#E5E1DA" }}>
            <span className="text-[14px] font-semibold" style={{ color: "#1A1A18" }}>Total TTC</span>
            <span className="font-mono text-[22px] font-bold" style={{ color: "#1A1A18" }}>
              {state.currency} {totals.totalInclVat.toFixed(2)}
            </span>
          </div>
          <p className="text-[12px] mt-2" style={{ color: "#A09890" }}>{state.paymentTermsText}</p>
        </div>
      </div>

      {error && (
        <p className="text-[13px] px-4 py-3 rounded-[8px]" style={{ backgroundColor: "#FDECEA", color: "#C0392B" }}>
          {error}
        </p>
      )}

      {/* Actions */}
      <div className="space-y-2 pb-8">
        <button
          onClick={onValidate}
          disabled={validating || saving}
          className="w-full h-12 rounded-[8px] text-[14px] font-medium text-white flex items-center justify-center gap-2 disabled:opacity-50"
          style={{ backgroundColor: "#1A1A18" }}
        >
          {validating && <Loader2 className="w-4 h-4 animate-spin" />}
          Valider la facture
        </button>
        <button
          onClick={onSaveDraft}
          disabled={saving || validating}
          className="w-full h-12 rounded-[8px] border text-[14px] font-medium flex items-center justify-center gap-2 disabled:opacity-50"
          style={{ borderColor: "#E5E1DA", color: "#1A1A18", backgroundColor: "#FFFFFF" }}
        >
          {saving && <Loader2 className="w-4 h-4 animate-spin" />}
          Enregistrer comme brouillon
        </button>
        <button
          onClick={onBack}
          className="w-full h-10 text-[13px]"
          style={{ color: "#7A7570" }}
        >
          Retour
        </button>
      </div>
    </div>
  );
}

// ─── ModalOverlay ─────────────────────────────────────────────────────────────

function ModalOverlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center"
      style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full md:max-w-md rounded-t-[20px] md:rounded-[16px] p-5 max-h-[85vh] overflow-y-auto"
        style={{ backgroundColor: "#FFFFFF" }}
      >
        {children}
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { Client, ClientType } from "@/types";
import { generateClientCode } from "@/lib/client-code";
import { Loader2 } from "lucide-react";

type ClientFormData = {
  type: ClientType;
  firstName: string;
  lastName: string;
  companyName: string;
  email: string;
  addressLine1: string;
  addressLine2: string;
  postalCode: string;
  city: string;
  country: string;
};

const EMPTY: ClientFormData = {
  type: "person",
  firstName: "",
  lastName: "",
  companyName: "",
  email: "",
  addressLine1: "",
  addressLine2: "",
  postalCode: "",
  city: "",
  country: "CH",
};

function fromClient(client: Client): ClientFormData {
  return {
    type: client.type,
    firstName: client.firstName || "",
    lastName: client.lastName || "",
    companyName: client.companyName || "",
    email: client.email,
    addressLine1: client.addressLine1,
    addressLine2: client.addressLine2 || "",
    postalCode: client.postalCode,
    city: client.city,
    country: client.country,
  };
}

interface ClientFormProps {
  initial?: Client;
  onSubmit: (data: {
    type: ClientType;
    firstName: string | null;
    lastName: string | null;
    companyName: string | null;
    displayName: string;
    email: string;
    addressLine1: string;
    addressLine2: string | null;
    postalCode: string;
    city: string;
    country: string;
    clientCode: string;
  }) => Promise<void>;
  onCancel: () => void;
  submitLabel?: string;
}

export function ClientForm({
  initial,
  onSubmit,
  onCancel,
  submitLabel = "Enregistrer",
}: ClientFormProps) {
  const [form, setForm] = useState<ClientFormData>(
    initial ? fromClient(initial) : EMPTY
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const set = (key: keyof ClientFormData, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!form.email) { setError("L'email est requis."); return; }
    if (form.type === "person" && !form.lastName) { setError("Le nom est requis."); return; }
    if (form.type === "company" && !form.companyName) { setError("Le nom de la société est requis."); return; }

    setLoading(true);
    try {
      const displayName =
        form.type === "company"
          ? form.companyName
          : [form.firstName, form.lastName].filter(Boolean).join(" ");

      const clientCode =
        initial?.clientCode ||
        (await generateClientCode(form.lastName || null, form.companyName || null));

      await onSubmit({
        type: form.type,
        firstName: form.type === "person" ? form.firstName || null : null,
        lastName: form.type === "person" ? form.lastName || null : null,
        companyName: form.type === "company" ? form.companyName || null : null,
        displayName,
        email: form.email,
        addressLine1: form.addressLine1,
        addressLine2: form.addressLine2 || null,
        postalCode: form.postalCode,
        city: form.city,
        country: form.country,
        clientCode,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue.");
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full h-12 px-4 rounded-[8px] border text-[14px] outline-none transition-colors";
  const inputStyle = { backgroundColor: "#FFFFFF", borderColor: "#E5E1DA", color: "#1A1A18" };
  const focusHandlers = {
    onFocus: (e: React.FocusEvent<HTMLInputElement>) => (e.target.style.borderColor = "#1A1A18"),
    onBlur: (e: React.FocusEvent<HTMLInputElement>) => (e.target.style.borderColor = "#E5E1DA"),
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Type */}
      <div className="space-y-1.5">
        <label className="block text-[11px] font-semibold uppercase tracking-widest" style={{ color: "#7A7570" }}>
          Type de client
        </label>
        <div className="grid grid-cols-2 gap-2">
          {(["person", "company"] as ClientType[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => set("type", t)}
              className="h-12 rounded-[8px] border text-[14px] font-medium transition-colors"
              style={{
                backgroundColor: form.type === t ? "#1A1A18" : "#FFFFFF",
                borderColor: form.type === t ? "#1A1A18" : "#E5E1DA",
                color: form.type === t ? "#FFFFFF" : "#1A1A18",
              }}
            >
              {t === "person" ? "Personne" : "Société"}
            </button>
          ))}
        </div>
      </div>

      {form.type === "person" ? (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="block text-[13px] font-medium" style={{ color: "#1A1A18" }}>Prénom</label>
            <input className={inputClass} style={inputStyle} {...focusHandlers} value={form.firstName} onChange={(e) => set("firstName", e.target.value)} placeholder="Jean" />
          </div>
          <div className="space-y-1.5">
            <label className="block text-[13px] font-medium" style={{ color: "#1A1A18" }}>Nom *</label>
            <input className={inputClass} style={inputStyle} {...focusHandlers} value={form.lastName} onChange={(e) => set("lastName", e.target.value)} placeholder="Martin" required />
          </div>
        </div>
      ) : (
        <div className="space-y-1.5">
          <label className="block text-[13px] font-medium" style={{ color: "#1A1A18" }}>Nom de la société *</label>
          <input className={inputClass} style={inputStyle} {...focusHandlers} value={form.companyName} onChange={(e) => set("companyName", e.target.value)} placeholder="Dupont SA" required />
        </div>
      )}

      <div className="space-y-1.5">
        <label className="block text-[13px] font-medium" style={{ color: "#1A1A18" }}>Email *</label>
        <input type="email" className={inputClass} style={inputStyle} {...focusHandlers} value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="client@exemple.ch" required />
      </div>

      <div className="space-y-1.5">
        <label className="block text-[13px] font-medium" style={{ color: "#1A1A18" }}>Adresse</label>
        <input className={inputClass} style={inputStyle} {...focusHandlers} value={form.addressLine1} onChange={(e) => set("addressLine1", e.target.value)} placeholder="Rue de la Paix 1" />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1.5">
          <label className="block text-[13px] font-medium" style={{ color: "#1A1A18" }}>NPA</label>
          <input className={inputClass} style={inputStyle} {...focusHandlers} value={form.postalCode} onChange={(e) => set("postalCode", e.target.value)} placeholder="1000" />
        </div>
        <div className="col-span-2 space-y-1.5">
          <label className="block text-[13px] font-medium" style={{ color: "#1A1A18" }}>Ville</label>
          <input className={inputClass} style={inputStyle} {...focusHandlers} value={form.city} onChange={(e) => set("city", e.target.value)} placeholder="Lausanne" />
        </div>
      </div>

      {error && (
        <p className="text-[13px] px-4 py-3 rounded-[8px]" style={{ backgroundColor: "#FDECEA", color: "#C0392B" }}>
          {error}
        </p>
      )}

      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 h-12 rounded-[8px] border text-[14px] font-medium"
          style={{ borderColor: "#E5E1DA", color: "#1A1A18", backgroundColor: "#FFFFFF" }}
        >
          Annuler
        </button>
        <button
          type="submit"
          disabled={loading}
          className="flex-1 h-12 rounded-[8px] text-[14px] font-medium text-white flex items-center justify-center gap-2 disabled:opacity-60"
          style={{ backgroundColor: "#1A1A18" }}
        >
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          {submitLabel}
        </button>
      </div>
    </form>
  );
}

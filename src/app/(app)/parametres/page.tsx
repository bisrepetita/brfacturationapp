"use client";

import { useEffect, useRef, useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { useBillingSettings, useEmailSettings } from "@/hooks/use-settings";
import { saveBillingSettings, saveEmailSettings } from "@/lib/settings";
import { getUsers, getInvites, createInvite, removeUser, removeInvite, Invite } from "@/lib/users";
import { BillingSettings, EmailSettings, VatRate, User, UserRole } from "@/types";
import { useAuth } from "@/contexts/auth-context";
import { storage } from "@/lib/firebase";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { Check, Loader2, Trash2, UserPlus, ImagePlus, X } from "lucide-react";

type Tab = "societe" | "banque" | "facturation" | "emails" | "utilisateurs";

const BASE_TABS: { id: Tab; label: string }[] = [
  { id: "societe", label: "Société" },
  { id: "banque", label: "Banque" },
  { id: "facturation", label: "Facturation" },
  { id: "emails", label: "Emails" },
];

export default function ParametresPage() {
  const { user: currentUser } = useAuth();
  const isSuperadmin = currentUser?.role === "superadmin";

  const TABS = isSuperadmin
    ? [...BASE_TABS, { id: "utilisateurs" as Tab, label: "Utilisateurs" }]
    : BASE_TABS;

  const [activeTab, setActiveTab] = useState<Tab>("societe");
  const { settings: billing, setSettings: setBilling, loading: loadingBilling } = useBillingSettings();
  const { settings: email, setSettings: setEmail, loading: loadingEmail } = useEmailSettings();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      if (billing) await saveBillingSettings(billing);
      if (email) await saveEmailSettings(email);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } finally {
      setSaving(false);
    }
  };

  const loading = loadingBilling || loadingEmail;
  const isSettingsTab = activeTab !== "utilisateurs";

  return (
    <main className="p-4 md:p-8 max-w-2xl mx-auto" style={{ minHeight: "100vh" }}>
      <PageHeader
        title="Paramètres"
        action={
          isSettingsTab ? (
            <button
              onClick={handleSave}
              disabled={saving || loading}
              className="flex items-center gap-2 h-10 px-4 rounded-[8px] text-[13px] font-medium text-white transition-opacity disabled:opacity-50"
              style={{ backgroundColor: "#1A1A18" }}
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : saved ? (
                <Check className="w-4 h-4" />
              ) : null}
              {saved ? "Enregistré" : "Enregistrer"}
            </button>
          ) : undefined
        }
      />

      {/* Onglets */}
      <div className="flex gap-1 mb-6 overflow-x-auto pb-1">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="px-4 py-2 rounded-[8px] text-[13px] font-medium whitespace-nowrap transition-colors"
            style={{
              backgroundColor: activeTab === tab.id ? "#1A1A18" : "transparent",
              color: activeTab === tab.id ? "#FFFFFF" : "#7A7570",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "utilisateurs" ? (
        <UtilisateursSection />
      ) : loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin" style={{ color: "#C8C4BC" }} />
        </div>
      ) : (
        <div className="space-y-6">
          {activeTab === "societe" && billing && (
            <SocieteSection billing={billing} onChange={setBilling as (v: BillingSettings) => void} />
          )}
          {activeTab === "banque" && billing && (
            <BanqueSection billing={billing} onChange={setBilling as (v: BillingSettings) => void} />
          )}
          {activeTab === "facturation" && billing && (
            <FacturationSection billing={billing} onChange={setBilling as (v: BillingSettings) => void} />
          )}
          {activeTab === "emails" && email && (
            <EmailsSection email={email} onChange={setEmail as (v: EmailSettings) => void} />
          )}
        </div>
      )}
    </main>
  );
}

// ─── Section Utilisateurs ─────────────────────────────────────────────────────

function UtilisateursSection() {
  const [users, setUsers] = useState<User[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState<UserRole>("admin");
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState("");

  const reload = async () => {
    setLoadingData(true);
    const [u, i] = await Promise.all([getUsers(), getInvites()]);
    setUsers(u);
    setInvites(i);
    setLoadingData(false);
  };

  useEffect(() => { reload(); }, []);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteError("");
    if (!newEmail || !newName) { setInviteError("Email et nom requis."); return; }
    setInviting(true);
    try {
      await createInvite(newEmail.toLowerCase().trim(), newName.trim(), newRole);
      setNewEmail(""); setNewName(""); setNewRole("admin");
      await reload();
    } catch {
      setInviteError("Erreur lors de l'invitation.");
    } finally {
      setInviting(false);
    }
  };

  const handleRemoveUser = async (uid: string) => {
    await removeUser(uid);
    await reload();
  };

  const handleRemoveInvite = async (email: string) => {
    await removeInvite(email);
    await reload();
  };

  if (loadingData) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: "#C8C4BC" }} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Utilisateurs actifs */}
      <div className="rounded-[10px] border overflow-hidden" style={{ borderColor: "#E5E1DA" }}>
        <div className="px-4 py-3 border-b" style={{ borderColor: "#E5E1DA", backgroundColor: "#FFFFFF" }}>
          <h2 className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: "#7A7570" }}>
            Utilisateurs actifs
          </h2>
        </div>
        {users.length === 0 ? (
          <p className="px-4 py-6 text-[13px]" style={{ color: "#7A7570" }}>Aucun utilisateur.</p>
        ) : (
          <ul>
            {users.map((u) => (
              <li
                key={u.uid}
                className="flex items-center justify-between gap-3 px-4 py-3 border-b last:border-0"
                style={{ borderColor: "#E5E1DA", backgroundColor: "#FFFFFF" }}
              >
                <div className="min-w-0">
                  <p className="text-[14px] font-medium truncate" style={{ color: "#1A1A18" }}>{u.displayName}</p>
                  <p className="text-[12px] truncate" style={{ color: "#7A7570" }}>{u.email}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span
                    className="px-2 py-0.5 rounded text-[11px] font-semibold uppercase"
                    style={{
                      backgroundColor: u.role === "superadmin" ? "#C8A96E20" : "#F0EDE8",
                      color: u.role === "superadmin" ? "#C8A96E" : "#7A7570",
                    }}
                  >
                    {u.role}
                  </span>
                  {u.role !== "superadmin" && (
                    <button
                      onClick={() => handleRemoveUser(u.uid)}
                      className="p-1.5 rounded hover:bg-red-50 transition-colors"
                      title="Supprimer l'accès"
                    >
                      <Trash2 className="w-4 h-4" style={{ color: "#C0392B" }} />
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Invitations en attente */}
      {invites.length > 0 && (
        <div className="rounded-[10px] border overflow-hidden" style={{ borderColor: "#E5E1DA" }}>
          <div className="px-4 py-3 border-b" style={{ borderColor: "#E5E1DA", backgroundColor: "#FFFFFF" }}>
            <h2 className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: "#7A7570" }}>
              Invitations en attente
            </h2>
          </div>
          <ul>
            {invites.map((inv) => (
              <li
                key={inv.email}
                className="flex items-center justify-between gap-3 px-4 py-3 border-b last:border-0"
                style={{ borderColor: "#E5E1DA", backgroundColor: "#FFFFFF" }}
              >
                <div className="min-w-0">
                  <p className="text-[14px] font-medium truncate" style={{ color: "#1A1A18" }}>{inv.displayName}</p>
                  <p className="text-[12px] truncate" style={{ color: "#7A7570" }}>{inv.email}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span
                    className="px-2 py-0.5 rounded text-[11px] font-semibold uppercase"
                    style={{ backgroundColor: "#F0EDE8", color: "#7A7570" }}
                  >
                    {inv.role}
                  </span>
                  <button
                    onClick={() => handleRemoveInvite(inv.email)}
                    className="p-1.5 rounded hover:bg-red-50 transition-colors"
                    title="Annuler l'invitation"
                  >
                    <Trash2 className="w-4 h-4" style={{ color: "#C0392B" }} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Inviter un utilisateur */}
      <div
        className="rounded-[10px] border p-4 space-y-4"
        style={{ borderColor: "#E5E1DA", backgroundColor: "#FFFFFF" }}
      >
        <h2 className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: "#7A7570" }}>
          Inviter un utilisateur
        </h2>
        <form onSubmit={handleInvite} className="space-y-3">
          <div className="space-y-1.5">
            <label className="block text-[13px] font-medium" style={{ color: "#1A1A18" }}>Nom affiché</label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Prénom Nom"
              className="w-full h-12 px-4 rounded-[8px] border text-[14px] outline-none transition-colors"
              style={{ backgroundColor: "#FFFFFF", borderColor: "#E5E1DA", color: "#1A1A18" }}
              onFocus={(e) => (e.target.style.borderColor = "#1A1A18")}
              onBlur={(e) => (e.target.style.borderColor = "#E5E1DA")}
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-[13px] font-medium" style={{ color: "#1A1A18" }}>Email</label>
            <input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="utilisateur@exemple.ch"
              className="w-full h-12 px-4 rounded-[8px] border text-[14px] outline-none transition-colors"
              style={{ backgroundColor: "#FFFFFF", borderColor: "#E5E1DA", color: "#1A1A18" }}
              onFocus={(e) => (e.target.style.borderColor = "#1A1A18")}
              onBlur={(e) => (e.target.style.borderColor = "#E5E1DA")}
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-[13px] font-medium" style={{ color: "#1A1A18" }}>Rôle</label>
            <select
              value={newRole}
              onChange={(e) => setNewRole(e.target.value as UserRole)}
              className="w-full h-12 px-4 rounded-[8px] border text-[14px] outline-none appearance-none cursor-pointer"
              style={{ backgroundColor: "#FFFFFF", borderColor: "#E5E1DA", color: "#1A1A18" }}
            >
              <option value="admin">Admin</option>
              <option value="viewer">Lecteur</option>
            </select>
          </div>

          {inviteError && (
            <p className="text-[13px] px-3 py-2 rounded-[8px]" style={{ backgroundColor: "#FDECEA", color: "#C0392B" }}>
              {inviteError}
            </p>
          )}

          <button
            type="submit"
            disabled={inviting}
            className="flex items-center gap-2 h-10 px-4 rounded-[8px] text-[13px] font-medium text-white transition-opacity disabled:opacity-50"
            style={{ backgroundColor: "#1A1A18" }}
          >
            {inviting ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
            Inviter
          </button>
        </form>
      </div>

      <div
        className="rounded-[10px] p-4 text-[13px]"
        style={{ backgroundColor: "#F0EDE8", color: "#7A7570" }}
      >
        L&apos;utilisateur invité pourra se connecter avec cet email. Son compte sera créé automatiquement lors de sa première connexion.
      </div>
    </div>
  );
}

// ─── Section Société ──────────────────────────────────────────────────────────

function SocieteSection({
  billing,
  onChange,
}: {
  billing: BillingSettings;
  onChange: (v: BillingSettings) => void;
}) {
  const set = (key: keyof BillingSettings, value: string | null) =>
    onChange({ ...billing, [key]: value });

  return (
    <Section title="Informations société">
      <Field label="Logo">
        <LogoUpload currentUrl={billing.logoUrl} onChange={(url) => set("logoUrl", url)} />
      </Field>
      <Field label="Nom de la société">
        <Input value={billing.companyName} onChange={(v) => set("companyName", v)} placeholder="Bis Repetita" />
      </Field>
      <Field label="Email">
        <Input type="email" value={billing.email} onChange={(v) => set("email", v)} placeholder="contact@bisrepetita.ch" />
      </Field>
      <Field label="Téléphone">
        <Input value={billing.phone || ""} onChange={(v) => set("phone", v || null)} placeholder="+41 00 000 00 00" />
      </Field>
      <Field label="Adresse">
        <Input value={billing.addressLine1} onChange={(v) => set("addressLine1", v)} placeholder="Rue de la Paix 1" />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="NPA">
          <Input value={billing.postalCode} onChange={(v) => set("postalCode", v)} placeholder="1000" />
        </Field>
        <Field label="Ville">
          <Input value={billing.city} onChange={(v) => set("city", v)} placeholder="Lausanne" />
        </Field>
      </div>
    </Section>
  );
}

function LogoUpload({
  currentUrl,
  onChange,
}: {
  currentUrl: string | null;
  onChange: (url: string | null) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const storageRef = ref(storage, "settings/logo");
      await uploadBytes(storageRef, file, { contentType: file.type });
      const url = await getDownloadURL(storageRef);
      onChange(url);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const handleRemove = async () => {
    try {
      await deleteObject(ref(storage, "settings/logo"));
    } catch {
      // fichier absent, on ignore
    }
    onChange(null);
  };

  return (
    <div className="flex items-center gap-4">
      {currentUrl ? (
        <div
          className="relative flex items-center justify-center w-24 h-16 rounded-[8px] border overflow-hidden shrink-0"
          style={{ borderColor: "#E5E1DA", backgroundColor: "#F9F8F6" }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={currentUrl} alt="Logo" className="max-h-full max-w-full object-contain p-1" />
          <button
            onClick={handleRemove}
            className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center"
            style={{ backgroundColor: "rgba(26,26,24,0.7)" }}
            title="Supprimer le logo"
          >
            <X className="w-3 h-3 text-white" />
          </button>
        </div>
      ) : (
        <div
          className="w-24 h-16 rounded-[8px] border flex items-center justify-center shrink-0"
          style={{ borderColor: "#E5E1DA", backgroundColor: "#F9F8F6" }}
        >
          <ImagePlus className="w-6 h-6" style={{ color: "#C8C4BC" }} />
        </div>
      )}

      <div className="space-y-1.5">
        <label
          className="inline-flex items-center gap-2 h-9 px-3 rounded-[8px] border text-[13px] font-medium cursor-pointer transition-colors"
          style={{ borderColor: "#E5E1DA", color: uploading ? "#A09890" : "#1A1A18", backgroundColor: uploading ? "#F9F8F6" : "#FFFFFF" }}
        >
          {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ImagePlus className="w-3.5 h-3.5" />}
          {uploading ? "Envoi…" : currentUrl ? "Changer" : "Importer"}
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/svg+xml,image/webp"
            onChange={handleFile}
            className="sr-only"
            disabled={uploading}
          />
        </label>
        <p className="text-[11px]" style={{ color: "#A09890" }}>PNG, JPG, SVG — max 2 Mo</p>
      </div>
    </div>
  );
}

// ─── Section Banque ───────────────────────────────────────────────────────────

function BanqueSection({
  billing,
  onChange,
}: {
  billing: BillingSettings;
  onChange: (v: BillingSettings) => void;
}) {
  const set = (key: keyof BillingSettings, value: string | boolean | null) =>
    onChange({ ...billing, [key]: value });

  return (
    <Section title="Coordonnées bancaires">
      <Field label="IBAN">
        <Input
          value={billing.iban}
          onChange={(v) => set("iban", v.toUpperCase().replace(/\s/g, ""))}
          placeholder="CH56 0483 5012 3456 7800 9"
          className="font-mono"
        />
      </Field>
      <Field label="QR-IBAN (optionnel)">
        <Input
          value={billing.qrIban || ""}
          onChange={(v) => set("qrIban", v.toUpperCase().replace(/\s/g, "") || null)}
          placeholder="CH21 3080 8001 2345 6789 7"
          className="font-mono"
        />
      </Field>
      <Toggle
        label="Utiliser le QR-IBAN pour les QR-factures"
        checked={billing.useQrIban}
        onChange={(v) => set("useQrIban", v)}
      />
    </Section>
  );
}

// ─── Section Facturation ──────────────────────────────────────────────────────

function FacturationSection({
  billing,
  onChange,
}: {
  billing: BillingSettings;
  onChange: (v: BillingSettings) => void;
}) {
  const set = (key: keyof BillingSettings, value: string | boolean | number | null) =>
    onChange({ ...billing, [key]: value });

  return (
    <>
      <Section title="Devise et délais">
        <Field label="Devise par défaut">
          <Select
            value={billing.defaultCurrency}
            onChange={(v) => set("defaultCurrency", v)}
            options={[
              { value: "CHF", label: "CHF — Franc suisse" },
              { value: "EUR", label: "EUR — Euro" },
            ]}
          />
        </Field>
        <Field label="Délai de paiement par défaut (jours)">
          <Input
            type="number"
            value={String(billing.defaultPaymentDelayDays)}
            onChange={(v) => set("defaultPaymentDelayDays", parseInt(v) || 10)}
            placeholder="10"
          />
        </Field>
        <Field label="Texte conditions de paiement par défaut">
          <Input
            value={billing.defaultPaymentTermsText}
            onChange={(v) => set("defaultPaymentTermsText", v)}
            placeholder="Payable dans les 10 jours"
          />
        </Field>
        <Field label="Langue des factures">
          <Select
            value={billing.invoiceLanguage}
            onChange={(v) => set("invoiceLanguage", v)}
            options={[
              { value: "fr", label: "Français" },
              { value: "en", label: "English" },
            ]}
          />
        </Field>
      </Section>

      <Section title="TVA">
        <Toggle
          label="TVA activée"
          checked={billing.vatEnabled}
          onChange={(v) => set("vatEnabled", v)}
        />
        {billing.vatEnabled && (
          <Field label="Taux TVA par défaut">
            <Select
              value={String(billing.defaultVatRate ?? "")}
              onChange={(v) =>
                set("defaultVatRate", v === "" ? null : (parseFloat(v) as VatRate))
              }
              options={[
                { value: "", label: "Aucun" },
                { value: "0", label: "0%" },
                { value: "2.6", label: "2.6% (réduit)" },
                { value: "8.1", label: "8.1% (normal)" },
              ]}
            />
          </Field>
        )}
      </Section>
    </>
  );
}

// ─── Section Emails ───────────────────────────────────────────────────────────

function EmailsSection({
  email,
  onChange,
}: {
  email: EmailSettings;
  onChange: (v: EmailSettings) => void;
}) {
  const set = (key: keyof EmailSettings, value: string | boolean | null) =>
    onChange({ ...email, [key]: value });

  return (
    <>
      <Section title="Expéditeur">
        <Field label="Nom affiché dans l'email">
          <Input
            value={email.senderName}
            onChange={(v) => set("senderName", v)}
            placeholder="Bis Repetita Boxing"
          />
        </Field>
      </Section>

      <Section title="Email facture">
        <Field label="Objet">
          <Input
            value={email.invoiceEmailSubject}
            onChange={(v) => set("invoiceEmailSubject", v)}
          />
        </Field>
        <Field label="Corps du message">
          <Textarea
            value={email.invoiceEmailBody}
            onChange={(v) => set("invoiceEmailBody", v)}
            rows={6}
          />
        </Field>
      </Section>

      <Section title="Email relance">
        <Field label="Objet">
          <Input
            value={email.reminderEmailSubject}
            onChange={(v) => set("reminderEmailSubject", v)}
          />
        </Field>
        <Field label="Corps du message">
          <Textarea
            value={email.reminderEmailBody}
            onChange={(v) => set("reminderEmailBody", v)}
            rows={6}
          />
        </Field>
      </Section>

      <Section title="Options">
        <Toggle
          label="M'envoyer une copie de chaque email"
          checked={email.sendCopyToSelf}
          onChange={(v) => set("sendCopyToSelf", v)}
        />
        {email.sendCopyToSelf && (
          <Field label="Email de copie">
            <Input
              type="email"
              value={email.copyEmail || ""}
              onChange={(v) => set("copyEmail", v || null)}
              placeholder="copie@bisrepetita.ch"
            />
          </Field>
        )}
      </Section>

      <div
        className="rounded-[10px] p-4 text-[13px]"
        style={{ backgroundColor: "#F0EDE8", color: "#7A7570" }}
      >
        <p className="font-medium mb-1" style={{ color: "#1A1A18" }}>Variables disponibles</p>
        <p className="font-mono text-[12px] leading-6">
          {"{prenom}"} {"{nom}"} {"{client}"}<br />
          {"{numero_facture}"} {"{montant}"}<br />
          {"{date_echeance}"} {"{lien_pdf}"}
        </p>
      </div>
    </>
  );
}

// ─── Composants internes ──────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      className="rounded-[10px] border p-4 space-y-4"
      style={{ borderColor: "#E5E1DA", backgroundColor: "#FFFFFF" }}
    >
      <h2
        className="text-[11px] font-semibold uppercase tracking-widest"
        style={{ color: "#7A7570" }}
      >
        {title}
      </h2>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label
        className="block text-[13px] font-medium"
        style={{ color: "#1A1A18" }}
      >
        {label}
      </label>
      {children}
    </div>
  );
}

function Input({
  value,
  onChange,
  type = "text",
  placeholder,
  className = "",
}: {
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  className?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={`w-full h-12 px-4 rounded-[8px] border text-[14px] outline-none transition-colors ${className}`}
      style={{ backgroundColor: "#FFFFFF", borderColor: "#E5E1DA", color: "#1A1A18" }}
      onFocus={(e) => (e.target.style.borderColor = "#1A1A18")}
      onBlur={(e) => (e.target.style.borderColor = "#E5E1DA")}
    />
  );
}

function Textarea({
  value,
  onChange,
  rows = 4,
}: {
  value: string;
  onChange: (v: string) => void;
  rows?: number;
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      rows={rows}
      className="w-full px-4 py-3 rounded-[8px] border text-[14px] outline-none transition-colors resize-none"
      style={{ backgroundColor: "#FFFFFF", borderColor: "#E5E1DA", color: "#1A1A18" }}
      onFocus={(e) => (e.target.style.borderColor = "#1A1A18")}
      onBlur={(e) => (e.target.style.borderColor = "#E5E1DA")}
    />
  );
}

function Select({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full h-12 px-4 rounded-[8px] border text-[14px] outline-none appearance-none cursor-pointer"
      style={{ backgroundColor: "#FFFFFF", borderColor: "#E5E1DA", color: "#1A1A18" }}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-3 cursor-pointer py-1">
      <span className="text-[14px]" style={{ color: "#1A1A18" }}>
        {label}
      </span>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className="relative w-11 h-6 rounded-full transition-colors shrink-0"
        style={{ backgroundColor: checked ? "#1A1A18" : "#E5E1DA" }}
      >
        <span
          className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform"
          style={{ transform: checked ? "translateX(20px)" : "translateX(0)" }}
        />
      </button>
    </label>
  );
}

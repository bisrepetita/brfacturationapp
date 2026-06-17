"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getInvoice, markInvoicePaid } from "@/lib/invoices";
import { Invoice, BillingSettings, EmailSettings } from "@/types";
import { InvoiceStatusBadge } from "@/components/ui/invoice-status-badge";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { ChevronLeft, Download, Loader2, Pencil, Send, Bell, CheckCircle } from "lucide-react";
import { usePdfDownload } from "@/hooks/use-pdf-download";
import { getBillingSettings, getEmailSettings } from "@/lib/settings";
import { interpolateTemplate } from "@/lib/email";
import { useAuth } from "@/contexts/auth-context";

function todayISO() {
  return new Date().toISOString().split("T")[0];
}

export default function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { firebaseUser } = useAuth();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const { downloadPdf, generating } = usePdfDownload();
  const [settings, setSettings] = useState<BillingSettings | null>(null);
  const [emailSettings, setEmailSettings] = useState<EmailSettings | null>(null);

  // Email modal
  const [modal, setModal] = useState<"send" | "remind" | null>(null);
  const [editSubject, setEditSubject] = useState("");
  const [editBody, setEditBody] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  // Payment modal
  const [payModal, setPayModal] = useState(false);
  const [payAmount, setPayAmount] = useState("");
  const [payDate, setPayDate] = useState(todayISO());
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);

  useEffect(() => {
    getInvoice(id).then((inv) => {
      setInvoice(inv);
      setLoading(false);
    });
  }, [id]);

  useEffect(() => {
    getBillingSettings().then(setSettings);
    getEmailSettings().then(setEmailSettings);
  }, []);

  async function handleSend(type: "send" | "remind") {
    setSending(true);
    setSendError(null);
    try {
      const endpoint = type === "send"
        ? `/api/invoices/${id}/send`
        : `/api/invoices/${id}/remind`;
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject: editSubject, body: editBody }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Erreur inconnue");
      const updated = await getInvoice(id);
      setInvoice(updated);
      setModal(null);
    } catch (err) {
      setSendError(err instanceof Error ? err.message : String(err));
    } finally {
      setSending(false);
    }
  }

  async function handlePay() {
    if (!invoice || !firebaseUser) return;
    const amount = parseFloat(payAmount);
    if (isNaN(amount) || amount <= 0) {
      setPayError("Montant invalide.");
      return;
    }
    const totalPaid = invoice.amountPaid + amount;
    if (totalPaid > invoice.totalInclVat + 0.001) {
      setPayError(`Le montant dépasse le solde restant (${invoice.currency} ${remaining.toFixed(2)}).`);
      return;
    }
    setPaying(true);
    setPayError(null);
    try {
      await markInvoicePaid(id, totalPaid, new Date(payDate), firebaseUser.uid);
      const updated = await getInvoice(id);
      setInvoice(updated);
      setPayModal(false);
    } catch (err) {
      setPayError(err instanceof Error ? err.message : String(err));
    } finally {
      setPaying(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ backgroundColor: "#F9F8F6" }}>
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: "#C8C4BC" }} />
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="p-8 text-center">
        <p style={{ color: "#7A7570" }}>Facture introuvable.</p>
      </div>
    );
  }

  const remaining = invoice.totalInclVat - invoice.amountPaid;
  const canPay = !["draft", "paid", "cancelled"].includes(invoice.status);
  const canSend = !["draft", "cancelled"].includes(invoice.status);
  const canRemind = ["sent", "pending", "overdue", "partially_paid"].includes(invoice.status);

  function openPayModal() {
    setPayAmount(remaining.toFixed(2));
    setPayDate(todayISO());
    setPayError(null);
    setPayModal(true);
  }

  return (
    <main className="min-h-screen" style={{ backgroundColor: "#F9F8F6" }}>
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center gap-2 px-4 h-14 border-b" style={{ backgroundColor: "#FFFFFF", borderColor: "#E5E1DA" }}>
        <button
          onClick={() => router.push("/factures")}
          className="w-8 h-8 flex items-center justify-center rounded-full"
          style={{ backgroundColor: "#F0EDE8", color: "#7A7570" }}
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-medium truncate" style={{ color: "#1A1A18" }}>
            {invoice.invoiceNumber || "Brouillon"}
          </p>
        </div>
        <InvoiceStatusBadge status={invoice.status} />

        {invoice.status !== "draft" && settings && (
          <button
            onClick={() => downloadPdf(invoice, settings)}
            disabled={generating}
            title="Télécharger PDF"
            className="flex items-center justify-center w-8 h-8 rounded-full transition-opacity disabled:opacity-50"
            style={{ backgroundColor: "#F0EDE8", color: "#7A7570" }}
          >
            {generating
              ? <span className="w-3.5 h-3.5 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: "#C8C4BC", borderTopColor: "#1A1A18" }} />
              : <Download className="w-3.5 h-3.5" />
            }
          </button>
        )}

        {canSend && (
          <button
            onClick={() => {
              if (!emailSettings) return;
              setEditSubject(interpolateTemplate(emailSettings.invoiceEmailSubject, invoice));
              setEditBody(interpolateTemplate(emailSettings.invoiceEmailBody, invoice));
              setSendError(null);
              setModal("send");
            }}
            title="Envoyer"
            className="flex items-center justify-center w-8 h-8 rounded-full"
            style={{ backgroundColor: "#F0EDE8", color: "#7A7570" }}
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        )}

        {canRemind && (
          <button
            onClick={() => {
              if (!emailSettings) return;
              setEditSubject(interpolateTemplate(emailSettings.reminderEmailSubject, invoice));
              setEditBody(interpolateTemplate(emailSettings.reminderEmailBody, invoice));
              setSendError(null);
              setModal("remind");
            }}
            title="Relancer"
            className="flex items-center justify-center w-8 h-8 rounded-full"
            style={{ backgroundColor: "#F0EDE8", color: "#7A7570" }}
          >
            <Bell className="w-3.5 h-3.5" />
          </button>
        )}

        {canPay && (
          <button
            onClick={openPayModal}
            className="flex items-center gap-1.5 h-8 px-3 rounded-[6px] text-[13px] font-medium"
            style={{ backgroundColor: "#1A1A18", color: "#FFFFFF" }}
          >
            <CheckCircle className="w-3.5 h-3.5" />
            Paiement
          </button>
        )}

        {invoice.status === "draft" && (
          <button
            onClick={() => router.push(`/factures/${invoice.id}/modifier`)}
            className="flex items-center gap-1.5 h-8 px-3 rounded-[6px] text-[13px] font-medium"
            style={{ backgroundColor: "#1A1A18", color: "#FFFFFF" }}
          >
            <Pencil className="w-3.5 h-3.5" />
            Modifier
          </button>
        )}
      </div>

      <div className="p-4 max-w-2xl mx-auto space-y-4">
        {/* Carte principale */}
        <div className="rounded-[10px] border overflow-hidden" style={{ borderColor: "#E5E1DA", backgroundColor: "#FFFFFF" }}>
          {/* Client */}
          <div className="px-5 py-4 border-b" style={{ borderColor: "#E5E1DA" }}>
            <p className="text-[11px] font-semibold uppercase tracking-widest mb-1.5" style={{ color: "#A09890" }}>Client</p>
            <p className="text-[15px] font-medium" style={{ color: "#1A1A18" }}>{invoice.clientSnapshot.displayName}</p>
            <p className="text-[13px]" style={{ color: "#7A7570" }}>{invoice.clientSnapshot.email}</p>
            {invoice.clientSnapshot.addressLine1 && (
              <p className="text-[13px]" style={{ color: "#7A7570" }}>
                {invoice.clientSnapshot.addressLine1}, {invoice.clientSnapshot.postalCode} {invoice.clientSnapshot.city}
              </p>
            )}
          </div>

          {/* Dates */}
          <div className="px-5 py-4 border-b grid grid-cols-2 gap-4" style={{ borderColor: "#E5E1DA" }}>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest mb-1" style={{ color: "#A09890" }}>Date</p>
              <p className="text-[14px]" style={{ color: "#1A1A18" }}>{format(invoice.invoiceDate, "dd MMMM yyyy", { locale: fr })}</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest mb-1" style={{ color: "#A09890" }}>Échéance</p>
              <p className="text-[14px]" style={{ color: "#1A1A18" }}>{format(invoice.dueDate, "dd MMMM yyyy", { locale: fr })}</p>
            </div>
          </div>

          {/* Lignes */}
          <div className="px-5 py-4 border-b" style={{ borderColor: "#E5E1DA" }}>
            <p className="text-[11px] font-semibold uppercase tracking-widest mb-3" style={{ color: "#A09890" }}>Prestations</p>
            <div className="space-y-3">
              {invoice.lines.map((line) => (
                <div key={line.id} className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px]" style={{ color: "#1A1A18" }}>{line.description}</p>
                    <p className="text-[12px]" style={{ color: "#A09890" }}>
                      {line.quantity} × {invoice.currency} {line.unitPrice.toFixed(2)}
                      {line.vatApplicable && line.vatRate ? ` + TVA ${line.vatRate}%` : ""}
                    </p>
                  </div>
                  <span className="font-mono text-[14px] font-medium shrink-0" style={{ color: "#1A1A18" }}>
                    {invoice.currency} {line.lineTotalInclVat.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Totaux */}
          <div className="px-5 py-4">
            {invoice.totalVat > 0 && (
              <>
                <div className="flex justify-between text-[13px] mb-1.5">
                  <span style={{ color: "#7A7570" }}>Sous-total HT</span>
                  <span className="font-mono" style={{ color: "#1A1A18" }}>{invoice.currency} {invoice.subtotalExclVat.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-[13px] mb-2">
                  <span style={{ color: "#7A7570" }}>TVA</span>
                  <span className="font-mono" style={{ color: "#1A1A18" }}>{invoice.currency} {invoice.totalVat.toFixed(2)}</span>
                </div>
              </>
            )}
            <div className="flex justify-between items-baseline pt-2 border-t" style={{ borderColor: "#E5E1DA" }}>
              <span className="text-[14px] font-semibold" style={{ color: "#1A1A18" }}>Total TTC</span>
              <span className="font-mono text-[22px] font-bold" style={{ color: "#1A1A18" }}>
                {invoice.currency} {invoice.totalInclVat.toFixed(2)}
              </span>
            </div>
            {invoice.amountPaid > 0 && (
              <>
                <div className="flex justify-between text-[13px] mt-2">
                  <span style={{ color: "#7A7570" }}>Payé</span>
                  <span className="font-mono" style={{ color: "#2D6A4F" }}>{invoice.currency} {invoice.amountPaid.toFixed(2)}</span>
                </div>
                {invoice.status !== "paid" && (
                  <div className="flex justify-between text-[13px] mt-1">
                    <span style={{ color: "#7A7570" }}>Solde restant</span>
                    <span className="font-mono font-medium" style={{ color: "#B45309" }}>{invoice.currency} {remaining.toFixed(2)}</span>
                  </div>
                )}
              </>
            )}
            {invoice.paymentDate && invoice.status === "paid" && (
              <p className="text-[12px] mt-2" style={{ color: "#2D6A4F" }}>
                Payé le {format(invoice.paymentDate, "dd MMM yyyy", { locale: fr })}
              </p>
            )}
            <p className="text-[12px] mt-3" style={{ color: "#A09890" }}>{invoice.paymentTermsText}</p>
          </div>
        </div>

        {/* Historique envois */}
        {(invoice.emailSentAt || invoice.reminderSentAt) && (
          <div className="rounded-[10px] border px-5 py-4 space-y-2" style={{ borderColor: "#E5E1DA", backgroundColor: "#FFFFFF" }}>
            <p className="text-[11px] font-semibold uppercase tracking-widest mb-2" style={{ color: "#A09890" }}>Envois</p>
            {invoice.emailSentAt && (
              <div className="flex items-center gap-2 text-[13px]" style={{ color: "#7A7570" }}>
                <Send className="w-3.5 h-3.5 shrink-0" />
                <span>Facture envoyée le {format(invoice.emailSentAt, "dd MMM yyyy à HH:mm", { locale: fr })}</span>
              </div>
            )}
            {invoice.reminderSentAt && (
              <div className="flex items-center gap-2 text-[13px]" style={{ color: "#7A7570" }}>
                <Bell className="w-3.5 h-3.5 shrink-0" />
                <span>Relance envoyée le {format(invoice.reminderSentAt, "dd MMM yyyy à HH:mm", { locale: fr })}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal email / relance */}
      {modal && emailSettings && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
          style={{ backgroundColor: "rgba(26,26,24,0.4)" }}
          onClick={(e) => { if (e.target === e.currentTarget && !sending) setModal(null); }}
        >
          <div className="w-full max-w-md rounded-[14px] overflow-hidden" style={{ backgroundColor: "#FFFFFF" }}>
            <div className="px-5 pt-5 pb-4 border-b" style={{ borderColor: "#E5E1DA" }}>
              <p className="text-[16px] font-semibold" style={{ color: "#1A1A18" }}>
                {modal === "send" ? "Envoyer la facture" : "Envoyer une relance"}
              </p>
              <p className="text-[13px] mt-0.5" style={{ color: "#7A7570" }}>
                À : {invoice.clientSnapshot.email}
              </p>
            </div>
            <div className="px-5 py-4 space-y-4">
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-widest block mb-1.5" style={{ color: "#A09890" }}>Objet</label>
                <input
                  type="text"
                  value={editSubject}
                  onChange={(e) => setEditSubject(e.target.value)}
                  disabled={sending}
                  className="w-full h-10 px-3 rounded-[8px] border text-[14px] outline-none"
                  style={{ borderColor: "#E5E1DA", backgroundColor: "#F9F8F6", color: "#1A1A18" }}
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-widest block mb-1.5" style={{ color: "#A09890" }}>Message</label>
                <textarea
                  value={editBody}
                  onChange={(e) => setEditBody(e.target.value)}
                  disabled={sending}
                  rows={8}
                  className="w-full px-3 py-2.5 rounded-[8px] border text-[13px] outline-none resize-none"
                  style={{ borderColor: "#E5E1DA", backgroundColor: "#F9F8F6", color: "#1A1A18", lineHeight: "1.6" }}
                />
              </div>
              <p className="text-[12px]" style={{ color: "#A09890" }}>La facture en PDF sera jointe à cet email.</p>
              {sendError && (
                <p className="text-[13px] px-3 py-2 rounded-[6px]" style={{ backgroundColor: "#FEF2F2", color: "#B91C1C" }}>{sendError}</p>
              )}
            </div>
            <div className="px-5 pb-5 flex gap-3">
              <button
                onClick={() => !sending && setModal(null)}
                disabled={sending}
                className="flex-1 h-11 rounded-[8px] text-[14px] font-medium"
                style={{ backgroundColor: "#F0EDE8", color: "#1A1A18" }}
              >
                Annuler
              </button>
              <button
                onClick={() => handleSend(modal)}
                disabled={sending}
                className="flex-1 h-11 rounded-[8px] text-[14px] font-medium flex items-center justify-center gap-2 disabled:opacity-60"
                style={{ backgroundColor: "#1A1A18", color: "#FFFFFF" }}
              >
                {sending
                  ? <span className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: "rgba(255,255,255,0.4)", borderTopColor: "#FFFFFF" }} />
                  : <Send className="w-4 h-4" />
                }
                {sending ? "Envoi…" : modal === "send" ? "Envoyer" : "Relancer"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal paiement */}
      {payModal && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
          style={{ backgroundColor: "rgba(26,26,24,0.4)" }}
          onClick={(e) => { if (e.target === e.currentTarget && !paying) setPayModal(false); }}
        >
          <div className="w-full max-w-sm rounded-[14px] overflow-hidden" style={{ backgroundColor: "#FFFFFF" }}>
            <div className="px-5 pt-5 pb-4 border-b" style={{ borderColor: "#E5E1DA" }}>
              <p className="text-[16px] font-semibold" style={{ color: "#1A1A18" }}>Enregistrer un paiement</p>
              <p className="text-[13px] mt-0.5" style={{ color: "#7A7570" }}>
                Solde restant : {invoice.currency} {remaining.toFixed(2)}
              </p>
            </div>

            <div className="px-5 py-4 space-y-4">
              {/* Raccourci tout régler */}
              {remaining > 0 && parseFloat(payAmount) !== remaining && (
                <button
                  onClick={() => setPayAmount(remaining.toFixed(2))}
                  className="w-full h-9 rounded-[7px] text-[13px] font-medium border"
                  style={{ borderColor: "#E5E1DA", color: "#1A1A18", backgroundColor: "#F9F8F6" }}
                >
                  Tout régler — {invoice.currency} {remaining.toFixed(2)}
                </button>
              )}

              <div>
                <label className="text-[11px] font-semibold uppercase tracking-widest block mb-1.5" style={{ color: "#A09890" }}>
                  Montant reçu ({invoice.currency})
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  disabled={paying}
                  className="w-full h-11 px-3 rounded-[8px] border text-[18px] font-mono outline-none"
                  style={{ borderColor: "#E5E1DA", backgroundColor: "#F9F8F6", color: "#1A1A18" }}
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold uppercase tracking-widest block mb-1.5" style={{ color: "#A09890" }}>
                  Date de paiement
                </label>
                <input
                  type="date"
                  value={payDate}
                  onChange={(e) => setPayDate(e.target.value)}
                  disabled={paying}
                  className="w-full h-10 px-3 rounded-[8px] border text-[14px] outline-none"
                  style={{ borderColor: "#E5E1DA", backgroundColor: "#F9F8F6", color: "#1A1A18" }}
                />
              </div>

              {payError && (
                <p className="text-[13px] px-3 py-2 rounded-[6px]" style={{ backgroundColor: "#FEF2F2", color: "#B91C1C" }}>{payError}</p>
              )}
            </div>

            <div className="px-5 pb-5 flex gap-3">
              <button
                onClick={() => !paying && setPayModal(false)}
                disabled={paying}
                className="flex-1 h-11 rounded-[8px] text-[14px] font-medium"
                style={{ backgroundColor: "#F0EDE8", color: "#1A1A18" }}
              >
                Annuler
              </button>
              <button
                onClick={handlePay}
                disabled={paying}
                className="flex-1 h-11 rounded-[8px] text-[14px] font-medium flex items-center justify-center gap-2 disabled:opacity-60"
                style={{ backgroundColor: "#1A1A18", color: "#FFFFFF" }}
              >
                {paying
                  ? <span className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: "rgba(255,255,255,0.4)", borderTopColor: "#FFFFFF" }} />
                  : <CheckCircle className="w-4 h-4" />
                }
                {paying ? "Enregistrement…" : "Confirmer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

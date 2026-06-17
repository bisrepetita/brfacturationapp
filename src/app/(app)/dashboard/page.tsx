"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { getInvoices } from "@/lib/invoices";
import { Invoice } from "@/types";
import { InvoiceStatusBadge } from "@/components/ui/invoice-status-badge";
import { format, startOfMonth, endOfMonth, isWithinInterval } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Plus, FileText, Users, Settings, AlertTriangle,
  TrendingUp, Clock, CheckCircle, ChevronRight, Loader2
} from "lucide-react";

function formatCHF(amount: number, currency = "CHF") {
  return `${currency} ${new Intl.NumberFormat("fr-CH", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount)}`;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getInvoices().then((data) => {
      setInvoices(data);
      setLoading(false);
    });
  }, []);

  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  const metrics = useMemo(() => {
    const thisMonth = invoices.filter(
      (inv) => inv.invoiceDate && isWithinInterval(inv.invoiceDate, { start: monthStart, end: monthEnd })
    );

    const caMonth = thisMonth
      .filter((inv) => inv.status !== "draft" && inv.status !== "cancelled")
      .reduce((sum, inv) => sum + inv.totalInclVat, 0);

    const pending = invoices
      .filter((inv) => ["validated", "sent", "pending", "partially_paid"].includes(inv.status))
      .reduce((sum, inv) => sum + (inv.totalInclVat - inv.amountPaid), 0);

    const overdue = invoices.filter((inv) => inv.status === "overdue");
    const overdueAmount = overdue.reduce((sum, inv) => sum + (inv.totalInclVat - inv.amountPaid), 0);

    const paidMonth = thisMonth
      .filter((inv) => inv.status === "paid")
      .reduce((sum, inv) => sum + inv.totalInclVat, 0);

    return { caMonth, pending, overdue, overdueAmount, paidMonth };
  }, [invoices, monthStart, monthEnd]);

  const recentInvoices = invoices.slice(0, 5);

  const greeting = () => {
    const h = now.getHours();
    if (h < 12) return "Bonjour";
    if (h < 18) return "Bon après-midi";
    return "Bonsoir";
  };

  const firstName = user?.displayName?.split(" ")[0] || "";

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ backgroundColor: "#F9F8F6" }}>
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: "#C8C4BC" }} />
      </div>
    );
  }

  return (
    <main className="p-4 md:p-8 max-w-2xl mx-auto pb-24">

      {/* Salutation */}
      <div className="mb-6">
        <p className="text-[13px] mb-0.5" style={{ color: "#A09890" }}>
          {format(now, "EEEE d MMMM yyyy", { locale: fr })}
        </p>
        <h1 className="text-[26px] font-bold" style={{ color: "#1A1A18" }}>
          {greeting()}{firstName ? `, ${firstName}` : ""}.
        </h1>
      </div>

      {/* Métriques */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <MetricCard
          label="CA ce mois"
          value={formatCHF(metrics.caMonth)}
          icon={TrendingUp}
          accent="#C8A96E"
        />
        <MetricCard
          label="En attente"
          value={formatCHF(metrics.pending)}
          icon={Clock}
          accent="#8A6200"
        />
        <MetricCard
          label="En retard"
          value={formatCHF(metrics.overdueAmount)}
          icon={AlertTriangle}
          accent={metrics.overdue.length > 0 ? "#C0392B" : "#A09890"}
          alert={metrics.overdue.length > 0}
          count={metrics.overdue.length}
        />
        <MetricCard
          label="Payé ce mois"
          value={formatCHF(metrics.paidMonth)}
          icon={CheckCircle}
          accent="#2D6A4F"
        />
      </div>

      {/* Alerte retard */}
      {metrics.overdue.length > 0 && (
        <div
          className="rounded-[10px] border p-4 mb-6"
          style={{ borderColor: "#F5C6C2", backgroundColor: "#FDECEA" }}
        >
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 shrink-0" style={{ color: "#C0392B" }} />
            <p className="text-[13px] font-semibold" style={{ color: "#C0392B" }}>
              {metrics.overdue.length} facture{metrics.overdue.length > 1 ? "s" : ""} en retard
            </p>
          </div>
          <div className="space-y-2">
            {metrics.overdue.slice(0, 3).map((inv) => (
              <button
                key={inv.id}
                onClick={() => router.push(`/factures/${inv.id}`)}
                className="w-full flex items-center justify-between text-left rounded-[8px] p-2.5 transition-colors"
                style={{ backgroundColor: "rgba(255,255,255,0.6)" }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.9)")}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.6)")}
              >
                <div>
                  <p className="text-[13px] font-medium" style={{ color: "#1A1A18" }}>
                    {inv.clientSnapshot.displayName}
                  </p>
                  <p className="text-[12px]" style={{ color: "#7A7570" }}>
                    {inv.invoiceNumber} · Éch. {format(inv.dueDate, "dd.MM.yyyy")}
                  </p>
                </div>
                <span className="font-mono text-[13px] font-semibold shrink-0 ml-3" style={{ color: "#C0392B" }}>
                  {formatCHF(inv.totalInclVat - inv.amountPaid, inv.currency)}
                </span>
              </button>
            ))}
          </div>
          {metrics.overdue.length > 3 && (
            <button
              onClick={() => router.push("/factures")}
              className="mt-2 text-[12px] font-medium w-full text-center"
              style={{ color: "#C0392B" }}
            >
              Voir toutes les factures en retard →
            </button>
          )}
        </div>
      )}

      {/* Dernières factures */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: "#7A7570" }}>
            Dernières factures
          </h2>
          <button
            onClick={() => router.push("/factures")}
            className="text-[12px] font-medium flex items-center gap-0.5"
            style={{ color: "#7A7570" }}
          >
            Tout voir <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {recentInvoices.length === 0 ? (
          <div
            className="rounded-[10px] border-2 border-dashed p-8 text-center"
            style={{ borderColor: "#E5E1DA" }}
          >
            <p className="text-[14px]" style={{ color: "#A09890" }}>Aucune facture pour l&apos;instant.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {recentInvoices.map((inv) => (
              <button
                key={inv.id}
                onClick={() => router.push(`/factures/${inv.id}`)}
                className="w-full rounded-[10px] border p-4 flex items-center gap-3 text-left transition-colors"
                style={{ borderColor: "#E5E1DA", backgroundColor: "#FFFFFF" }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#C8C4BC")}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#E5E1DA")}
              >
                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[12px]" style={{ color: "#A09890" }}>
                      {inv.status === "draft" ? "Brouillon" : inv.invoiceNumber}
                    </span>
                    <InvoiceStatusBadge status={inv.status} />
                  </div>
                  <p className="text-[14px] font-medium truncate" style={{ color: "#1A1A18" }}>
                    {inv.clientSnapshot.displayName}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-mono text-[14px] font-semibold" style={{ color: "#1A1A18" }}>
                    {formatCHF(inv.totalInclVat, inv.currency)}
                  </p>
                  <p className="text-[11px]" style={{ color: "#A09890" }}>
                    {format(inv.invoiceDate, "dd.MM.yy")}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Actions rapides */}
      <div>
        <h2 className="text-[11px] font-semibold uppercase tracking-widest mb-3" style={{ color: "#7A7570" }}>
          Actions rapides
        </h2>
        <div className="grid grid-cols-2 gap-2">
          <QuickAction
            icon={Plus}
            label="Nouvelle facture"
            onClick={() => router.push("/factures/nouvelle")}
            primary
          />
          <QuickAction
            icon={FileText}
            label="Voir les factures"
            onClick={() => router.push("/factures")}
          />
          <QuickAction
            icon={Users}
            label="Clients"
            onClick={() => router.push("/clients")}
          />
          <QuickAction
            icon={Settings}
            label="Paramètres"
            onClick={() => router.push("/parametres")}
          />
        </div>
      </div>
    </main>
  );
}

// ─── MetricCard ───────────────────────────────────────────────────────────────

function MetricCard({
  label,
  value,
  icon: Icon,
  accent,
  alert = false,
  count,
}: {
  label: string;
  value: string;
  icon: React.ElementType;
  accent: string;
  alert?: boolean;
  count?: number;
}) {
  return (
    <div
      className="rounded-[10px] border p-4 space-y-3"
      style={{
        borderColor: alert ? "#F5C6C2" : "#E5E1DA",
        backgroundColor: alert ? "#FDECEA" : "#FFFFFF",
      }}
    >
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: alert ? "#C0392B" : "#7A7570" }}>
          {label}
        </p>
        <div className="flex items-center gap-1">
          {count !== undefined && count > 0 && (
            <span
              className="text-[11px] font-bold w-5 h-5 rounded-full flex items-center justify-center"
              style={{ backgroundColor: "#C0392B", color: "#FFFFFF" }}
            >
              {count}
            </span>
          )}
          <Icon className="w-4 h-4" style={{ color: accent }} />
        </div>
      </div>
      <p
        className="font-mono text-[18px] font-bold leading-none"
        style={{ color: alert ? "#C0392B" : "#1A1A18" }}
      >
        {value}
      </p>
    </div>
  );
}

// ─── QuickAction ──────────────────────────────────────────────────────────────

function QuickAction({
  icon: Icon,
  label,
  onClick,
  primary = false,
}: {
  icon: React.ElementType;
  label: string;
  onClick: () => void;
  primary?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className="h-14 rounded-[10px] border flex items-center gap-3 px-4 text-left transition-colors"
      style={{
        backgroundColor: primary ? "#1A1A18" : "#FFFFFF",
        borderColor: primary ? "#1A1A18" : "#E5E1DA",
        color: primary ? "#FFFFFF" : "#1A1A18",
      }}
      onMouseEnter={(e) => {
        if (!primary) e.currentTarget.style.borderColor = "#C8C4BC";
      }}
      onMouseLeave={(e) => {
        if (!primary) e.currentTarget.style.borderColor = "#E5E1DA";
      }}
    >
      <Icon className="w-4 h-4 shrink-0" />
      <span className="text-[13px] font-medium">{label}</span>
    </button>
  );
}

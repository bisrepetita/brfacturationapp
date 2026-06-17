import { cn } from "@/lib/utils";
import { Invoice } from "@/types";
import { InvoiceStatusBadge } from "./invoice-status-badge";
import { MoneyAmount } from "./money-amount";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { AlertCircle } from "lucide-react";

interface InvoiceCardProps {
  invoice: Invoice;
  onClick?: () => void;
  className?: string;
}

export function InvoiceCard({ invoice, onClick, className }: InvoiceCardProps) {
  const isOverdue = invoice.status === "overdue";
  const isDraft = invoice.status === "draft";

  return (
    <div
      onClick={onClick}
      className={cn(
        "bg-white border border-[#E5E1DA] rounded-[10px] p-4 flex flex-col gap-3 cursor-pointer press-effect",
        "hover:border-[#C8C4BC] transition-colors duration-150",
        className
      )}
    >
      {/* Ligne 1 : Numéro + Badge statut */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-[13px] font-mono font-medium text-[#7A7570]">
          {isDraft ? "Brouillon" : invoice.invoiceNumber}
        </span>
        <InvoiceStatusBadge status={invoice.status} />
      </div>

      {/* Ligne 2 : Client */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-[14px] font-medium text-[#1A1A18]">
          {invoice.clientSnapshot.displayName}
        </span>
        <MoneyAmount
          amount={invoice.totalInclVat}
          currency={invoice.currency}
          size="md"
        />
      </div>

      {/* Ligne 3 : Échéance */}
      <div className="flex items-center gap-1.5">
        {isOverdue && (
          <AlertCircle className="w-3.5 h-3.5 text-[#C0392B] shrink-0" />
        )}
        <span
          className={cn(
            "text-[13px]",
            isOverdue ? "text-[#C0392B]" : "text-[#7A7570]"
          )}
        >
          {isDraft
            ? `Créée le ${format(invoice.createdAt, "dd.MM.yyyy", { locale: fr })}`
            : `Éch. ${format(invoice.dueDate, "dd.MM.yyyy", { locale: fr })}`}
        </span>
      </div>
    </div>
  );
}

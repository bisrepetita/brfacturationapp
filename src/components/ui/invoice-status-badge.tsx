import { InvoiceStatus } from "@/types";
import { cn } from "@/lib/utils";

const STATUS_CONFIG: Record<
  InvoiceStatus,
  { label: string; bg: string; text: string }
> = {
  draft: { label: "Brouillon", bg: "bg-[#E5E1DA]", text: "text-[#7A7570]" },
  validated: { label: "Validée", bg: "bg-[#E8F4FD]", text: "text-[#1A6EA8]" },
  sent: { label: "Envoyée", bg: "bg-[#E8F4FD]", text: "text-[#1A6EA8]" },
  pending: { label: "En attente", bg: "bg-[#FEF3CD]", text: "text-[#8A6200]" },
  overdue: { label: "En retard", bg: "bg-[#FDECEA]", text: "text-[#C0392B]" },
  partially_paid: { label: "Part. payée", bg: "bg-[#FFF0D6]", text: "text-[#A05C00]" },
  paid: { label: "Payée", bg: "bg-[#D4EDDA]", text: "text-[#1A5C35]" },
  cancelled: { label: "Annulée", bg: "bg-[#EEEEEE]", text: "text-[#999999]" },
};

interface InvoiceStatusBadgeProps {
  status: InvoiceStatus;
  className?: string;
}

export function InvoiceStatusBadge({ status, className }: InvoiceStatusBadgeProps) {
  const config = STATUS_CONFIG[status];
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold uppercase tracking-wider",
        config.bg,
        config.text,
        className
      )}
    >
      {config.label}
    </span>
  );
}

import { cn } from "@/lib/utils";
import { MoneyAmount } from "./money-amount";
import { Currency } from "@/types";

interface MetricCardProps {
  label: string;
  amount?: number;
  currency?: Currency;
  value?: string;
  highlight?: boolean;
  trend?: "up" | "down" | "neutral";
  className?: string;
}

export function MetricCard({
  label,
  amount,
  currency,
  value,
  highlight = false,
  className,
}: MetricCardProps) {
  return (
    <div
      className={cn(
        "bg-white border border-[#E5E1DA] rounded-[10px] p-4 flex flex-col gap-2",
        className
      )}
    >
      <span className="section-label">{label}</span>
      {amount !== undefined ? (
        <MoneyAmount
          amount={amount}
          currency={currency}
          size="lg"
          highlight={highlight}
        />
      ) : (
        <span className="text-[28px] font-semibold text-[#1A1A18]">{value}</span>
      )}
    </div>
  );
}

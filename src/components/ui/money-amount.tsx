import { cn } from "@/lib/utils";
import { Currency } from "@/types";

interface MoneyAmountProps {
  amount: number;
  currency?: Currency;
  size?: "sm" | "md" | "lg";
  highlight?: boolean;
  className?: string;
}

export function MoneyAmount({
  amount,
  currency = "CHF",
  size = "md",
  highlight = false,
  className,
}: MoneyAmountProps) {
  const formatted = new Intl.NumberFormat("fr-CH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);

  const sizeClasses = {
    sm: "text-[13px]",
    md: "text-[16px] font-semibold",
    lg: "text-[28px] font-semibold",
  };

  return (
    <span
      className={cn(
        "amount-mono tabular-nums",
        sizeClasses[size],
        highlight && "text-[#C8A96E]",
        className
      )}
    >
      {currency} {formatted}
    </span>
  );
}

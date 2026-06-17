import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface EmptyStatePremiumProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyStatePremium({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStatePremiumProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-4 py-16 px-8 text-center",
        className
      )}
    >
      <div className="w-16 h-16 rounded-[10px] bg-[#F0EDE8] border border-[#E5E1DA] flex items-center justify-center">
        <Icon className="w-7 h-7 text-[#7A7570]" />
      </div>
      <div>
        <h3 className="text-[16px] font-semibold text-[#1A1A18] mb-1">{title}</h3>
        <p className="text-[13px] text-[#7A7570] max-w-xs">{description}</p>
      </div>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

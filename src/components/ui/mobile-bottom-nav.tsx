"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { FileText, Users, Briefcase, Settings, Plus } from "lucide-react";

const NAV_ITEMS = [
  { href: "/factures", icon: FileText, label: "Factures" },
  { href: "/clients", icon: Users, label: "Clients" },
  { href: "/services", icon: Briefcase, label: "Services" },
  { href: "/parametres", icon: Settings, label: "Paramètres" },
];

export function MobileBottomNav() {
  const pathname = usePathname();

  if (pathname.startsWith("/factures/nouvelle")) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-[#E5E1DA] h-16 md:hidden">
      <div className="flex items-center justify-around h-full px-2 max-w-lg mx-auto">
        {NAV_ITEMS.slice(0, 2).map((item) => (
          <NavItem key={item.href} {...item} active={pathname.startsWith(item.href)} />
        ))}

        {/* Bouton central créer */}
        <Link
          href="/factures/nouvelle"
          className="flex flex-col items-center justify-center w-14 h-14 bg-[#1A1A18] rounded-full shadow-[0_4px_16px_rgba(0,0,0,0.18)] -mt-6"
        >
          <Plus className="w-6 h-6 text-white" />
        </Link>

        {NAV_ITEMS.slice(2).map((item) => (
          <NavItem key={item.href} {...item} active={pathname.startsWith(item.href)} />
        ))}
      </div>
    </nav>
  );
}

function NavItem({
  href,
  icon: Icon,
  label,
  active,
}: {
  href: string;
  icon: React.ElementType;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex flex-col items-center justify-center gap-1 w-16 h-full",
        active ? "text-[#1A1A18]" : "text-[#7A7570]"
      )}
    >
      <Icon className="w-5 h-5" />
      <span className="text-[10px] font-medium">{label}</span>
    </Link>
  );
}

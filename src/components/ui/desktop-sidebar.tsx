"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  FileText,
  Users,
  Briefcase,
  Settings,
  Plus,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/factures", icon: FileText, label: "Factures" },
  { href: "/clients", icon: Users, label: "Clients" },
  { href: "/services", icon: Briefcase, label: "Services" },
  { href: "/parametres", icon: Settings, label: "Paramètres" },
];

export function DesktopSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex flex-col fixed left-0 top-0 bottom-0 w-56 border-r z-40" style={{ backgroundColor: "#FFFFFF", borderColor: "#E5E1DA" }}>
      {/* Logo */}
      <div className="px-5 h-14 flex items-center border-b shrink-0" style={{ borderColor: "#E5E1DA" }}>
        <Link href="/dashboard" className="flex items-center gap-2">
          <span className="text-[15px] font-semibold tracking-tight" style={{ color: "#1A1A18" }}>
            Bis Repetita
          </span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 h-9 rounded-[7px] text-[14px] font-medium transition-colors",
                active
                  ? "bg-[#F0EDE8] text-[#1A1A18]"
                  : "text-[#7A7570] hover:bg-[#F9F8F6] hover:text-[#1A1A18]"
              )}
            >
              <item.icon className="w-4 h-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* FAB nouvelle facture */}
      <div className="px-3 pb-5 shrink-0">
        <Link
          href="/factures/nouvelle"
          className="flex items-center justify-center gap-2 w-full h-10 rounded-[8px] text-[14px] font-medium transition-opacity hover:opacity-90"
          style={{ backgroundColor: "#1A1A18", color: "#FFFFFF" }}
        >
          <Plus className="w-4 h-4" />
          Nouvelle facture
        </Link>
      </div>
    </aside>
  );
}

import { AuthGuard } from "@/components/auth-guard";
import { MobileBottomNav } from "@/components/ui/mobile-bottom-nav";
import { DesktopSidebar } from "@/components/ui/desktop-sidebar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <div className="min-h-screen">
        <DesktopSidebar />
        <div className="md:ml-56 pb-16 md:pb-0">
          {children}
        </div>
        <MobileBottomNav />
      </div>
    </AuthGuard>
  );
}

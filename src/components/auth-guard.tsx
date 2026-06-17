"use client";

import { useAuth } from "@/contexts/auth-context";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div
        className="flex min-h-screen items-center justify-center"
        style={{ backgroundColor: "#F9F8F6" }}
      >
        <div className="space-y-3 text-center">
          <div
            className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin mx-auto"
            style={{ borderColor: "#E5E1DA", borderTopColor: "#1A1A18" }}
          />
          <p className="text-[13px]" style={{ color: "#7A7570" }}>
            Chargement…
          </p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return <>{children}</>;
}

"use client";

import { useAuth } from "@/contexts/auth-context";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      router.push(user ? "/dashboard" : "/login");
    }
  }, [user, loading, router]);

  return (
    <div
      className="flex min-h-screen items-center justify-center"
      style={{ backgroundColor: "#F9F8F6" }}
    >
      <div
        className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
        style={{ borderColor: "#E5E1DA", borderTopColor: "#1A1A18" }}
      />
    </div>
  );
}

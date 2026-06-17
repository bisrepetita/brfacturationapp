"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { FirebaseError } from "firebase/app";

const ERROR_MESSAGES: Record<string, string> = {
  "auth/invalid-credential": "Email ou mot de passe incorrect.",
  "auth/user-not-found": "Aucun compte associé à cet email.",
  "auth/wrong-password": "Mot de passe incorrect.",
  "auth/too-many-requests": "Trop de tentatives. Réessayez dans quelques minutes.",
  "auth/network-request-failed": "Erreur réseau. Vérifiez votre connexion.",
};

export default function LoginPage() {
  const { signIn, signInWithGoogle, authError } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  useEffect(() => {
    if (authError) setError(authError);
  }, [authError]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await signIn(email, password);
      router.push("/dashboard");
    } catch (err) {
      const code = err instanceof FirebaseError ? err.code : "";
      setError(ERROR_MESSAGES[code] || "Une erreur est survenue.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setError("");
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
      router.push("/dashboard");
    } catch (err) {
      const code = err instanceof FirebaseError ? err.code : "";
      setError(ERROR_MESSAGES[code] || "Connexion Google annulée.");
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <main
      className="flex min-h-screen flex-col items-center justify-center p-6"
      style={{ backgroundColor: "#F9F8F6" }}
    >
      <div className="w-full max-w-sm space-y-8">
        {/* Header */}
        <div className="text-center space-y-1">
          <h1
            className="text-[28px] font-bold tracking-tight"
            style={{ color: "#1A1A18" }}
          >
            Bis Repetita
          </h1>
          <p className="text-[14px]" style={{ color: "#7A7570" }}>
            Facturation
          </p>
        </div>

        {/* Formulaire */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label
              htmlFor="email"
              className="block text-[11px] font-semibold uppercase tracking-widest"
              style={{ color: "#7A7570" }}
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full h-12 px-4 rounded-[8px] border text-[14px] outline-none transition-colors"
              style={{
                backgroundColor: "#FFFFFF",
                borderColor: "#E5E1DA",
                color: "#1A1A18",
              }}
              onFocus={(e) => (e.target.style.borderColor = "#1A1A18")}
              onBlur={(e) => (e.target.style.borderColor = "#E5E1DA")}
              placeholder="vous@exemple.ch"
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="password"
              className="block text-[11px] font-semibold uppercase tracking-widest"
              style={{ color: "#7A7570" }}
            >
              Mot de passe
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full h-12 px-4 rounded-[8px] border text-[14px] outline-none transition-colors"
              style={{
                backgroundColor: "#FFFFFF",
                borderColor: "#E5E1DA",
                color: "#1A1A18",
              }}
              onFocus={(e) => (e.target.style.borderColor = "#1A1A18")}
              onBlur={(e) => (e.target.style.borderColor = "#E5E1DA")}
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p
              className="text-[13px] px-4 py-3 rounded-[8px]"
              style={{ backgroundColor: "#FDECEA", color: "#C0392B" }}
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full h-12 rounded-[8px] text-[14px] font-medium text-white transition-opacity disabled:opacity-60"
            style={{ backgroundColor: "#1A1A18" }}
          >
            {loading ? "Connexion…" : "Se connecter"}
          </button>
        </form>

        {/* Séparateur */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px" style={{ backgroundColor: "#E5E1DA" }} />
          <span className="text-[12px]" style={{ color: "#A09890" }}>
            ou
          </span>
          <div className="flex-1 h-px" style={{ backgroundColor: "#E5E1DA" }} />
        </div>

        {/* Google */}
        <button
          onClick={handleGoogle}
          disabled={googleLoading}
          className="w-full h-12 rounded-[8px] text-[14px] font-medium border transition-colors disabled:opacity-60 flex items-center justify-center gap-3"
          style={{
            backgroundColor: "#FFFFFF",
            borderColor: "#E5E1DA",
            color: "#1A1A18",
          }}
        >
          <svg width="18" height="18" viewBox="0 0 18 18">
            <path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 0 0 2.38-5.88c0-.57-.05-.66-.15-1.18z"/>
            <path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2a4.8 4.8 0 0 1-7.18-2.54H1.83v2.07A8 8 0 0 0 8.98 17z"/>
            <path fill="#FBBC05" d="M4.5 10.52a4.8 4.8 0 0 1 0-3.04V5.41H1.83a8 8 0 0 0 0 7.18z"/>
            <path fill="#EA4335" d="M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 0 0 1.83 5.4L4.5 7.49a4.77 4.77 0 0 1 4.48-3.3z"/>
          </svg>
          {googleLoading ? "Connexion…" : "Continuer avec Google"}
        </button>
      </div>
    </main>
  );
}

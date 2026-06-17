import { useState, useCallback } from "react";
import { Invoice, BillingSettings } from "@/types";

export function usePdfDownload() {
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");

  const downloadPdf = useCallback(async (invoice: Invoice, settings: BillingSettings) => {
    setGenerating(true);
    setError("");
    try {
      const response = await fetch("/api/invoices/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoice, settings }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: "Erreur serveur" }));
        throw new Error(err.error || "Erreur lors de la génération du PDF.");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const filename = invoice.invoiceNumber
        ? `facture-${invoice.invoiceNumber}.pdf`
        : "brouillon.pdf";

      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur lors de la génération du PDF.");
    } finally {
      setGenerating(false);
    }
  }, []);

  return { downloadPdf, generating, error };
}

"use client";

import { useState } from "react";
import { collection, getDocs, deleteDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function AdminResetPage() {
  const [status, setStatus] = useState("");
  const [done, setDone] = useState(false);
  const [running, setRunning] = useState(false);

  async function handleReset() {
    setRunning(true);
    setStatus("Suppression des factures...");

    const invoicesSnap = await getDocs(collection(db, "invoices"));
    for (const invoiceDoc of invoicesSnap.docs) {
      const historySnap = await getDocs(collection(db, "invoices", invoiceDoc.id, "history"));
      for (const h of historySnap.docs) {
        await deleteDoc(doc(db, "invoices", invoiceDoc.id, "history", h.id));
      }
      await deleteDoc(doc(db, "invoices", invoiceDoc.id));
    }
    setStatus(`${invoicesSnap.size} facture(s) supprimée(s). Suppression des clients...`);

    const clientsSnap = await getDocs(collection(db, "clients"));
    for (const clientDoc of clientsSnap.docs) {
      await deleteDoc(doc(db, "clients", clientDoc.id));
    }

    setStatus(`Terminé — ${invoicesSnap.size} facture(s) et ${clientsSnap.size} client(s) supprimés.`);
    setDone(true);
    setRunning(false);
  }

  return (
    <div style={{ padding: 32, maxWidth: 480, margin: "0 auto" }}>
      <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>Réinitialisation des données</h1>
      {!done && (
        <button
          onClick={handleReset}
          disabled={running}
          style={{
            background: "#c0392b",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            padding: "12px 24px",
            fontSize: 16,
            cursor: running ? "not-allowed" : "pointer",
            opacity: running ? 0.6 : 1,
          }}
        >
          {running ? "Suppression en cours..." : "Supprimer tous les clients et factures"}
        </button>
      )}
      {status && (
        <p style={{ marginTop: 16, fontSize: 14, color: done ? "#27ae60" : "#555" }}>{status}</p>
      )}
    </div>
  );
}

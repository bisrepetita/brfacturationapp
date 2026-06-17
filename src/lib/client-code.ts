import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "./firebase";

/**
 * Génère un code client unique de 5 caractères (ex: DUP01)
 * Basé sur les 3 premières lettres du nom + numéro séquentiel
 */
export async function generateClientCode(
  lastName: string | null,
  companyName: string | null
): Promise<string> {
  const base = (lastName || companyName || "CLI")
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // supprimer accents
    .replace(/[^A-Z]/g, "")
    .substring(0, 3)
    .padEnd(3, "X");

  // Chercher les codes existants avec ce préfixe
  const snap = await getDocs(
    query(collection(db, "clients"), where("clientCode", ">=", base), where("clientCode", "<", base + "Z"))
  );

  const existing = snap.docs.map((d) => d.data().clientCode as string);

  // Trouver le prochain numéro disponible
  for (let i = 1; i <= 99; i++) {
    const code = `${base}${String(i).padStart(2, "0")}`;
    if (!existing.includes(code)) return code;
  }

  throw new Error("Impossible de générer un code client unique");
}

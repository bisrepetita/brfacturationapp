import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  serverTimestamp,
  query,
  orderBy,
} from "firebase/firestore";
import { db } from "./firebase";
import { Service, ServiceUnit, VatRate } from "@/types";

function toService(id: string, data: Record<string, unknown>): Service {
  return {
    id,
    name: data.name as string,
    description: (data.description as string) || "",
    defaultPrice: (data.defaultPrice as number) || 0,
    unit: (data.unit as ServiceUnit) || "heure",
    vatApplicable: (data.vatApplicable as boolean) ?? false,
    defaultVatRate: (data.defaultVatRate as VatRate) ?? null,
    createdAt: (data.createdAt as { toDate(): Date })?.toDate() || new Date(),
    updatedAt: (data.updatedAt as { toDate(): Date })?.toDate() || new Date(),
    archivedAt: (data.archivedAt as { toDate(): Date })?.toDate() || null,
  };
}

export async function getServices(includeArchived = false): Promise<Service[]> {
  const q = query(collection(db, "services"), orderBy("name"));
  const snap = await getDocs(q);
  const all = snap.docs.map((d) => toService(d.id, d.data()));
  return includeArchived ? all : all.filter((s) => !s.archivedAt);
}

export async function getService(id: string): Promise<Service | null> {
  const snap = await getDoc(doc(db, "services", id));
  if (!snap.exists()) return null;
  return toService(snap.id, snap.data());
}

export async function createService(
  data: Omit<Service, "id" | "createdAt" | "updatedAt" | "archivedAt">
): Promise<string> {
  const ref = await addDoc(collection(db, "services"), {
    ...data,
    archivedAt: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateService(
  id: string,
  data: Partial<Omit<Service, "id" | "createdAt">>
): Promise<void> {
  await updateDoc(doc(db, "services", id), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function archiveService(id: string): Promise<void> {
  await updateDoc(doc(db, "services", id), {
    archivedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function unarchiveService(id: string): Promise<void> {
  await updateDoc(doc(db, "services", id), {
    archivedAt: null,
    updatedAt: serverTimestamp(),
  });
}

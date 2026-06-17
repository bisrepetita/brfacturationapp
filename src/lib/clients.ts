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
import { Client, ClientType } from "@/types";

function toClient(id: string, data: Record<string, unknown>): Client {
  return {
    id,
    type: data.type as ClientType,
    firstName: (data.firstName as string) || null,
    lastName: (data.lastName as string) || null,
    companyName: (data.companyName as string) || null,
    displayName: data.displayName as string,
    email: data.email as string,
    addressLine1: (data.addressLine1 as string) || "",
    addressLine2: (data.addressLine2 as string) || null,
    postalCode: (data.postalCode as string) || "",
    city: (data.city as string) || "",
    country: (data.country as string) || "CH",
    clientCode: data.clientCode as string,
    nextInvoiceNumber: (data.nextInvoiceNumber as number) || 201,
    createdAt: (data.createdAt as { toDate(): Date })?.toDate() || new Date(),
    updatedAt: (data.updatedAt as { toDate(): Date })?.toDate() || new Date(),
    archivedAt: (data.archivedAt as { toDate(): Date })?.toDate() || null,
  };
}

export async function getClients(includeArchived = false): Promise<Client[]> {
  // Tri côté client pour éviter les index composites Firestore
  const q = query(collection(db, "clients"), orderBy("displayName"));
  const snap = await getDocs(q);
  const all = snap.docs.map((d) => toClient(d.id, d.data()));
  return includeArchived ? all : all.filter((c) => !c.archivedAt);
}

export async function getClient(id: string): Promise<Client | null> {
  const snap = await getDoc(doc(db, "clients", id));
  if (!snap.exists()) return null;
  return toClient(snap.id, snap.data());
}

export async function createClient(
  data: Omit<Client, "id" | "createdAt" | "updatedAt" | "archivedAt" | "nextInvoiceNumber">
): Promise<string> {
  const ref = await addDoc(collection(db, "clients"), {
    ...data,
    nextInvoiceNumber: 201,
    archivedAt: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateClient(
  id: string,
  data: Partial<Omit<Client, "id" | "createdAt" | "clientCode" | "nextInvoiceNumber">>
): Promise<void> {
  await updateDoc(doc(db, "clients", id), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function archiveClient(id: string): Promise<void> {
  await updateDoc(doc(db, "clients", id), {
    archivedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function unarchiveClient(id: string): Promise<void> {
  await updateDoc(doc(db, "clients", id), {
    archivedAt: null,
    updatedAt: serverTimestamp(),
  });
}

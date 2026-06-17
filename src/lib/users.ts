import {
  collection, getDocs, doc, setDoc, deleteDoc, serverTimestamp,
} from "firebase/firestore";
import { db } from "./firebase";
import { User, UserRole } from "@/types";

export interface Invite {
  email: string;
  displayName: string;
  role: UserRole;
  invitedAt: Date;
}

export async function getUsers(): Promise<User[]> {
  const snap = await getDocs(collection(db, "users"));
  return snap.docs.map((d) => ({
    uid: d.id,
    email: d.data().email,
    displayName: d.data().displayName,
    role: d.data().role,
    createdAt: d.data().createdAt?.toDate() || new Date(),
    updatedAt: d.data().updatedAt?.toDate() || new Date(),
  }));
}

export async function getInvites(): Promise<Invite[]> {
  const snap = await getDocs(collection(db, "invites"));
  return snap.docs.map((d) => ({
    email: d.id,
    displayName: d.data().displayName,
    role: d.data().role,
    invitedAt: d.data().invitedAt?.toDate() || new Date(),
  }));
}

export async function createInvite(
  email: string,
  displayName: string,
  role: UserRole
): Promise<void> {
  await setDoc(doc(db, "invites", email), {
    email,
    displayName,
    role,
    invitedAt: serverTimestamp(),
  });
}

export async function removeUser(uid: string): Promise<void> {
  await deleteDoc(doc(db, "users", uid));
}

export async function removeInvite(email: string): Promise<void> {
  await deleteDoc(doc(db, "invites", email));
}

"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  ReactNode,
} from "react";
import {
  User as FirebaseUser,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
} from "firebase/auth";
import { doc, getDoc, setDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { User } from "@/types";

const SUPERADMIN_EMAIL = "brepetitaboxing@gmail.com";

interface AuthContextType {
  firebaseUser: FirebaseUser | null;
  user: User | null;
  loading: boolean;
  authError: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const rejectingRef = useRef(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);

      if (!fbUser) {
        setUser(null);
        if (!rejectingRef.current) setAuthError(null);
        rejectingRef.current = false;
        setLoading(false);
        return;
      }

      // 1. Utilisateur déjà connu en base
      const userDoc = await getDoc(doc(db, "users", fbUser.uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        setUser({
          uid: fbUser.uid,
          email: fbUser.email!,
          displayName: data.displayName || fbUser.displayName || "",
          role: data.role || "admin",
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
        });
        setAuthError(null);
        setLoading(false);
        return;
      }

      // 2. Superadmin — première connexion
      if (fbUser.email === SUPERADMIN_EMAIL) {
        const newUser = {
          email: fbUser.email,
          displayName: fbUser.displayName || "Bis Repetita",
          role: "superadmin" as const,
        };
        await setDoc(doc(db, "users", fbUser.uid), {
          ...newUser,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        setUser({ uid: fbUser.uid, ...newUser, createdAt: new Date(), updatedAt: new Date() });
        setAuthError(null);
        setLoading(false);
        return;
      }

      // 3. Email invité
      const inviteDoc = await getDoc(doc(db, "invites", fbUser.email!));
      if (inviteDoc.exists()) {
        const invite = inviteDoc.data();
        const newUser = {
          email: fbUser.email!,
          displayName: invite.displayName || fbUser.displayName || fbUser.email!.split("@")[0],
          role: invite.role || "admin",
        };
        await setDoc(doc(db, "users", fbUser.uid), {
          ...newUser,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        await deleteDoc(doc(db, "invites", fbUser.email!));
        setUser({ uid: fbUser.uid, ...newUser, createdAt: new Date(), updatedAt: new Date() });
        setAuthError(null);
        setLoading(false);
        return;
      }

      // 4. Non autorisé
      rejectingRef.current = true;
      setAuthError("Accès non autorisé. Contactez l'administrateur.");
      await signOut(auth);
    });

    return unsubscribe;
  }, []);

  const signIn = async (email: string, password: string) => {
    setAuthError(null);
    await signInWithEmailAndPassword(auth, email, password);
  };

  const signInWithGoogle = async () => {
    setAuthError(null);
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  };

  const logout = async () => {
    setAuthError(null);
    await signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ firebaseUser, user, loading, authError, signIn, signInWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

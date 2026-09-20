"use client";
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { useRouter, usePathname } from "next/navigation";
export interface User {
  employeeCode: string;
  email: string;
  name: string;
  role: "MENTEE" | "MENTOR" | "ADMIN";
  department: string;
  designation: string;
  discStyle: string | null;
  isConsentShared: boolean;
  careerGoals: string | null;
  topics: string[];
  challenges: string[];
  availability: string | null;
  commStyleNotes: string | null;
}
interface AuthContextType {
  user: User | null;
  allUsers: User[];
  loading: boolean;
  login: (code: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  refreshAllUsers: () => Promise<void>;
}
const AuthContext = createContext<AuthContextType | undefined>(undefined);
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null),
    [allUsers, setAllUsers] = useState<User[]>([]),
    [loading, setLoading] = useState(true);
  const router = useRouter(),
    pathname = usePathname();
  const refreshAllUsers = useCallback(async () => {
    const r = await fetch("/api/auth/users");
    if (r.ok) setAllUsers((await r.json()).users || []);
  }, []);
  const refreshUser = useCallback(async () => {
    try {
      const r = await fetch("/api/auth/me");
      if (r.ok) {
        const d = await r.json();
        setUser(d.user);
        if (d.user?.role === "ADMIN") await refreshAllUsers();
        else setAllUsers([]);
      } else {
        setUser(null);
        setAllUsers([]);
      }
    } finally {
      setLoading(false);
    }
  }, [refreshAllUsers]);
  useEffect(() => {
    void refreshUser().catch(() => setLoading(false));
  }, [refreshUser]);
  useEffect(() => {
    if (!loading && !user && pathname !== "/login") router.replace("/login");
  }, [loading, user, pathname, router]);
  const logout = async () => {
    const r = await fetch("/api/auth/logout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
    if (!r.ok) {
      alert(
        "Sign out failed. Please retry. / साइन आउट नहीं हुआ। फिर से कोशिश करें।",
      );
      return;
    }
    setUser(null);
    setAllUsers([]);
    router.replace("/login");
  };
  const login = async () => ({
    success: false,
    error:
      "Sign in with your RDC Google account. Persona switching is not supported.",
  });
  return (
    <AuthContext.Provider
      value={{
        user,
        allUsers,
        loading,
        login,
        logout,
        refreshUser,
        refreshAllUsers,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
export function useAuth() {
  const c = useContext(AuthContext);
  if (!c) throw new Error("AuthProvider is missing");
  return c;
}

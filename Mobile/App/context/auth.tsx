import { createContext, ReactNode, useContext, useMemo, useState } from "react";

type AuthContextValue = {
  isLoggedIn: boolean;
  userId: string | null;
  email: string | null;
  username: string | null;
  logIn: (session: { userId: string; email: string; username: string }) => void;
  logOut: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<{
    userId: string;
    email: string;
    username: string;
  } | null>(null);

  const value = useMemo(
    () => ({
      isLoggedIn: session !== null,
      userId: session?.userId ?? null,
      email: session?.email ?? null,
      username: session?.username ?? null,
      logIn: (nextSession: { userId: string; email: string; username: string }) => setSession(nextSession),
      logOut: () => setSession(null),
    }),
    [session]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}

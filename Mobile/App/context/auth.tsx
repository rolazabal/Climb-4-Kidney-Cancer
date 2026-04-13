import * as SecureStore from "expo-secure-store";
import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from "react";

const ACCESS_TOKEN_KEY = "auth_access_token"
const REFRESH_TOKEN_KEY = "auth_refresh_token"

type Session = {
  userId: string;
  email: string;
  username: string;
  accessToken: string;
  refreshToken: string;
}

type AuthContextValue = {
  isLoggedIn: boolean;
  isLoading: boolean;
  userId: string | null;
  email: string | null;
  username: string | null;
  accessToken: string | null;
  logIn: (session: Session) => Promise<void>;
  logOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // On mount, hydrate tokens from secure storage
  useEffect(() => {
    async function hydrate() {
      try {
        const [accessToken, refreshToken] = await Promise.all([
          SecureStore.getItemAsync(ACCESS_TOKEN_KEY),
          SecureStore.getItemAsync(REFRESH_TOKEN_KEY),
        ]);

        if (accessToken && refreshToken) {
          // Decode JWT payload to restore session w/o network call
          const payload = JSON.parse(atob(accessToken.split(".")[1]));
          setSession({
            userId: payload.sub,
            email: payload.email,
            username: "",
            accessToken,
            refreshToken,
          });
        }
      } catch (e) {
        console.warn("Failed to hydrate auth tokens:", e);
      } finally {
        setIsLoading(false);
      }
    }

    hydrate();
  }, []);

  const value = useMemo(
    () => ({
      isLoggedIn: session !== null,
      isLoading,
      userId: session?.userId ?? null,
      email: session?.email ?? null,
      username: session?.username ?? null,
      accessToken: session?.accessToken ?? null,

      logIn: async (nextSession: Session) => {
        await Promise.all([
          SecureStore.setItemAsync(ACCESS_TOKEN_KEY, nextSession.accessToken),
          SecureStore.setItemAsync(REFRESH_TOKEN_KEY, nextSession.refreshToken),
        ]);
        setSession(nextSession);
      },

      logOut: async () => {
        await Promise.all([
          SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY),
          SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
        ]);
        setSession(null);
      },
    }),
    [session, isLoading]
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
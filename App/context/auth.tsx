import * as SecureStore from "expo-secure-store";
import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from "react";
import { AUTH_URL } from "@/constants/api";

const ACCESS_TOKEN_KEY = "auth_access_token";
const REFRESH_TOKEN_KEY = "auth_refresh_token";

type Session = {
  userId: string;
  email: string;
  username: string;
  accessToken: string;
  refreshToken: string;
};

type AuthContextValue = {
  isLoggedIn: boolean;
  isLoading: boolean;
  userId: string | null;
  email: string | null;
  username: string | null;
  accessToken: string | null;
  logIn: (session: Session) => Promise<void>;
  logOut: () => Promise<void>;
  // Update the in-memory username after a successful profile save,
  // so other screens (e.g. Profile tab) reflect it immediately
  // without needing a reload or another network round-trip.
  updateUsername: (newUsername: string) => void;
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

          // Check if access token is expired
          const isExpired = payload.exp * 1000 < Date.now();

          if (isExpired) {
            // Try to refresh proactively before the user hits any screen
            const res = await fetch(`${AUTH_URL}/refresh`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ refresh_token: refreshToken }),
            });

            if (res.ok) {
              const { access_token, refresh_token } = await res.json();
              await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, access_token);
              await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refresh_token);
              const newPayload = JSON.parse(atob(access_token.split(".")[1]));
              setSession({
                userId: newPayload.sub,
                email: newPayload.email,
                username: "",
                accessToken: access_token,
                refreshToken: refresh_token,
              });
            }
            // If refresh fails, fall through — session stays null, user goes to login
          } else {
            setSession({
              userId: payload.sub,
              email: payload.email,
              username: "",
              accessToken,
              refreshToken, // refreshed when the profile screen loads
            });
          }
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

      updateUsername: (newUsername: string) => {
        setSession((prev) => (prev ? { ...prev, username: newUsername } : prev));
      },

      logOut: async () => {
        // Revoke the session on the server first
        try {
          const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
          if (refreshToken) {
            await fetch(`${AUTH_URL}/logout`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ refresh_token: refreshToken }),
          });
        }
        } catch (e) {
          // Non-fatal, clear locally even if server call fails
          console.warn("Failed to revoke session on server:", e);
        }

        // Clear tokens from device regardless
        await Promise.all([
          SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY),
          SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
        ]);
        setSession(null);
      },
    }),
    [session, isLoading]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}
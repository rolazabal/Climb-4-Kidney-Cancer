import * as SecureStore from "expo-secure-store";
import { AUTH_URL } from "@/constants/api";

const ACCESS_TOKEN_KEY = "auth_access_token";
const REFRESH_TOKEN_KEY = "auth_refresh_token";

async function refreshTokens(): Promise<string | null> {
    const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);

    if (!refreshToken) return null;

    const res = await fetch(`${AUTH_URL}/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: refreshToken }),
    });

    if (!res.ok) {
    // Refresh failed, clear everything
    await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
    return null;
  }

  const { access_token, refresh_token } = await res.json();

  await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, access_token);
  await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refresh_token);

  return access_token;
}

export async function apiFetch(
    url: string,
    options: RequestInit = {}
): Promise<Response> {
    const accessToken = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);

    const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
  });

  // If not a 401, return as-is
  if (response.status !== 401) return response;

  // Try to refresh
  const newAccessToken = await refreshTokens();

  if (!newAccessToken) {
    // Refresh failed, caller will handle the 401
    return response;
  }

  // Retry the original request with the new token
  return fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
      Authorization: `Bearer ${newAccessToken}`,
    },
  });
}
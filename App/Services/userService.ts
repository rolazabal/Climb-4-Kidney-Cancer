import * as SecureStore from 'expo-secure-store';
import { apiFetch } from '@/components/apiFetch';
import { USERS_URL } from '@/constants/api';

// Railway Postgres (users-service) is the single source of truth.
// We call the gateway via apiFetch, which attaches the bearer token
// and auto-refreshes on 401.

const ACCESS_TOKEN_KEY = 'auth_access_token';

export type UserProfile = {
  profilePictureUri?: string | null;
  username?: string | null;
  email?: string | null;
  bio?: string | null;
};

type Result = { success: true } | { success: false; error: string };

// Pull { userId, email } out of the stored JWT access token.
// Avoids making settings.tsx pass them in explicitly.
async function getIdentity(): Promise<{ userId: string; email: string } | null> {
  const token = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    if (!payload?.sub || !payload?.email) return null;
    return { userId: payload.sub, email: payload.email };
  } catch {
    return null;
  }
}

export async function getProfile(): Promise<UserProfile> {
  try {
    const identity = await getIdentity();
    if (!identity) return {};

    const res = await apiFetch(
      `${USERS_URL}/by-email/${encodeURIComponent(identity.email)}`
    );
    if (!res.ok) return {};

    const data = await res.json();
    return {
      username: data.username ?? null,
      email: data.email ?? null,
      bio: data.bio ?? null,
      // Backend is assumed to return snake_case. Adjust if yours is different.
      profilePictureUri: data.profile_picture ?? null,
    };
  } catch {
    return {};
  }
}

export async function updateProfile(partial: Partial<UserProfile>): Promise<Result> {
  try {
    const identity = await getIdentity();
    if (!identity) {
      return { success: false, error: 'Not signed in' };
    }

    // Map frontend field names -> backend snake_case.
    const body: Record<string, unknown> = {};
    if (partial.username !== undefined) body.username = partial.username;
    if (partial.email !== undefined) body.email = partial.email;
    if (partial.bio !== undefined) body.bio = partial.bio;
    if (partial.profilePictureUri !== undefined) {
      body.profile_picture = partial.profilePictureUri;
    }

    if (Object.keys(body).length === 0) {
      return { success: true };
    }

    const res = await apiFetch(`${USERS_URL}/${identity.userId}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });

    if (res.status === 409) {
      return { success: false, error: 'That username or email is already taken' };
    }
    if (res.status === 401) {
      return { success: false, error: 'Session expired. Please log in again.' };
    }
    if (!res.ok) {
      let detail = '';
      try {
        const j = await res.json();
        detail = j?.detail ?? '';
      } catch {
        // ignore parse errors
      }
      return { success: false, error: detail || `Failed to save (${res.status})` };
    }

    return { success: true };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : 'Failed to save profile',
    };
  }
}

// Password change is not supported yet. The auth service uses OTP-based login
// (request-login / verify-login), so there is no password endpoint to call.
// Returning a disabled result makes this fail loudly instead of silently
// writing to local storage like the old stub did.
export async function updatePassword(
  _currentPassword: string,
  _newPassword: string
): Promise<Result> {
  return {
    success: false,
    error: 'Password change is not available yet.',
  };
}

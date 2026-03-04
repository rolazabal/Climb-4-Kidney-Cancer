import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  profilePicture: '@user_profile_picture',
  username: '@user_username',
  email: '@user_email',
  bio: '@user_bio',
  password: '@user_password',
} as const;

export type UserProfile = {
  profilePictureUri?: string | null;
  username?: string | null;
  email?: string | null;
  bio?: string | null;
  firstName?: string | null;
  lastName?: string | null;
};

type Result = { success: true } | { success: false; error: string };

export async function getProfile(): Promise<UserProfile> {
  try {
    // TODO: Replace with backend API calls
    const [profilePictureUri, username, email, bio] = await Promise.all([
      AsyncStorage.getItem(KEYS.profilePicture),
      AsyncStorage.getItem(KEYS.username),
      AsyncStorage.getItem(KEYS.email),
      AsyncStorage.getItem(KEYS.bio),
    ]);
    return { profilePictureUri, username, email, bio };
  } catch (e) {
    return {};
  }
}

export async function updateProfile(partial: Partial<UserProfile>): Promise<Result> {
  try {
    // TODO: Replace with backend API calls
    const updates: Promise<void>[] = [];
    if (partial.profilePictureUri !== undefined) {
      updates.push(AsyncStorage.setItem(KEYS.profilePicture, partial.profilePictureUri ?? ''));
    }
    if (partial.username !== undefined) {
      updates.push(AsyncStorage.setItem(KEYS.username, partial.username ?? ''));
    }
    if (partial.email !== undefined) {
      updates.push(AsyncStorage.setItem(KEYS.email, partial.email ?? ''));
    }
    if (partial.bio !== undefined) {
      updates.push(AsyncStorage.setItem(KEYS.bio, partial.bio ?? ''));
    }
    await Promise.all(updates);
    return { success: true };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : 'Failed to save profile',
    };
  }
}

/**
 * Temporary simulation only. Stores password locally for demo purposes.
 * TODO: Replace with backend API calls for real auth.
 */
export async function updatePassword(currentPassword: string, newPassword: string): Promise<Result> {
  try {
    // TODO: Replace with backend API calls
    const stored = await AsyncStorage.getItem(KEYS.password);
    if (stored !== null && stored !== currentPassword) {
      return { success: false, error: 'Current password is incorrect' };
    }
    await AsyncStorage.setItem(KEYS.password, newPassword);
    return { success: true };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : 'Failed to update password',
    };
  }
}

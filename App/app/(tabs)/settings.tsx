//use state: make it reactive to user input
//use effect: load profile data on mount
//use callback: Prevents Unnecessary Re-Creation of Functions
import { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Platform,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
  KeyboardAvoidingView as RNKeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { User, Settings as SettingsIcon, Save, LogOut } from 'lucide-react-native';
import { router } from 'expo-router';

import { AppText } from './_layout';
import { EditableField } from '@/components/EditableField';
import { getProfile, updateProfile } from '@/Services/userService';
import {
  validateUsername,
  validateEmail,
  validateBio,
} from '@/lib/validation';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/context/auth';
const c = Colors.light;

const KeyboardAvoidingView = RNKeyboardAvoidingView as React.ComponentType<{
  style?: object;
  behavior?: 'padding' | 'height' | 'position';
  keyboardVerticalOffset?: number;
  children?: React.ReactNode;
}>;

//bio character limit
const BIO_MAX = 150;

export default function SettingsScreen() {
  const { logOut } = useAuth();
  //fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [bio, setBio] = useState('');
  const [profilePictureUri, setProfilePictureUri] = useState<string | null>(null);
  //real-time validation errors
  const [usernameError, setUsernameError] = useState<string | undefined>();
  const [emailError, setEmailError] = useState<string | undefined>();
  const [bioError, setBioError] = useState<string | undefined>();
  //prevent multiple saves and show loading state
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const loadProfile = useCallback(async () => {
    try {
      const profile = await getProfile();
      setFirstName(profile.firstName ?? '');
      setLastName(profile.lastName ?? '');
      setUsername(profile.username ?? '');
      setEmail(profile.email ?? '');
      setBio(profile.bio ?? '');
      setProfilePictureUri(profile.profilePictureUri ?? null);
    } catch {
      // AsyncStorage failure handled silently on load; user sees empty form
    } finally {
      setIsLoading(false);
    }
  }, []);
  //load profile automstically.
  useEffect(() => {
    loadProfile();
  }, [loadProfile]);
  //profile picture. ask permission, open gallery, crop, and save uri to state. show alert if permission denied
  const pickImage = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow access to your photo library to choose a profile picture.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setProfilePictureUri(result.assets[0].uri);
    }
  }, []);
  //checks validity of all fields (username, email, password, bio)and sets error messages
  const runValidation = useCallback(() => {
    let valid = true;

    if (username.trim()) {
      const u = validateUsername(username);
      setUsernameError(u.error);
      if (!u.valid) valid = false;
    } else {
      setUsernameError(undefined);
    }

    if (email.trim()) {
      const e = validateEmail(email);
      setEmailError(e.error);
      if (!e.valid) valid = false;
    } else {
      setEmailError(undefined);
    }

    const b = validateBio(bio);
    setBioError(b.error);
    if (!b.valid) valid = false;

    return valid;
  }, [username, email, bio]);
  //change only when any field changes. (changes are valid)
  const hasEdits =
    firstName.trim() !== '' ||
    lastName.trim() !== '' ||
    username.trim() !== '' ||
    email.trim() !== '' ||
    bio.trim() !== '' ||
    profilePictureUri !== null;

  const canSave = hasEdits && !isSaving && !usernameError && !emailError && !bioError;
  //validate, send changed fields, and show success or error alert. stop load.
  const handleSave = useCallback(async () => {
    if (!canSave || isSaving) return;
    if (!runValidation()) return;

    setIsSaving(true);
    try {
      const updates: Parameters<typeof updateProfile>[0] = {};
      if (firstName.trim()) updates.firstName = firstName.trim();
      if (lastName.trim()) updates.lastName = lastName.trim();
      if (username.trim()) updates.username = username.trim();
      if (email.trim()) updates.email = email.trim();
      updates.bio = bio;
      if (profilePictureUri !== null) updates.profilePictureUri = profilePictureUri;

      if (Object.keys(updates).length > 0) {
        const result = await updateProfile(updates);
        if (!result.success) {
          Alert.alert('Error', result.error ?? 'Failed to save');
          return;
        }
      }
      Alert.alert('Success', 'Your settings have been saved.');
    } catch {
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }, [canSave, isSaving, runValidation, firstName, lastName, username, email, bio, profilePictureUri]);

  const handleLogout = useCallback(() => {
    Alert.alert('Log out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log out',
        style: 'destructive',
        onPress: async () => {
          await logOut();
          router.replace('/login');
        },
      },
    ]);
  }, [logOut]);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={c.tint} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <AppText style={styles.title}>Settings</AppText>
            <AppText style={styles.subtitle}>Manage your account preferences.</AppText>
          </View>

          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <User size={18} color={c.heading} />
              <AppText style={styles.cardTitle}>Account Information</AppText>
            </View>
            <EditableField
              label="First Name"
              value={firstName}
              onChangeText={setFirstName}
              placeholder="Enter your first name"
            />
            <EditableField
              label="Last Name"
              value={lastName}
              onChangeText={setLastName}
              placeholder="Enter your last name"
            />
            <AppText style={styles.fieldLabel}>Email</AppText>
            <AppText style={styles.readOnlyValue}>{email || '—'}</AppText>
            <View style={styles.roleBadge}>
              <AppText style={styles.roleText}>admin</AppText>
            </View>
          </View>

          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <SettingsIcon size={18} color={c.heading} />
              <AppText style={styles.cardTitle}>Profile Settings</AppText>
            </View>

            <EditableField
              label="Username"
              value={username}
              onChangeText={(t) => {
                setUsername(t);
                if (usernameError) setUsernameError(validateUsername(t).error);
              }}
              placeholder="Choose a username"
              error={usernameError}
              onBlur={() => username.trim() && setUsernameError(validateUsername(username).error)}
            />

            <EditableField
              label="Link Email"
              value={email}
              onChangeText={(t) => {
                setEmail(t);
                if (emailError) setEmailError(validateEmail(t).error);
              }}
              placeholder="your@email.com"
              error={emailError}
              onBlur={() => email.trim() && setEmailError(validateEmail(email).error)}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />

            <EditableField
              label="Bio"
              value={bio}
              onChangeText={(t) => {
                setBio(t);
                if (bioError) setBioError(validateBio(t).error);
              }}
              placeholder="Tell us about yourself..."
              error={bioError}
              multiline
              maxLength={BIO_MAX}
              showCharCount
            />

            <AppText style={styles.fieldLabel}>Profile Picture</AppText>
            <View style={styles.profilePictureRow}>
              {profilePictureUri ? (
                <Image source={{ uri: profilePictureUri }} style={styles.previewImage} />
              ) : (
                <View style={styles.previewPlaceholder} />
              )}
              <TouchableOpacity style={styles.chooseButton} onPress={pickImage} disabled={isSaving}>
                <AppText style={styles.chooseButtonText}>Choose File</AppText>
              </TouchableOpacity>
              <AppText style={styles.fileHint}>{profilePictureUri ? 'Image selected' : 'no file selected'}</AppText>
            </View>

            <TouchableOpacity
              style={[styles.saveButton, (!canSave || isSaving) && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={!canSave || isSaving}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color={c.onPrimary} />
              ) : (
                <Save size={18} color={c.onPrimary} />
              )}
              <AppText style={styles.saveButtonText}>{isSaving ? 'Saving...' : 'Save Changes'}</AppText>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.logoutLink} onPress={handleLogout}>
            <LogOut size={16} color="#B91C1C" />
            <AppText style={styles.logoutText}>Logout</AppText>
          </TouchableOpacity>

          <View style={styles.bottomSpacer} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: c.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 32,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 44,
    fontWeight: "700",
    color: c.heading,
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 18,
    color: c.subtitle,
  },
  card: {
    backgroundColor: c.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    shadowColor: c.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: c.heading,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: c.heading,
    marginBottom: 6,
  },
  readOnlyValue: {
    fontSize: 16,
    color: c.text,
    marginBottom: 12,
  },
  roleBadge: {
    alignSelf: 'flex-start',
    backgroundColor: c.tint,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  roleText: {
    fontSize: 12,
    fontWeight: '600',
    color: c.onPrimary,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: c.heading,
    marginBottom: 8,
    marginTop: 4,
  },
  profilePictureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 12,
  },
  previewImage: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  previewPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: c.surfaceMuted,
  },
  chooseButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: c.surfaceMuted,
    borderRadius: 10,
  },
  chooseButtonText: {
    fontSize: 14,
    color: c.heading,
    fontWeight: '700',
  },
  fileHint: {
    fontSize: 14,
    color: c.subtitle,
    flex: 1,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: c.tint,
    minHeight: 56,
    borderRadius: 14,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: c.onPrimary,
  },
  logoutLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 12,
  },
  logoutText: {
    fontSize: 16,
    color: '#B91C1C',
    fontWeight: '500',
  },
  bottomSpacer: {
    height: 40,
  },
});

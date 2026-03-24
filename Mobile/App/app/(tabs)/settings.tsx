//use state: make it reactive to user input
//use effect: load profile data on mount
//use callback: Prevents Unnecessary Re-Creation of Functions
import { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { User, Settings as SettingsIcon, Save, LogOut } from 'lucide-react-native';

import { AppText } from './_layout';
import { EditableField } from '@/components/EditableField';
import { getProfile, updateProfile, updatePassword } from '@/Services/userService';
import {
  validateUsername,
  validateEmail,
  validatePassword,
  validateBio,
} from '@/lib/validation';

const theme = {
  primary: 'rgb(51, 51, 51)',
  secondary: 'rgb(224, 222, 222)',
  accent: 'rgb(205, 88, 56)',
  white: '#FFFFFF',
  background: 'rgb(128, 128, 128)',
  subtle: 'rgb(102, 102, 101)',
};
//bio character limit
const BIO_MAX = 150;

export default function SettingsScreen() {
  //fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [bio, setBio] = useState('');
  const [profilePictureUri, setProfilePictureUri] = useState<string | null>(null);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  //real-time validation errors
  const [usernameError, setUsernameError] = useState<string | undefined>();
  const [emailError, setEmailError] = useState<string | undefined>();
  const [passwordError, setPasswordError] = useState<string | undefined>();
  const [confirmPasswordError, setConfirmPasswordError] = useState<string | undefined>();
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

    if (newPassword || currentPassword || confirmPassword) {
      if (!currentPassword) {
        setPasswordError('Enter your current password');
        valid = false;
      } else {
        setPasswordError(undefined);
      }
      if (newPassword) {
        const p = validatePassword(newPassword);
        setPasswordError(p.error);
        if (!p.valid) valid = false;
      }
      if (newPassword && confirmPassword !== newPassword) {
        setConfirmPasswordError('Password does not match');
        valid = false;
      } else {
        setConfirmPasswordError(undefined);
      }
    } else {
      setPasswordError(undefined);
      setConfirmPasswordError(undefined);
    }

    const b = validateBio(bio);
    setBioError(b.error);
    if (!b.valid) valid = false;

    return valid;
  }, [username, email, currentPassword, newPassword, confirmPassword, bio]);
  //change only when any field changes. (changes are valid)
  const hasEdits =
    firstName.trim() !== '' ||
    lastName.trim() !== '' ||
    username.trim() !== '' ||
    email.trim() !== '' ||
    bio.trim() !== '' ||
    profilePictureUri !== null ||
    newPassword !== '';

  const canSave = hasEdits && !isSaving && !usernameError && !emailError && !passwordError && !confirmPasswordError && !bioError;
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
      //update password.
      if (newPassword && currentPassword) {
        const pResult = await updatePassword(currentPassword, newPassword);
        if (!pResult.success) {
          Alert.alert('Error', pResult.error ?? 'Failed to update password');
          return;
        }
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setPasswordError(undefined);
        setConfirmPasswordError(undefined);
      }

      Alert.alert('Success', 'Your settings have been saved.');
    } catch {
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }, [canSave, isSaving, runValidation, firstName, lastName, username, email, bio, profilePictureUri, newPassword, currentPassword]);
  //backend not implemented yet. 
  const handleLogout = useCallback(() => {
    Alert.alert('Log out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log out', style: 'destructive', onPress: () => {} },
    ]);
  }, []);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.accent} />
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
              <User size={18} color={theme.primary} />
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
              <SettingsIcon size={18} color={theme.primary} />
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

            <AppText style={styles.sectionLabel}>Change Password:</AppText>
            <EditableField
              label="Current password"
              value={currentPassword}
              onChangeText={setCurrentPassword}
              placeholder="Enter current password"
              secureTextEntry
            />
            <EditableField
              label="New password"
              value={newPassword}
              onChangeText={(t) => {
                setNewPassword(t);
                if (passwordError) setPasswordError(validatePassword(t).error);
              }}
              placeholder="Min 8 characters, one number"
              error={passwordError}
              secureTextEntry
            />
            <EditableField
              label="Confirm password"
              value={confirmPassword}
              onChangeText={(t) => {
                setConfirmPassword(t);
                if (confirmPasswordError && t === newPassword) setConfirmPasswordError(undefined);
              }}
              placeholder="Confirm new password"
              error={confirmPasswordError}
              secureTextEntry
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
                <ActivityIndicator size="small" color={theme.white} />
              ) : (
                <Save size={18} color={theme.white} />
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
    backgroundColor: '#F9FAFB',
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
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
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.primary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: theme.subtle,
  },
  card: {
    backgroundColor: theme.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.secondary,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.primary,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.primary,
    marginBottom: 6,
  },
  readOnlyValue: {
    fontSize: 16,
    color: theme.primary,
    marginBottom: 12,
  },
  roleBadge: {
    alignSelf: 'flex-start',
    backgroundColor: theme.accent,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  roleText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.white,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.primary,
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
    backgroundColor: theme.secondary,
  },
  chooseButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: theme.secondary,
    borderRadius: 8,
  },
  chooseButtonText: {
    fontSize: 14,
    color: theme.primary,
    fontWeight: '500',
  },
  fileHint: {
    fontSize: 14,
    color: theme.subtle,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.accent,
    paddingVertical: 14,
    borderRadius: 10,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.white,
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
import { useNavigation } from "@react-navigation/native";
import { Stack, router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Colors } from "@/constants/theme";

const c = Colors.light;

export default function EditProfileScreen() {
  const params = useLocalSearchParams<{ username?: string; email?: string }>();
  const navigation = useNavigation();
  const allowExitRef = useRef(false);
  const initialUsername = typeof params.username === "string" ? params.username : "";
  const initialEmail = typeof params.email === "string" ? params.email : "";
  const [username, setUsername] = useState(initialUsername);
  const [email, setEmail] = useState(initialEmail);
  const trimmedEmail = email.trim();
  const emailIsValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail);
  const showEmailError = trimmedEmail.length > 0 && !emailIsValid;

  useEffect(() => {
    const unsubscribe = navigation.addListener("beforeRemove", (event) => {
      if (allowExitRef.current) {
        return;
      }
      event.preventDefault();
    });

    return unsubscribe;
  }, [navigation]);

  const onSave = () => {
    if (!emailIsValid) {
      return;
    }

    allowExitRef.current = true;
    router.replace({
      pathname: "/",
      params: {
        username: username.trim(),
        email: trimmedEmail,
      },
    });
  };

  const onCancel = () => {
    allowExitRef.current = true;
    router.replace({
      pathname: "/",
      params: {
        username: initialUsername.trim(),
        email: initialEmail.trim(),
      },
    });
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: "Edit Profile",
          headerBackVisible: false,
          gestureEnabled: false,
        }}
      />
      <KeyboardAvoidingView
        style={styles.screen}
        behavior={Platform.select({ ios: "padding", android: undefined })}
      >
        <SafeAreaView style={styles.screen} edges={["top"]}>
          <ScrollView contentContainerStyle={styles.content}>
            <Text style={styles.title}>Edit Profile</Text>
            <Text style={styles.subtitle}>Update your username and email</Text>

            <View style={styles.card}>
              <Text style={styles.label}>Username</Text>
              <TextInput
                value={username}
                onChangeText={setUsername}
                placeholder="Enter a username"
                autoCapitalize="none"
                style={styles.input}
              />

              <Text style={styles.label}>Email</Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="Enter an email"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                style={styles.input}
              />
              {showEmailError ? (
                <Text style={styles.errorText}>Enter a valid email address.</Text>
              ) : null}

              <View style={styles.actionsRow}>
                <Pressable style={styles.cancelButton} onPress={onCancel}>
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </Pressable>
                <Pressable
                  style={[styles.saveButton, !emailIsValid && styles.saveButtonDisabled]}
                  onPress={onSave}
                  disabled={!emailIsValid}
                >
                  <Text style={styles.saveButtonText}>Save Profile</Text>
                </Pressable>
              </View>
            </View>
          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: c.background,
  },
  content: {
    padding: 16,
  },
  title: {
    fontSize: 34,
    fontWeight: "700",
    color: c.heading,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 18,
    color: c.subtitle,
    marginBottom: 16,
  },
  card: {
    backgroundColor: c.surface,
    borderRadius: 16,
    padding: 16,
    shadowColor: c.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  label: {
    fontSize: 14,
    fontWeight: "700",
    color: c.text,
    marginBottom: 6,
    marginTop: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 10,
    height: 46,
    paddingHorizontal: 12,
    fontSize: 16,
    color: c.text,
    backgroundColor: c.inputBackground,
  },
  saveButton: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    backgroundColor: c.tint,
    alignItems: "center",
    justifyContent: "center",
  },
  saveButtonDisabled: {
    backgroundColor: c.disabled,
  },
  saveButtonText: {
    color: c.onPrimary,
    fontSize: 16,
    fontWeight: "700",
  },
  actionsRow: {
    marginTop: 18,
    flexDirection: "row",
    gap: 10,
  },
  cancelButton: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: c.tint,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: c.surface,
  },
  cancelButtonText: {
    color: c.tint,
    fontSize: 16,
    fontWeight: "700",
  },
  errorText: {
    marginTop: 6,
    color: c.error,
    fontSize: 13,
    fontWeight: "600",
  },
});

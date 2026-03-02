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
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#ECEDEE",
  },
  content: {
    padding: 16,
  },
  title: {
    fontSize: 34,
    fontWeight: "700",
    color: "#2F2F2F",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 18,
    color: "#666666",
    marginBottom: 16,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#0E1A18",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  label: {
    fontSize: 14,
    fontWeight: "700",
    color: "#4A4A4A",
    marginBottom: 6,
    marginTop: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: "#D6D6D6",
    borderRadius: 10,
    height: 46,
    paddingHorizontal: 12,
    fontSize: 16,
    color: "#2D2D2D",
    backgroundColor: "#FAFAFA",
  },
  saveButton: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#C76341",
    alignItems: "center",
    justifyContent: "center",
  },
  saveButtonDisabled: {
    backgroundColor: "#D7A795",
  },
  saveButtonText: {
    color: "#FFFFFF",
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
    borderColor: "#C76341",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  cancelButtonText: {
    color: "#C76341",
    fontSize: 16,
    fontWeight: "700",
  },
  errorText: {
    marginTop: 6,
    color: "#B33A2B",
    fontSize: 13,
    fontWeight: "600",
  },
});

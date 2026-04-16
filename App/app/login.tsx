import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { USERS_URL } from "@/constants/api";
import { Colors } from "@/constants/theme";
import { useAuth } from "@/context/auth";

const c = Colors.light;

type UserLookupResponse = {
  uuid?: string;
  username?: string;
};

type CreateUserResponse = {
  id?: string;
};

export default function LoginScreen() {
  const [mode, setMode] = useState<"login" | "create">("login");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isCreatingAccount = mode === "create";
  const { logIn } = useAuth();

  const resetFormError = () => {
    if (errorMessage) {
      setErrorMessage(null);
    }
  };

  async function handleLogIn() {
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedUsername = username.trim();

    if (!normalizedEmail || !normalizedUsername) {
      setErrorMessage("Enter both email and username.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const response = await fetch(`${USERS_URL}/users/by-email/${encodeURIComponent(normalizedEmail)}`);

      if (response.status === 404) {
        setErrorMessage("No user found for that email.");
        return;
      }

      if (!response.ok) {
        throw new Error(`Failed to log in: ${response.status}`);
      }

      const user: UserLookupResponse = await response.json();

      if (!user.uuid || user.username !== normalizedUsername) {
        setErrorMessage("Email and username do not match.");
        return;
      }

      logIn({
        userId: user.uuid,
        email: normalizedEmail,
        username: normalizedUsername,
      });
    } catch (error) {
      console.log("Failed to log in:", error);
      setErrorMessage("Could not log in right now.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleCreateAccount() {
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedUsername = username.trim();

    if (!normalizedEmail || !normalizedUsername) {
      setErrorMessage("Enter both email and username.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const response = await fetch(`${USERS_URL}/users/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: normalizedEmail,
          username: normalizedUsername,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to create user: ${response.status}`);
      }

      const result: CreateUserResponse = await response.json();

      if (!result.id) {
        throw new Error("User creation response did not include an id");
      }

      logIn({
        userId: result.id,
        email: normalizedEmail,
        username: normalizedUsername,
      });
    } catch (error) {
      console.log("Failed to create account:", error);
      setErrorMessage("Could not create account right now.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSubmit() {
    if (isSubmitting) {
      return;
    }

    if (isCreatingAccount) {
      await handleCreateAccount();
      return;
    }

    await handleLogIn();
  }

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <View style={styles.content}>
        <Text style={styles.pageTitle}>{isCreatingAccount ? "Create Account" : "Log In"}</Text>
        <Text style={styles.pageSubtitle}>
          {isCreatingAccount
            ? "Set an email and username for your new account."
            : "Enter your email and username to continue."}
        </Text>

        <View style={styles.formCard}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            autoCapitalize="none"
            keyboardType="email-address"
            onChangeText={(value) => {
              resetFormError();
              setEmail(value);
            }}
            placeholder="name@example.com"
            placeholderTextColor={c.icon}
            style={styles.input}
            value={email}
          />

          <Text style={styles.label}>Username</Text>
          <TextInput
            autoCapitalize="none"
            onChangeText={(value) => {
              resetFormError();
              setUsername(value);
            }}
            placeholder={isCreatingAccount ? "new_username" : "username"}
            placeholderTextColor={c.icon}
            style={styles.input}
            value={username}
          />

          {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

          <Pressable onPress={handleSubmit} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>
              {isSubmitting ? "Submitting..." : isCreatingAccount ? "Create Account" : "Log In"}
            </Text>
          </Pressable>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            {isCreatingAccount ? "Already have an account?" : "Don&apos;t have an account?"}
          </Text>
          <Pressable
            onPress={() => {
              setErrorMessage(null);
              setMode((current) => (current === "login" ? "create" : "login"));
            }}
            style={styles.linkButton}
          >
            <Text style={styles.linkButtonText}>
              {isCreatingAccount ? "Back to Log In" : "Create New Account"}
            </Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: c.background,
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: "center",
  },
  pageTitle: {
    fontSize: 40,
    fontWeight: "700",
    color: c.heading,
    marginBottom: 8,
  },
  pageSubtitle: {
    fontSize: 18,
    color: c.subtitle,
    marginBottom: 24,
  },
  formCard: {
    backgroundColor: c.surface,
    borderRadius: 16,
    padding: 18,
    shadowColor: c.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  label: {
    fontSize: 15,
    fontWeight: "600",
    color: c.heading,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.inputBackground,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 16,
    color: c.text,
    marginBottom: 16,
  },
  primaryButton: {
    backgroundColor: c.tint,
    borderRadius: 12,
    minHeight: 52,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 4,
  },
  primaryButtonText: {
    color: c.onPrimary,
    fontSize: 16,
    fontWeight: "700",
  },
  errorText: {
    color: c.error,
    fontSize: 14,
    marginBottom: 12,
  },
  footer: {
    marginTop: 24,
    alignItems: "center",
  },
  footerText: {
    color: c.subtitle,
    fontSize: 15,
    marginBottom: 10,
  },
  linkButton: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: c.tint,
  },
  linkButtonText: {
    color: c.tint,
    fontSize: 15,
    fontWeight: "700",
  },
});

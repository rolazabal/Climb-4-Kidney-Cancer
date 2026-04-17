import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { AUTH_URL, USERS_URL } from "@/constants/api";
import { Colors } from "@/constants/theme";
import { useAuth } from "@/context/auth";

const c = Colors.light;

type Step = "email" | "otp";
type Mode = "login" | "create";

export default function LoginScreen() {
  const [mode, setMode] = useState<Mode>("login");
  const [step, setStep] = useState<Step>("email");

  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [otp, setOtp] = useState("");

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { logIn } = useAuth();
  const isCreatingAccount = mode === "create";

  const clearError = () => setErrorMessage(null);

  async function handleEmailSubmit() {
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedUsername = username.trim();

    if (!normalizedEmail || (isCreatingAccount && !normalizedUsername)) {
      setErrorMessage(isCreatingAccount ? "Enter both email and username." : "Enter your email.");
      return;
    }

    setIsSubmitting(true);
    clearError();

    try {
      if (isCreatingAccount) {
        const res = await fetch(`${USERS_URL}/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: normalizedEmail, username: normalizedUsername }),
        });

        if (res.status === 409) {
          setErrorMessage("That email or username is already taken.");
          return;
        }
        if (!res.ok) {
          throw new Error(`Create user failed: ${res.status}`);
        }
      }

      const otpRes = await fetch(`${AUTH_URL}/request-login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalizedEmail }),
      });

      if (otpRes.status === 404) {
        setErrorMessage("No account found for that email.");
        return;
      }
      if (otpRes.status === 429) {
        setErrorMessage("Please wait a moment before requesting another code.");
        return;
      }
      if (!otpRes.ok) {
        throw new Error(`Request OTP failed: ${otpRes.status}`);
      }

      setStep("otp");
    } catch (err) {
      console.error(err);
      setErrorMessage("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleOtpSubmit() {
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedOtp = otp.trim();

    if (normalizedOtp.length !== 6) {
      setErrorMessage("Enter the 6-digit code from your email.");
      return;
    }

    setIsSubmitting(true);
    clearError();

    try {
      const res = await fetch(`${AUTH_URL}/verify-login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalizedEmail, code: normalizedOtp }),
      });

      if (res.status === 401) {
        setErrorMessage("Incorrect code. Please try again.");
        return;
      }
      if (res.status === 429) {
        setErrorMessage("Too many attempts. Request a new code.");
        return;
      }
      if (!res.ok) {
        throw new Error(`Verify OTP failed: ${res.status}`);
      }

      const { access_token, refresh_token } = await res.json();
      const payload = JSON.parse(atob(access_token.split(".")[1]));

      let resolvedUsername = username.trim();
      if (!resolvedUsername) {
        try {
          const userRes = await fetch(`${USERS_URL}/by-email/${encodeURIComponent(normalizedEmail)}`, {
            headers: { Authorization: `Bearer ${access_token}` },
          });
          if (userRes.ok) {
            const user = await userRes.json();
            resolvedUsername = user.username ?? "";
          }
        } catch {
          // non-fatal — username will be populated later on the profile screen
        }
      }

      await logIn({
        userId: payload.sub,
        email: normalizedEmail,
        username: resolvedUsername,
        accessToken: access_token,
        refreshToken: refresh_token,
      });

      router.replace("/(tabs)/climbs");
    } catch (err) {
      console.error(err);
      setErrorMessage("Could not verify code. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleResend() {
    setOtp("");
    setStep("email");
    clearError();
  }

  if (step === "otp") {
    return (
      <SafeAreaView style={styles.screen} edges={["top"]}>
        <View style={styles.content}>
          <Text style={styles.pageTitle}>Check your email</Text>
          <Text style={styles.pageSubtitle}>
            We sent a 6-digit code to{" "}
            <Text style={{ fontWeight: "700" }}>{email.trim().toLowerCase()}</Text>
          </Text>

          <View style={styles.formCard}>
            <Text style={styles.label}>Verification Code</Text>
            <TextInput
              autoFocus
              keyboardType="number-pad"
              maxLength={6}
              onChangeText={(v) => { clearError(); setOtp(v); }}
              placeholder="123456"
              placeholderTextColor={c.icon}
              style={[styles.input, styles.otpInput]}
              value={otp}
            />

            {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

            <Pressable onPress={handleOtpSubmit} style={styles.primaryButton}>
              <Text style={styles.primaryButtonText}>
                {isSubmitting ? "Verifying..." : "Verify Code"}
              </Text>
            </Pressable>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Didn&apos;t receive the code?</Text>
            <Pressable onPress={handleResend} style={styles.linkButton}>
              <Text style={styles.linkButtonText}>Resend Code</Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <View style={styles.content}>
        <Text style={styles.pageTitle}>{isCreatingAccount ? "Create Account" : "Log In"}</Text>
        <Text style={styles.pageSubtitle}>
          {isCreatingAccount
            ? "Set an email and username for your new account."
            : "We'll send a verification code to your email."}
        </Text>

        <View style={styles.formCard}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            autoCapitalize="none"
            keyboardType="email-address"
            onChangeText={(v) => { clearError(); setEmail(v); }}
            placeholder="name@example.com"
            placeholderTextColor={c.icon}
            style={styles.input}
            value={email}
          />

          {isCreatingAccount && (
            <>
              <Text style={styles.label}>Username</Text>
              <TextInput
                autoCapitalize="none"
                onChangeText={(v) => { clearError(); setUsername(v); }}
                placeholder="new_username"
                placeholderTextColor={c.icon}
                style={styles.input}
                value={username}
              />
            </>
          )}

          {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

          <Pressable onPress={handleEmailSubmit} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>
              {isSubmitting
                ? "Sending..."
                : isCreatingAccount
                ? "Create Account"
                : "Send Code"}
            </Text>
          </Pressable>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            {isCreatingAccount ? "Already have an account?" : "Don't have an account?"}
          </Text>
          <Pressable
            onPress={() => { clearError(); setMode((m) => (m === "login" ? "create" : "login")); }}
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
  otpInput: {
    fontSize: 28,
    fontWeight: "700",
    letterSpacing: 8,
    textAlign: "center",
  },
});

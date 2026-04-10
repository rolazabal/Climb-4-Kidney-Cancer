import { Link } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Colors } from "@/constants/theme";

const c = Colors.light;

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <View style={styles.content}>
        <Text style={styles.pageTitle}>Log In</Text>
        <Text style={styles.pageSubtitle}>Enter your email and username to continue.</Text>

        <View style={styles.formCard}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            autoCapitalize="none"
            keyboardType="email-address"
            onChangeText={setEmail}
            placeholder="name@example.com"
            placeholderTextColor={c.icon}
            style={styles.input}
            value={email}
          />

          <Text style={styles.label}>Username</Text>
          <TextInput
            autoCapitalize="none"
            onChangeText={setUsername}
            placeholder="username"
            placeholderTextColor={c.icon}
            style={styles.input}
            value={username}
          />

          <Pressable style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>Log In</Text>
          </Pressable>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Don&apos;t have an account?</Text>
          <Link href="/create-account" asChild>
            <Pressable style={styles.linkButton}>
              <Text style={styles.linkButtonText}>Create New Account</Text>
            </Pressable>
          </Link>
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

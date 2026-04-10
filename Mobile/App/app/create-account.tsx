import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Colors } from "@/constants/theme";

const c = Colors.light;

export default function CreateAccountScreen() {
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <View style={styles.content}>
        <Text style={styles.pageTitle}>Create Account</Text>
        <Text style={styles.pageSubtitle}>Set an email and username for your new account.</Text>

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
            placeholder="new_username"
            placeholderTextColor={c.icon}
            style={styles.input}
            value={username}
          />

          <Pressable style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>Create Account</Text>
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
});

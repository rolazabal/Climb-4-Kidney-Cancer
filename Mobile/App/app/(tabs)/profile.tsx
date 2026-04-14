import { Ionicons } from "@expo/vector-icons";
import { router, Stack, useFocusEffect } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useCallback, useState } from "react";
import { Colors } from "@/constants/theme";
import { USERS_URL } from "@/constants/api";
import { useAuth } from "@/context/auth";

type StatItem = {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: number;
};

type UserProfile = {
  username: string;
  email: string;
};

const fallbackProfile: UserProfile = {
  username: "Username",
  email: "GmailUsername@gmail.com",
};

const stats: StatItem[] = [
  { id: "1", icon: "triangle-outline", label: "Mountains Climbed", value: 0 },
  { id: "2", icon: "trending-up-outline", label: "Total Flights", value: 0 },
  { id: "3", icon: "locate-outline", label: "Total Elevation (ft)", value: 0 },
  { id: "4", icon: "trophy-outline", label: "Best Record (ft)", value: 0 },
];

const c = Colors.light;

function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile>(fallbackProfile);
  const { email, username, userId, logOut } = useAuth();

  async function handleLogOut() {
    await logOut();
    router.replace("/login");
  }

  const loadUserProfile = useCallback(async () => {
    if (!email) {
      setProfile(fallbackProfile);
      return;
    }

    try {
      const res = await fetch(`${USERS_URL}/by-email/${encodeURIComponent(email)}`);

      if (!res.ok) {
        setProfile({
          username: username ?? fallbackProfile.username,
          email,
        });
        return;
      }

      const data = await res.json();

      setProfile({
        username: data.username ?? fallbackProfile.username,
        email: data.email ?? fallbackProfile.email,
      });
    } catch (error) {
      console.log("Failed to load user profile:", error);
    }
  }, [email, username]);

  useFocusEffect(
    useCallback(() => {
      loadUserProfile();
    }, [loadUserProfile])
  );

  return (
    <>
      <Stack.Screen options={{ title: "Profile", headerShadowVisible: false }} />
      <SafeAreaView style={styles.screen} edges={["top"]}>
        <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
          <Text style={styles.pageTitle}>Profile</Text>
          <Text style={styles.pageSubtitle}>Your climbing journey</Text>

          <View style={styles.profileCard}>
            <View style={styles.banner} />
            <View style={styles.avatar}>
              <Ionicons name="person-outline" size={36} color={c.onPrimary} />
            </View>
            <Text style={styles.username}>{profile.username}</Text>
            <Text style={styles.email}>{profile.email}</Text>

            <View style={styles.streakGrid}>
              <View style={[styles.streakCard, styles.streakCardWarm]}>
                <Ionicons name="flame-outline" size={24} color={c.tint} />
                <View>
                  <Text style={styles.streakValue}>0</Text>
                  <Text style={styles.streakLabel}>Current Streak</Text>
                </View>
              </View>
              <View style={[styles.streakCard, styles.streakCardCool]}>
                <Ionicons name="calendar-outline" size={24} color={c.icon} />
                <View>
                  <Text style={styles.streakValue}>0</Text>
                  <Text style={styles.streakLabel}>Longest Streak</Text>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.sectionHeader}>
            <Ionicons name="trending-up-outline" size={18} color={c.tint} />
            <Text style={styles.sectionTitle}>Statistics</Text>
          </View>

          <View style={styles.statsGrid}>
            {stats.map((item) => (
              <View key={item.id} style={styles.statCard}>
                <Ionicons name={item.icon} size={28} color={c.tint} />
                <Text style={styles.statValue}>{item.value}</Text>
                <Text style={styles.statLabel}>{item.label}</Text>
              </View>
            ))}
          </View>

          <View style={styles.sectionHeader}>
            <Ionicons name="ribbon-outline" size={18} color={c.tint} />
            <Text style={styles.sectionTitle}>Achievements</Text>
          </View>

          <View style={styles.achievementsCard}>
            <Ionicons name="ellipse-outline" size={38} color={c.tabIconDefault} />
            <Text style={styles.achievementsText}>No achievements yet</Text>
          </View>

          <View style={styles.accountCard}>
            <Text style={styles.accountTitle}>Account</Text>
            <Text style={styles.accountMeta}>Current user ID: {userId ?? "None"}</Text>
            <Pressable onPress={handleLogOut} style={styles.logoutButton}>
              <Text style={styles.logoutButtonText}>Log Out</Text>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
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
    paddingBottom: 32,
  },
  pageTitle: {
    fontSize: 44,
    fontWeight: "700",
    color: c.heading,
    marginBottom: 2,
  },
  pageSubtitle: {
    fontSize: 24,
    color: c.subtitle,
    marginBottom: 14,
  },
  profileCard: {
    backgroundColor: c.surface,
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: c.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
    alignItems: "center",
    marginBottom: 20,
    paddingBottom: 18,
  },
  banner: {
    height: 112,
    width: "100%",
    backgroundColor: c.banner,
  },
  avatar: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: c.tint,
    justifyContent: "center",
    alignItems: "center",
    marginTop: -46,
    borderWidth: 4,
    borderColor: c.background,
    marginBottom: 10,
  },
  username: {
    fontSize: 20,
    fontWeight: "700",
    color: c.text,
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
    color: c.icon,
    marginBottom: 12,
  },
  streakGrid: {
    width: "100%",
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 16,
  },
  streakCard: {
    flex: 1,
    borderRadius: 10,
    padding: 12,
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
  },
  streakCardWarm: {
    backgroundColor: c.surfaceWarm,
  },
  streakCardCool: {
    backgroundColor: c.surfaceMuted,
  },
  streakValue: {
    fontSize: 20,
    fontWeight: "700",
    color: c.heading,
    lineHeight: 22,
  },
  streakLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: c.icon,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 32,
    fontWeight: "700",
    color: c.heading,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 12,
    marginBottom: 18,
  },
  statCard: {
    width: "48.5%",
    backgroundColor: c.surface,
    borderRadius: 14,
    paddingVertical: 20,
    alignItems: "center",
    shadowColor: c.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  statValue: {
    marginTop: 6,
    fontSize: 40,
    fontWeight: "700",
    color: c.heading,
  },
  statLabel: {
    marginTop: 4,
    fontSize: 14,
    color: c.subtitle,
    textAlign: "center",
    fontWeight: "600",
  },
  achievementsCard: {
    backgroundColor: c.surface,
    borderRadius: 16,
    minHeight: 130,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    shadowColor: c.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  achievementsText: {
    fontSize: 14,
    color: c.tabIconDefault,
    fontWeight: "600",
  },
  accountCard: {
    backgroundColor: c.surface,
    borderRadius: 16,
    padding: 16,
    marginTop: 18,
    shadowColor: c.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  accountTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: c.heading,
    marginBottom: 8,
  },
  accountMeta: {
    fontSize: 14,
    color: c.icon,
    marginBottom: 16,
  },
  logoutButton: {
    backgroundColor: c.error,
    borderRadius: 12,
    minHeight: 52,
    justifyContent: "center",
    alignItems: "center",
  },
  logoutButtonText: {
    color: c.onPrimary,
    fontSize: 16,
    fontWeight: "700",
  },
});

export default ProfilePage;

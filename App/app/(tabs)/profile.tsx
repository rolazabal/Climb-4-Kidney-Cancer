import { Colors } from "@/constants/theme";
import { getFlightsClimbed, initHealthKit } from "@/lib/healthkitService";
import { Ionicons } from "@expo/vector-icons";
import { Stack } from "expo-router";
import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type StatItem = {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: number;
};

const profile = {
  username: "username",
  email: "",
  currentStreak: 0,
  longestStreak: 0
};

type UserProfile = {
  username: string;
  email: string;
};

const USER_ID = "dba1478d-d529-4a6b-92f0-a810b7ce9e97";

const fallbackProfile: UserProfile = {
  username: "Username",
  email: "GmailUsername@gmail.com",
};

const c = Colors.light;
function ProfilePage() {
  const [stats, setStats] = useState<StatItem[]>([
    { id: "1", icon: "triangle-outline", label: "Mountains Climbed", value: 0 },
    { id: "2", icon: "trending-up-outline", label: "Total Flights", value: 0 },
    { id: "3", icon: "locate-outline", label: "Total Elevation (ft)", value: 0 },
    { id: "4", icon: "trophy-outline", label: "Best Record (ft)", value: 0 },
  ]);

  useEffect(() => {
    const loadHealthData = async () => {
      try {
        //trigger HealthKit authorization and data retrieval
        await initHealthKit();
        //get flights climbed in the past week.
        const results: any = await getFlightsClimbed(
          new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          new Date().toISOString()
        );

        const totalFlights = results?.value || 0;
        const elevation = totalFlights * 10; // approx feet per flight
        
        setStats([
          { id: "1", icon: "triangle-outline", label: "Mountains Climbed", value: Math.floor(elevation / 3000) },
          { id: "2", icon: "trending-up-outline", label: "Total Flights", value: totalFlights },
          { id: "3", icon: "locate-outline", label: "Total Elevation (ft)", value: elevation },
          { id: "4", icon: "trophy-outline", label: "Best Record (ft)", value: elevation },
        ]);
      } catch (err) {
        console.log("HealthKit error:", err);
      }
    };

    loadHealthData();
  }, []);

  const params = useLocalSearchParams<{ username?: string; email?: string }>();
  const username =
    typeof params.username === "string" && params.username.trim().length > 0
      ? params.username.trim()
      : profile.username;
  const email =
    typeof params.email === "string" && params.email.trim().length > 0
      ? params.email.trim()
      : profile.email;

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
    fontSize: 18,
    color: c.subtitle,
    marginBottom: 16,
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
    fontSize: 28,
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
});

export default ProfilePage;

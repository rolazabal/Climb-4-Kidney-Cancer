import { Ionicons } from "@expo/vector-icons";
import { Stack, router, useLocalSearchParams } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

function mountains() {

    return (
        <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
                <Text style={styles.pageTitle}>Mountains</Text>
                <Text style={styles.pageSubtitle}>Your climbing journey</Text>
        </ScrollView>
    );
}
const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#ECEDEE",
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  pageTitle: {
    fontSize: 44,
    fontWeight: "700",
    color: "#2F2F2F",
    marginBottom: 2,
  },
  pageSubtitle: {
    fontSize: 24,
    color: "#666666",
    marginBottom: 14,
  },
  profileCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#0E1A18",
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
    backgroundColor: "#4D4D4D",
  },
  avatar: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: "#C76341",
    justifyContent: "center",
    alignItems: "center",
    marginTop: -46,
    borderWidth: 4,
    borderColor: "#F5F5F5",
    marginBottom: 10,
  },
  username: {
    fontSize: 20,
    fontWeight: "700",
    color: "#4A4A4A",
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
    color: "#8A8A8A",
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
    backgroundColor: "#EFE8E1",
  },
  streakCardCool: {
    backgroundColor: "#F1F2F4",
  },
  streakValue: {
    fontSize: 20,
    fontWeight: "700",
    color: "#333333",
    lineHeight: 22,
  },
  streakLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6E6E6E",
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
    color: "#2F2F2F",
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
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    paddingVertical: 20,
    alignItems: "center",
    shadowColor: "#0E1A18",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  statValue: {
    marginTop: 6,
    fontSize: 40,
    fontWeight: "700",
    color: "#303030",
  },
  statLabel: {
    marginTop: 4,
    fontSize: 14,
    color: "#666666",
    textAlign: "center",
    fontWeight: "600",
  },
  achievementsCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    minHeight: 130,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    shadowColor: "#0E1A18",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  achievementsText: {
    fontSize: 14,
    color: "#9A9A9A",
    fontWeight: "600",
  },
  editButton: {
    marginTop: 14,
    backgroundColor: "#C76341",
    borderRadius: 12,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  editButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
});

export default mountains;
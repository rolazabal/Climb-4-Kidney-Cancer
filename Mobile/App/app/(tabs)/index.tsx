import { useCallback, useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";
import { Colors } from "@/constants/theme";
import { MOUNTAINS_URL, PROGRESS_URL } from "@/constants/api";

const c = Colors.light;

// uuid in user service, used for all user-specific requests across services
const USER_ID = "dba1478d-d529-4a6b-92f0-a810b7ce9e97";

type Mountain = {
  id: string;
  name: string;
  range: string;
  elevationFt: number;
};

type InProgressMountain = Mountain & {
  climbId: string;
  progressFt: number;
  isPaused: boolean;
};

type ProgressRecord = {
  climb_uuid: string;
  user_id: string;
  mountain_id: string;
  height: number;
  status: "active" | "inactive" | "complete";
  start_date?: string | null;
  end_date?: string | null;
};

function Climbs() {
  const [isSelectingMountain, setIsSelectingMountain] = useState(false);
  const [availableMountains, setAvailableMountains] = useState<Mountain[]>([]);
  const [inProgressMountains, setInProgressMountains] = useState<InProgressMountain[]>([]);
  const [currentClimbingMountainId, setCurrentClimbingMountainId] = useState<string | null>(null);

  const currentClimbingMountain =
    inProgressMountains.find((mountain) => mountain.id === currentClimbingMountainId) ?? null;

  const sortedInProgress = useMemo(
    () =>
      [...inProgressMountains].sort(
        (a, b) => b.progressFt / b.elevationFt - a.progressFt / a.elevationFt
      ),
    [inProgressMountains]
  );

  async function fetchAllMountains(): Promise<Mountain[]> {
    const res = await fetch(`${MOUNTAINS_URL}/mountains`);
    if (!res.ok) {
      throw new Error(`Failed to fetch mountains list: ${res.status}`);
    }

    const list = await res.json();

    // Fetch details for each mountain to get elevation and range info. 
    // This is inefficient but the mountains service doesn't currently provide a bulk endpoint with this info. 
    // In a real app, we'd want to optimize this.
    const detailPromises = list.map((m: any) =>
      fetch(`${MOUNTAINS_URL}/mountains/${m.uuid}`).then(async (r) => {
        if (!r.ok) {
          throw new Error(`Failed to fetch mountain detail: ${r.status}`);
        }
        return r.json();
      })
    );

    const details = await Promise.all(detailPromises);

    return details.map((m: any) => ({
      id: m.uuid,
      name: m.name,
      range: m.location,
      elevationFt: Math.round(m.height ?? 0),
    }));
  }

  async function fetchUserClimbs(): Promise<ProgressRecord[]> {
  if (!USER_ID) {
    return [];
  }

    const res = await fetch(`${PROGRESS_URL}/progress/user/${USER_ID}`);

    if (res.status === 404) {
      return [];
    }

    if (!res.ok) {
      throw new Error(`Failed to fetch user climbs: ${res.status}`);
    }

    return await res.json();
  }

  async function loadClimbs() {
    try {
      const [mountains, climbs] = await Promise.all([fetchAllMountains(), fetchUserClimbs()]);

      const mountainMap = new Map(mountains.map((m) => [m.id, m]));

      const inProgress: InProgressMountain[] = climbs
        .filter((c) => c.status === "active" || c.status === "inactive")
        .map((c) => {
          const base = mountainMap.get(c.mountain_id);
          if (!base) return null;

          return {
            ...base,
            climbId: c.climb_uuid,
            progressFt: Math.round(c.height ?? 0),
            isPaused: c.status === "inactive",
          };
        })
        .filter(Boolean) as InProgressMountain[];

      const startedMountainIds = new Set(
        climbs
          .filter((c) => c.status === "active" || c.status === "inactive" || c.status === "complete")
          .map((c) => c.mountain_id)
      );

      const available = mountains.filter((m) => !startedMountainIds.has(m.id));

      setAvailableMountains(available);
      setInProgressMountains(inProgress);

      const active = inProgress.find((m) => !m.isPaused) ?? null;
      setCurrentClimbingMountainId(active?.id ?? null);
    } catch (error) {
      console.log("Failed to load climbs:", error);
    }
  }

  useFocusEffect(
    useCallback(() => {
      loadClimbs();
    }, [])
  );

  const startClimb = async (mountain: Mountain) => {
    if (!USER_ID) {
      Alert.alert("User ID needed", "Add a valid user UUID first.");
      return;
    }

    try {
      const existing = inProgressMountains.find((m) => m.id === mountain.id);
      const active = inProgressMountains.find((m) => !m.isPaused);

      if (active) {
        await fetch(`${PROGRESS_URL}/progress/update/${active.climbId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "inactive" }),
        });
      }

      if (existing) {
        await fetch(`${PROGRESS_URL}/progress/update/${existing.climbId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "active" }),
        });
      } else {
        const res = await fetch(`${PROGRESS_URL}/progress`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            user_id: USER_ID,
            mountain_id: mountain.id,
            height: 0,
          }),
        });

        if (!res.ok) {
          const text = await res.text();
          throw new Error(`Failed to start climb: ${res.status} ${text}`);
        }
      }

      setIsSelectingMountain(false);
      await loadClimbs();
    } catch (error) {
      console.log("startClimb failed:", error);
      Alert.alert("Error", "Could not start climb.");
    }
  };

  const togglePause = async (mountainId: string) => {
    const targetMountain = inProgressMountains.find((mountain) => mountain.id === mountainId);
    if (!targetMountain) return;

    try {
      if (targetMountain.isPaused) {
        const active = inProgressMountains.find(
          (mountain) => !mountain.isPaused && mountain.id !== mountainId
        );

        if (active) {
          await fetch(`${PROGRESS_URL}/progress/update/${active.climbId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: "inactive" }),
          });
        }

        await fetch(`${PROGRESS_URL}/progress/update/${targetMountain.climbId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "active" }),
        });
      } else {
        await fetch(`${PROGRESS_URL}/progress/update/${targetMountain.climbId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "inactive" }),
        });
      }

      await loadClimbs();
    } catch (error) {
      console.log("togglePause failed:", error);
      Alert.alert("Error", "Could not update climb status.");
    }
  };

  const quitClimb = async (mountainId: string) => {
    const targetMountain = inProgressMountains.find((mountain) => mountain.id === mountainId);
    if (!targetMountain) return;

    try {
      const res = await fetch(`${PROGRESS_URL}/progress/id/${targetMountain.climbId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Failed to quit climb: ${res.status} ${text}`);
      }

      await loadClimbs();
    } catch (error) {
      console.log("quitClimb failed:", error);
      Alert.alert("Error", "Could not quit climb.");
    }
  };

  const resetClimbProgress = async (mountainId: string) => {
    const targetMountain = inProgressMountains.find((mountain) => mountain.id === mountainId);
    if (!targetMountain) return;

    try {
      const res = await fetch(`${PROGRESS_URL}/progress/update/${targetMountain.climbId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ height: 0 }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Failed to reset progress: ${res.status} ${text}`);
      }

      await loadClimbs();
    } catch (error) {
      console.log("resetClimbProgress failed:", error);
      Alert.alert("Error", "Could not reset climb progress.");
    }
  };

  const confirmQuitClimb = (mountain: InProgressMountain) => {
    Alert.alert(
      "Quit Climb?",
      `Are you sure you want to quit ${mountain.name}? This will reset any progress on this mountain.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Quit Climb",
          style: "destructive",
          onPress: () => quitClimb(mountain.id),
        },
      ]
    );
  };

  const confirmResetClimb = (mountain: InProgressMountain) => {
    Alert.alert(
      "Reset Progress?",
      `Are you sure you want to reset ${mountain.name}? This will set your progress to 0.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset",
          style: "destructive",
          onPress: () => resetClimbProgress(mountain.id),
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <Text style={styles.pageTitle}>Climbs</Text>
        <Text style={styles.pageSubtitle}>Track climbs in progress and start new routes.</Text>

        <Pressable style={styles.startButton} onPress={() => setIsSelectingMountain((current) => !current)}>
          <Text style={styles.startButtonText}>
            {isSelectingMountain ? "Done Selecting" : "Start New Climb"}
          </Text>
        </Pressable>

        {currentClimbingMountain ? (
          <Text style={styles.singleActiveHint}>
            Currently climbing: {currentClimbingMountain.name}. Starting or resuming another climb pauses all others.
          </Text>
        ) : (
          <Text style={styles.singleActiveHint}>No active climb right now.</Text>
        )}

        {isSelectingMountain ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Not Started</Text>
            {availableMountains.length === 0 ? (
              <Text style={styles.emptyStateText}>No mountains left to start right now.</Text>
            ) : (
              availableMountains.map((mountain) => (
                <View key={mountain.id} style={styles.card}>
                  <View>
                    <Text style={styles.cardTitle}>{mountain.name}</Text>
                    <Text style={styles.cardSubtitle}>{mountain.range}</Text>
                    <Text style={styles.cardMeta}>
                      Elevation: {mountain.elevationFt.toLocaleString()} ft
                    </Text>
                  </View>
                  <Pressable style={styles.cardPrimaryButton} onPress={() => startClimb(mountain)}>
                    <Text style={styles.cardPrimaryButtonText}>Start Climb</Text>
                  </Pressable>
                </View>
              ))
            )}
          </View>
        ) : null}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>In Progress</Text>
          {sortedInProgress.length === 0 ? (
            <Text style={styles.emptyStateText}>No climbs in progress.</Text>
          ) : (
            sortedInProgress.map((mountain) => {
              const progressRatio =
                mountain.elevationFt > 0 ? Math.min(mountain.progressFt / mountain.elevationFt, 1) : 0;
              const progressPct = Math.round(progressRatio * 100);

              return (
                <View key={mountain.id} style={styles.card}>
                  <Text style={styles.cardTitle}>{mountain.name}</Text>
                  <Text style={styles.cardSubtitle}>{mountain.range}</Text>
                  <Text style={styles.cardMeta}>
                    {mountain.progressFt.toLocaleString()} / {mountain.elevationFt.toLocaleString()} ft ({progressPct}
                    %)
                  </Text>

                  <View style={styles.progressTrack}>
                    <View style={[styles.progressFill, { width: `${progressPct}%` }]} />
                  </View>

                  <View style={styles.actionsRow}>
                    <Pressable style={styles.cardSecondaryButton} onPress={() => togglePause(mountain.id)}>
                      <Text style={styles.cardSecondaryButtonText}>
                        {mountain.isPaused ? "Resume Climb" : "Pause Climb"}
                      </Text>
                    </Pressable>
                    <Pressable style={styles.cardResetButton} onPress={() => confirmResetClimb(mountain)}>
                      <Text style={styles.cardResetButtonText}>Reset Progress</Text>
                    </Pressable>
                    <Pressable style={styles.cardDangerButton} onPress={() => confirmQuitClimb(mountain)}>
                      <Text style={styles.cardDangerButtonText}>Quit Climb</Text>
                    </Pressable>
                  </View>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
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
  startButton: {
    backgroundColor: c.tint,
    borderRadius: 14,
    minHeight: 56,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  startButtonText: {
    color: c.onPrimary,
    fontSize: 18,
    fontWeight: "700",
  },
  singleActiveHint: {
    marginBottom: 14,
    color: c.subtitle,
    fontSize: 14,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: c.heading,
    marginBottom: 12,
  },
  card: {
    backgroundColor: c.surface,
    borderRadius: 14,
    padding: 14,
    shadowColor: c.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: c.heading,
  },
  cardSubtitle: {
    fontSize: 15,
    color: c.subtitle,
    marginTop: 2,
  },
  cardMeta: {
    fontSize: 14,
    color: c.icon,
    marginTop: 8,
    marginBottom: 10,
  },
  progressTrack: {
    height: 10,
    borderRadius: 999,
    backgroundColor: c.surfaceMuted,
    overflow: "hidden",
    marginBottom: 12,
  },
  progressFill: {
    height: "100%",
    backgroundColor: c.tint,
  },
  actionsRow: {
    flexDirection: "row",
    gap: 10,
  },
  cardPrimaryButton: {
    marginTop: 8,
    backgroundColor: c.tint,
    borderRadius: 10,
    height: 42,
    justifyContent: "center",
    alignItems: "center",
  },
  cardPrimaryButtonText: {
    color: c.onPrimary,
    fontSize: 14,
    fontWeight: "700",
  },
  cardSecondaryButton: {
    flex: 1,
    backgroundColor: c.surfaceMuted,
    borderRadius: 10,
    height: 42,
    justifyContent: "center",
    alignItems: "center",
  },
  cardSecondaryButtonText: {
    color: c.heading,
    fontSize: 14,
    fontWeight: "700",
  },
  cardResetButton: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: c.icon,
    height: 42,
    justifyContent: "center",
    alignItems: "center",
  },
  cardResetButtonText: {
    color: c.icon,
    fontSize: 14,
    fontWeight: "700",
  },
  cardDangerButton: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: c.error,
    height: 42,
    justifyContent: "center",
    alignItems: "center",
  },
  cardDangerButtonText: {
    color: c.error,
    fontSize: 14,
    fontWeight: "700",
  },
  emptyStateText: {
    fontSize: 15,
    color: c.icon,
  },
});

export default Climbs;
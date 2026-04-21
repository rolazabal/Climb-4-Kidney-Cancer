import { Colors } from "@/constants/theme";
import { useAuth } from "@/context/auth";
import { getConnection } from "@/lib/database";
import { syncHealthClimbs } from "@/lib/healthSync";
import { useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const c = Colors.light;

const db = getConnection();

type Mountain = {
  id: string;
  name: string;
  range: string;
  elevationFt: number;
  group: string | null;
};

type InProgressMountain = Mountain & {
  progressFt: number;
  isPaused: boolean;
};

type LocalClimbRecord = {
  mountain_id: string;
  elevation: number;
  is_active: number;
  name: string;
  location: string;
  height: number;
};

function Climbs() {
  const { userId } = useAuth();
  const [isSelectingMountain, setIsSelectingMountain] = useState(false);
  const [availableMountains, setAvailableMountains] = useState<Mountain[]>([]);
  const [inProgressMountains, setInProgressMountains] = useState<InProgressMountain[]>([]);
  const [isLoadingAvailableClimbs, setIsLoadingAvailableClimbs] = useState(false);
  const [availableClimbsError, setAvailableClimbsError] = useState<string | null>(null);
  const activeClimbs = useMemo(
    () => inProgressMountains.filter((mountain) => !mountain.isPaused),
    [inProgressMountains]
  );

  const sortedInProgress = useMemo(
    () => [...inProgressMountains].sort((a, b) => b.progressFt / b.elevationFt - a.progressFt / a.elevationFt),
    [inProgressMountains]
  );

  const loadClimbsFromDb = useCallback(async () => {
    if (!userId) {
      setAvailableMountains([]);
      setInProgressMountains([]);
      setAvailableClimbsError(null);
      return;
    }

    setIsLoadingAvailableClimbs(true);
    setAvailableClimbsError(null);

    try {
      try {
        await syncHealthClimbs();
      } catch (error) {
        console.log("Health sync skipped while loading climbs:", error);
      }

      const database = await db;
      const availableRows = await database.getAllAsync(`
        SELECT m.id, m.name, m.location, m.height
        FROM mountains m
        LEFT JOIN climbs c ON c.mountain_id = m.id
        WHERE c.mountain_id IS NULL AND COALESCE(m.summited, 0) = 0
        ORDER BY m.name ASC
      `) as { id: string; name: string; location: string; height: number }[];
      const inProgressRows = await database.getAllAsync(`
        SELECT c.id, c.mountain_id, c.elevation, c.is_active, m.name, m.location, m.height, m.summited
        FROM climbs c
        INNER JOIN mountains m ON m.id = c.mountain_id
        WHERE COALESCE(m.summited, 0) = 0
        ORDER BY m.name ASC
      `) as LocalClimbRecord[];

      setAvailableMountains(
        availableRows.map((mountain) => ({
          id: mountain.id,
          name: mountain.name,
          range: mountain.location ?? "Unknown location",
          elevationFt: Math.round(Number(mountain.height ?? 0)),
          group: null,
        }))
      );

      setInProgressMountains(
        inProgressRows.map((climb) => ({
          id: climb.mountain_id,
          name: climb.name,
          range: climb.location ?? "Unknown location",
          elevationFt: Math.round(Number(climb.height ?? 0)),
          group: null,
          progressFt: Math.round(Number(climb.elevation ?? 0)),
          isPaused: !Boolean(climb.is_active),
        }))
      );
    } catch (error) {
      console.log("Failed to load available climbs:", error);
      setAvailableClimbsError("Could not load climbs right now.");
      setAvailableMountains([]);
      setInProgressMountains([]);
    } finally {
      setIsLoadingAvailableClimbs(false);
    }
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      loadClimbsFromDb();
    }, [loadClimbsFromDb])
  );

  const startClimb = async (mountain: Mountain) => {
    try {
      const database = await db;
      const timestamp = Date.now();
      let climbStatement = await database.prepareAsync(`
        INSERT INTO climbs (id, mountain_id, elevation, is_active)
        VALUES ($id, $mountainId, $elevation, $isActive)
      `);
      let timeStatement = await database.prepareAsync(`
        INSERT INTO times (time, climb_id, is_start)
        VALUES ($time, $climbId, $isStart)
      `);

      try {
        await climbStatement.executeAsync({
          $id: mountain.id,
          $mountainId: mountain.id,
          $elevation: 0,
          $isActive: true,
        });
        await timeStatement.executeAsync({
          $time: timestamp,
          $climbId: mountain.id,
          $isStart: true,
        });
      } finally {
        await climbStatement.finalizeAsync();
        await timeStatement.finalizeAsync();
      }

      await loadClimbsFromDb();
      setIsSelectingMountain(false);
    } catch (error) {
      console.log("Failed to start climb:", error);
      Alert.alert("Could not start climb", "Please try again.");
    }
  };

  const togglePause = async (mountainId: string) => {
    const targetMountain = inProgressMountains.find((mountain) => mountain.id === mountainId);
    if (!targetMountain) {
      return;
    }

    try {
      const database = await db;
      let climbStatement = await database.prepareAsync(`
        UPDATE climbs
        SET is_active = $isActive
        WHERE mountain_id = $mountainId
      `);
      let timeStatement = await database.prepareAsync(`
        INSERT INTO times (time, climb_id, is_start)
        VALUES ($time, $climbId, $isStart)
      `);

      try {
        await climbStatement.executeAsync({
          $isActive: targetMountain.isPaused,
          $mountainId: mountainId,
        });
        await timeStatement.executeAsync({
          $time: Date.now(),
          $climbId: mountainId,
          $isStart: targetMountain.isPaused,
        });
      } finally {
        await climbStatement.finalizeAsync();
        await timeStatement.finalizeAsync();
      }

      await loadClimbsFromDb();
    } catch (error) {
      console.log("Failed to update climb state:", error);
      Alert.alert("Could not update climb", "Please try again.");
    }
  };

  const quitClimb = async (mountainId: string) => {
    try {
      const database = await db;
      let deleteClimbStatement = await database.prepareAsync('DELETE FROM climbs WHERE mountain_id = $mountainId');
      let deleteTimeStatement = await database.prepareAsync('DELETE FROM times WHERE climb_id = $climbId');

      try {
        await deleteClimbStatement.executeAsync({ $mountainId: mountainId });
        await deleteTimeStatement.executeAsync({ $climbId: mountainId });
      } finally {
        await deleteClimbStatement.finalizeAsync();
        await deleteTimeStatement.finalizeAsync();
      }

      await loadClimbsFromDb();
    } catch (error) {
      console.log("Failed to quit climb:", error);
      Alert.alert("Could not quit climb", "Please try again.");
    }
  };

  const resetClimbProgress = async (mountainId: string) => {
    try {
      const database = await db;
      let statement = await database.prepareAsync(`
        UPDATE climbs
        SET elevation = 0
        WHERE mountain_id = $mountainId
      `);

      try {
        await statement.executeAsync({ $mountainId: mountainId });
      } finally {
        await statement.finalizeAsync();
      }

      await loadClimbsFromDb();
    } catch (error) {
      console.log("Failed to reset climb progress:", error);
      Alert.alert("Could not reset progress", "Please try again.");
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
        <Text style={styles.singleActiveHint}>
          {activeClimbs.length > 0
            ? `${activeClimbs.length} active climb${activeClimbs.length === 1 ? "" : "s"} right now. You can keep multiple climbs active at the same time.`
            : "No active climbs right now."}
        </Text>

        {isSelectingMountain ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Not Started</Text>
            {isLoadingAvailableClimbs ? (
              <Text style={styles.emptyStateText}>Loading climbs...</Text>
            ) : availableClimbsError ? (
              <Text style={styles.emptyStateText}>{availableClimbsError}</Text>
            ) : availableMountains.length === 0 ? (
              <Text style={styles.emptyStateText}>No mountains left to start right now.</Text>
            ) : (
              availableMountains.map((mountain) => (
                <View key={mountain.id} style={styles.card}>
                  <View>
                    <Text style={styles.climbTypeLabel}>{mountain.group ?? "Individual climb"}</Text>
                    <Text style={styles.cardTitle}>{mountain.name}</Text>
                    <Text style={styles.cardSubtitle}>{mountain.range}</Text>
                    <Text style={styles.cardMeta}>Elevation: {mountain.elevationFt.toLocaleString()} ft</Text>
                  </View>
                  <Pressable
                    style={styles.cardPrimaryButton}
                    onPress={() => { void startClimb(mountain); }}
                  >
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
              const progressRatio = Math.min(mountain.progressFt / mountain.elevationFt, 1);
              const progressPct = Math.round(progressRatio * 100);
              return (
                <View key={mountain.id} style={styles.card}>
                  <Text style={styles.climbTypeLabel}>{mountain.group ?? "Individual climb"}</Text>
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
                    <Pressable style={styles.cardSecondaryButton} onPress={() => { void togglePause(mountain.id); }}>
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
  climbTypeLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: c.tint,
    marginBottom: 6,
    textTransform: "uppercase",
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

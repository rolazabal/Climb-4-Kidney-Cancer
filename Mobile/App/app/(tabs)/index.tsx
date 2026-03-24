import { useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Colors } from "@/constants/theme";

const c = Colors.light;

type Mountain = {
  id: string;
  name: string;
  range: string;
  elevationFt: number;
};

type InProgressMountain = Mountain & {
  progressFt: number;
  isPaused: boolean;
};

const initialAvailableMountains: Mountain[] = [
  { id: "bierstadt", name: "Mt. Bierstadt", range: "Colorado, USA", elevationFt: 14066 },
  { id: "lobuche", name: "Lobuche Peak", range: "Khumbu, Nepal", elevationFt: 20075 },
  { id: "rainier", name: "Mt. Rainier", range: "Washington, USA", elevationFt: 14411 },
  { id: "aconcagua", name: "Aconcagua", range: "Mendoza, Argentina", elevationFt: 22838 },
];

const initialInProgressMountains: InProgressMountain[] = [
  {
    id: "elbert",
    name: "Mt. Elbert",
    range: "Colorado, USA",
    elevationFt: 14440,
    progressFt: 4520,
    isPaused: false,
  },
];

function MountainsPage() {
  const [isSelectingMountain, setIsSelectingMountain] = useState(false);
  const [availableMountains, setAvailableMountains] = useState(initialAvailableMountains);
  const [inProgressMountains, setInProgressMountains] = useState(initialInProgressMountains);
  const [currentClimbingMountainId, setCurrentClimbingMountainId] = useState<string | null>(
    initialInProgressMountains.find((mountain) => !mountain.isPaused)?.id ?? null
  );
  const currentClimbingMountain =
    inProgressMountains.find((mountain) => mountain.id === currentClimbingMountainId) ?? null;

  const sortedInProgress = useMemo(
    () => [...inProgressMountains].sort((a, b) => b.progressFt / b.elevationFt - a.progressFt / a.elevationFt),
    [inProgressMountains]
  );

  const startClimb = (mountain: Mountain) => {
    setAvailableMountains((current) => current.filter((item) => item.id !== mountain.id));
    setInProgressMountains((current) => [
      ...current.map((item) => ({ ...item, isPaused: true })),
      { ...mountain, progressFt: 0, isPaused: false },
    ]);
    setCurrentClimbingMountainId(mountain.id);
    setIsSelectingMountain(false);
  };

  const togglePause = (mountainId: string) => {
    const targetMountain = inProgressMountains.find((mountain) => mountain.id === mountainId);
    if (!targetMountain) {
      return;
    }

    if (targetMountain.isPaused) {
      setInProgressMountains((current) =>
        current.map((mountain) =>
          mountain.id === mountainId ? { ...mountain, isPaused: false } : { ...mountain, isPaused: true }
        )
      );
      setCurrentClimbingMountainId(mountainId);
      return;
    }

    setInProgressMountains((current) =>
      current.map((mountain) => (mountain.id === mountainId ? { ...mountain, isPaused: true } : mountain))
    );
    if (currentClimbingMountainId === mountainId) {
      setCurrentClimbingMountainId(null);
    }
  };

  const quitClimb = (mountainId: string) => {
    setInProgressMountains((current) => {
      const mountainToQuit = current.find((mountain) => mountain.id === mountainId);
      if (!mountainToQuit) {
        return current;
      }

      setAvailableMountains((available) => {
        if (available.some((mountain) => mountain.id === mountainToQuit.id)) {
          return available;
        }
        return [...available, mountainToQuit];
      });

      return current.filter((mountain) => mountain.id !== mountainId);
    });
    if (currentClimbingMountainId === mountainId) {
      setCurrentClimbingMountainId(null);
    }
  };

  const resetClimbProgress = (mountainId: string) => {
    setInProgressMountains((current) =>
      current.map((mountain) => (mountain.id === mountainId ? { ...mountain, progressFt: 0 } : mountain))
    );
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
        <Text style={styles.pageTitle}>Climb</Text>
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
                    <Text style={styles.cardMeta}>Elevation: {mountain.elevationFt.toLocaleString()} ft</Text>
                  </View>
                  <Pressable
                    style={styles.cardPrimaryButton}
                    onPress={() => startClimb(mountain)}
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

export default MountainsPage;
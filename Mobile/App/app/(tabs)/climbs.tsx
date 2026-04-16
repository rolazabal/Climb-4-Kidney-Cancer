import { useCallback, useMemo, useState } from "react";
import { useFocusEffect } from "expo-router";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MOUNTAINS_URL, PROGRESS_URL } from "@/constants/api";
import { Colors } from "@/constants/theme";
import { useAuth } from "@/context/auth";
import { getConnection } from "../_layout";

const db = getConnection();

const c = Colors.light;

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

type ProgressClimbRecord = {
  climb_uuid: string;
  mountain_id: string;
  height: number;
  status?: "active" | "inactive" | "complete";
  group: string | null;
  isLeader: boolean;
};

type MountainDetail = {
  id: string;
  name?: string;
  location?: string;
  height?: number;
};

type LeaderGroup = {
  id: string;
  name: string;
};

const mockLeaderGroupsByUserId: Record<string, LeaderGroup[]> = {
  "dba1478d-d529-4a6b-92f0-a810b7ce9e97": [
    { id: "kidney-krew", name: "Kidney Krew" },
    { id: "summit-fundraisers", name: "Summit Fundraisers" },
  ],
};

// Dummy data
const mockMountainDetails: Record<string, MountainDetail> = {
  denali: {
    id: "denali",
    name: "Denali",
    location: "Alaska, USA",
    height: 20310,
  },
  rainier: {
    id: "rainier",
    name: "Mount Rainier",
    location: "Washington, USA",
    height: 14411,
  },
  fuji: {
    id: "fuji",
    name: "Mount Fuji",
    location: "Japan",
    height: 12388,
  },
  everest: {
    id: "everest",
    name: "Mount Everest",
    location: "Nepal/China",
    height: 29032,
  },
};

// Dummy data
const initialInProgressMountains: InProgressMountain[] = [
  {
    id: "elbert",
    name: "Mt. Elbert",
    range: "Colorado, USA",
    elevationFt: 14440,
    group: null,
    progressFt: 4520,
    isPaused: false,
    //is_leader: true,
  },
  {
    id: "denali-1",
    name: "denali",
    range: "Alaska, USA",
    elevationFt: 20310,
    group: "kidney-krew",
    progressFt: 10000,
    isPaused: false,
  },
  {
    id: "rainier-1",
    name: "rainier",
    elevationFt: 14411,
    group: null,
    range: "Washington, USA",
    progressFt: 0,
    isPaused: false,
  },
  {
    id: "fuji-1",
    name: "fuji",
    range: "Japan",
    elevationFt: 12388,
    group: "summit-fundraisers",
    progressFt: 12200,
    isPaused: false,
  },
];


function Climbs() {
  const { userId } = useAuth();
  const [isSelectingMountain, setIsSelectingMountain] = useState(false);
  const [availableMountains, setAvailableMountains] = useState<Mountain[]>([]);
  const [inProgressMountains, setInProgressMountains] = useState<InProgressMountain[]>([]);
  const [isLoadingAvailableClimbs, setIsLoadingAvailableClimbs] = useState(false);
  const [availableClimbsError, setAvailableClimbsError] = useState<string | null>(null);
  const [selectedClimbAudience, setSelectedClimbAudience] = useState<string>("individual");
  const leaderGroups = useMemo(() => (userId ? mockLeaderGroupsByUserId[userId] ?? [] : []), [userId]);
  const leaderGroupNames = useMemo(() => new Set(leaderGroups.map((group) => group.name)), [leaderGroups]);
  const activeClimbs = useMemo(
    () => inProgressMountains.filter((mountain) => !mountain.isPaused),
    [inProgressMountains]
  );

  const sortedInProgress = useMemo(
    () => [...inProgressMountains].sort((a, b) => b.progressFt / b.elevationFt - a.progressFt / a.elevationFt),
    [inProgressMountains]
  );

  const canCurrentUserEditClimb = useCallback(
    (mountain: InProgressMountain) => mountain.group === null || leaderGroupNames.has(mountain.group),
    [leaderGroupNames]
  );

  async function getUserClimbs(userId: string): Promise<ProgressClimbRecord[]> {
    const response = await fetch(`${PROGRESS_URL}/progress/user/${userId}`);

    if (response.status === 404) {
      return [];
    }

    if (!response.ok) {
      throw new Error(`Failed to fetch climbs: ${response.status}`);
    }

    return response.json();
  }

  async function getAllMountains(): Promise<MountainDetail[]> {
    const response = await fetch(`${MOUNTAINS_URL}/mountains`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch mountains: ${response.status}`);
    }

    return response.json();
  }

  async function getLocalMountains(): Promise<MountainDetail[]> {
    const rows =  await (await db).getAllAsync('SELECT * FROM mountains') as Array<{id: string; name: string; location: string; height: number}>;

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      location: row.location,
      height: row.height

    }));
  }

  //use the local db to try and get the mountain details
  const loadAvailableClimbs = useCallback(async () => {
    if (!userId) {
      setAvailableMountains([]);
      setAvailableClimbsError(null);
      return;
    }

    setIsLoadingAvailableClimbs(true);
    setAvailableClimbsError(null);

    try {
      const climbs = await getUserClimbs(userId);
      const allMountains = await getLocalMountains();

      const relevantClimbs = climbs.filter((climb) =>
        selectedClimbAudience === "individual" ? climb.group === null : climb.group === selectedClimbAudience
      );

      const unavailableMountainIds = new Set(
        relevantClimbs
          .filter((climb) => climb.status === "active" || climb.status === "complete")
          .map((climb) => climb.mountain_id)
      );

      const locallyActiveMountainNames = new Set(
        inProgressMountains
          .filter((mountain) =>
            selectedClimbAudience === "individual" ? mountain.group === null : mountain.group === selectedClimbAudience
          )
          .map((mountain) => mountain.name)
      );

      const nextAvailableMountains = allMountains
        .filter((mountain) => !unavailableMountainIds.has(mountain.id))
        .filter((mountain) => !locallyActiveMountainNames.has(mountain.name ?? ""))
        .map((mountain) => ({
          id: mountain.id,
          name: mountain.name ?? "Unnamed Mountain",
          range: mountain.location ?? "Unknown location",
          elevationFt: Math.round(Number(mountain.height ?? 0)),
          group: selectedClimbAudience === "individual" ? null : selectedClimbAudience,
        }));

      setAvailableMountains(nextAvailableMountains);
    } catch (error) {
      console.log("Failed to load available climbs:", error);
      setAvailableClimbsError("Could not load climbs right now.");
      setAvailableMountains([]);
    } finally {
      setIsLoadingAvailableClimbs(false);
    }
  }, [inProgressMountains, selectedClimbAudience, userId]);

  useFocusEffect(
    useCallback(() => {
      loadAvailableClimbs();
    }, [loadAvailableClimbs])
  );

  const startClimb = (mountain: Mountain) => {
    setAvailableMountains((current) => current.filter((item) => item.id !== mountain.id));
    setInProgressMountains((current) => [...current, { ...mountain, progressFt: 0, isPaused: false }]);
    setIsSelectingMountain(false);
  };

  const togglePause = (mountainId: string) => {
    const targetMountain = inProgressMountains.find((mountain) => mountain.id === mountainId);
    if (!targetMountain) {
      return;
    }

    setInProgressMountains((current) =>
      current.map((mountain) =>
        mountain.id === mountainId ? { ...mountain, isPaused: !targetMountain.isPaused } : mountain
      )
    );
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
        <Text style={styles.pageTitle}>Climbs</Text>
        <Text style={styles.pageSubtitle}>Track climbs in progress and start new routes.</Text>

        <Pressable
          style={styles.startButton}
          onPress={() => {
            if (leaderGroups.length === 0) {
              setSelectedClimbAudience("individual");
            }
            setIsSelectingMountain((current) => !current);
          }}
        >
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
            {leaderGroups.length > 0 ? (
              <View style={styles.audienceSelector}>
                <Text style={styles.audienceTitle}>Start climb for</Text>
                <View style={styles.audienceOptions}>
                  <Pressable
                    onPress={() => setSelectedClimbAudience("individual")}
                    style={[
                      styles.audienceOption,
                      selectedClimbAudience === "individual" && styles.audienceOptionActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.audienceOptionText,
                        selectedClimbAudience === "individual" && styles.audienceOptionTextActive,
                      ]}
                    >
                      Individual
                    </Text>
                  </Pressable>

                  {leaderGroups.map((group) => (
                    <Pressable
                      key={group.id}
                      onPress={() => setSelectedClimbAudience(group.name)}
                      style={[
                        styles.audienceOption,
                        selectedClimbAudience === group.name && styles.audienceOptionActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.audienceOptionText,
                          selectedClimbAudience === group.name && styles.audienceOptionTextActive,
                        ]}
                      >
                        {group.name}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            ) : null}

            <Text style={styles.sectionTitle}>Not Started</Text>
            {isLoadingAvailableClimbs ? (
              <Text style={styles.emptyStateText}>Loading climbs...</Text>
            ) : availableClimbsError ? (
              <Text style={styles.emptyStateText}>{availableClimbsError}</Text>
            ) : availableMountains.length === 0 ? (
              <Text style={styles.emptyStateText}>
                No {selectedClimbAudience === "individual" ? "individual" : selectedClimbAudience} climbs left to
                start right now.
              </Text>
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

                  {canCurrentUserEditClimb(mountain) ? (
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
                  ) : (
                    <Text style={styles.readOnlyHint}>Only group leaders can manage this group climb.</Text>
                  )}
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
  audienceSelector: {
    marginBottom: 18,
  },
  audienceTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: c.heading,
    marginBottom: 10,
  },
  audienceOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  audienceOption: {
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.surface,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  audienceOptionActive: {
    backgroundColor: c.tint,
    borderColor: c.tint,
  },
  audienceOptionText: {
    color: c.heading,
    fontSize: 14,
    fontWeight: "700",
  },
  audienceOptionTextActive: {
    color: c.onPrimary,
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
  readOnlyHint: {
    marginTop: 10,
    fontSize: 14,
    color: c.subtitle,
  },
});

export default Climbs;

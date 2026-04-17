import { MOUNTAINS_URL } from '@/constants/api';
import { useAuth } from '@/context/auth';
import { apiFetch } from "@/components/apiFetch";
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Mountain } from '../(tabs)/mountains';
import { getConnection } from '../_layout';
import { Colors } from '@/constants/theme';

const c = Colors.light;

function MountainsList({view}: {view: Function}) {
  const [mountains, setMountains] = useState<Mountain[]>([]);
  const [climbedMountains, setClimbedMountains] = useState<Mountain[]>([]);
  const [activeMountains, setActiveMountains] = useState<Mountain[]>([]);
  const [peakNumber, setPeakNumber] = useState(0);
  const { logOut } = useAuth();

  const Tabs = {
    all: 0,
    climbed: 1,
    toClimb: 2,
  };

  const [tab, setTab] = useState(Tabs.all);

  type LocalMountainRow = Mountain & {
    summited?: number;
  };

  const getMountains = useCallback(async () => {
    // check sync
    let db = await getConnection();
    let row = await db.getFirstAsync('SELECT mountains FROM sync');
    console.log(row);
    try {
      // request mountain list
      let res = await apiFetch(MOUNTAINS_URL);

      if (res.status === 401) {
        await logOut();
        router.replace("/login");
        return;
      }

      if (res.status !== 200) {
        console.log('Mountains list failed:', res.status);
        return;
      }
      
      let mountains = await res.json();
      let imagePromises = mountains.map((mountain: Mountain) => fetch(MOUNTAINS_URL + "/" + mountain.uuid + "/image-url", {
        method: 'GET',
        headers: {'Content-Type': 'application/json'},
      })
        .then((res) => (res.status === 200 ? res.json() : null))
        .then((data) => (data?.url ? data.url : null))
        .catch(() => null)
      );

      let urls = await Promise.all(imagePromises);
      mountains = mountains.map((mountain: Mountain, index: number) => ({
        ...mountain,
        image_presigned_url: urls[index],
      }));
      const mountainsById = new Map(mountains.map((mountain: Mountain) => [mountain.uuid, mountain]));

      setPeakNumber(mountains.length);
      setMountains(mountains);

      // sync
      let statement = await db.prepareAsync('INSERT INTO mountains VALUES ($id, $name, $location, $height, $summited)');
      try {
        for (let x in mountains) {
          const key = x as keyof Mountain;
          let mountain = mountains[key];
          await statement.executeAsync({
            $id: mountain.uuid,
            $name: mountain.name,
            $location: mountain.location,
            $height: mountain.height,
            $summited: false
          });
        }
      } finally {
        await statement.finalizeAsync();
      }
      statement = await db.prepareAsync('UPDATE sync SET mountains = true WHERE mountains = false');
      await statement.executeAsync();
      await statement.finalizeAsync();

      const activeRows = await db.getAllAsync(`
        SELECT DISTINCT m.id AS uuid, m.name, m.location, m.height, m.summited
        FROM climbs c
        INNER JOIN mountains m ON m.id = c.mountain_id
        WHERE c.is_active = 1 AND COALESCE(m.summited, 0) = 0
        ORDER BY m.name ASC
      `) as LocalMountainRow[];

      const climbedRows = await db.getAllAsync(`
        SELECT DISTINCT m.id AS uuid, m.name, m.location, m.height, m.summited
        FROM mountains m
        WHERE COALESCE(m.summited, 0) = 1
        ORDER BY m.name ASC
      `) as LocalMountainRow[];

      setActiveMountains(
        activeRows.map((mountain) => ({
          uuid: mountain.uuid,
          name: mountainsById.get(mountain.uuid)?.name ?? mountain.name,
          location: mountainsById.get(mountain.uuid)?.location ?? mountain.location ?? 'Unknown location',
          height: mountainsById.get(mountain.uuid)?.height ?? mountain.height ?? 0,
          description: mountainsById.get(mountain.uuid)?.description,
          image_presigned_url: mountainsById.get(mountain.uuid)?.image_presigned_url ?? null,
        }))
      );

      setClimbedMountains(
        climbedRows.map((mountain) => ({
          uuid: mountain.uuid,
          name: mountainsById.get(mountain.uuid)?.name ?? mountain.name,
          location: mountainsById.get(mountain.uuid)?.location ?? mountain.location ?? 'Unknown location',
          height: mountainsById.get(mountain.uuid)?.height ?? mountain.height ?? 0,
          description: mountainsById.get(mountain.uuid)?.description,
          image_presigned_url: mountainsById.get(mountain.uuid)?.image_presigned_url ?? null,
        }))
      );
    } catch (error) {
      console.log('Failed to get mountains:', error);
    }
  }, [logOut]);

  useFocusEffect(
    useCallback(() => {
      getMountains();
    }, [getMountains])
  );

  const summits = climbedMountains.length;

  return (
    <View style={styles.screen}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.pageTitle}>Mountains</Text>
          <Text style={styles.pageSubtitle}>Explore peaks and track your summits.</Text>
        </View>

        <View style={styles.infoRow}>
          <Pressable style={styles.infoCard} onPress={() => setTab(Tabs.climbed)}>
            <Text style={styles.infoValue}>{summits}</Text>
            <Text style={styles.infoLabel}>Summits</Text>
          </Pressable>
          <Pressable style={styles.infoCard} onPress={() => setTab(Tabs.all)}>
            <Text style={styles.infoValue}>{peakNumber}</Text>
            <Text style={styles.infoLabel}>Total peaks</Text>
          </Pressable>
        </View>

        <View style={styles.tabRow}>
          <Pressable
            style={[styles.tab, tab === Tabs.all && styles.tabActive]}
            onPress={() => setTab(Tabs.all)}
          >
            <Text style={[styles.tabText, tab === Tabs.all && styles.tabTextActive]}>All</Text>
          </Pressable>
          <Pressable
            style={[styles.tab, tab === Tabs.climbed && styles.tabActive]}
            onPress={() => setTab(Tabs.climbed)}
          >
            <Text style={[styles.tabText, tab === Tabs.climbed && styles.tabTextActive]}>
              Climbed
            </Text>
          </Pressable>
          <Pressable
            style={[styles.tab, tab === Tabs.toClimb && styles.tabActive]}
            onPress={() => setTab(Tabs.toClimb)}
          >
            <Text style={[styles.tabText, tab === Tabs.toClimb && styles.tabTextActive]}>
              To Climb
            </Text>
          </Pressable>
        </View>

      <View style={styles.listShell}>
        {tab === Tabs.all && <MountainList arr={mountains} view={(id: string) => {view(id)}} />}
        {tab === Tabs.climbed && <MountainList arr={climbedMountains} view={(id: string) => {view(id)}} />}
        {tab === Tabs.toClimb && <MountainList arr={activeMountains} view={(id: string) => {view(id)}} />}
      </View>
      </View>
    </View>
  );
}

function MountainList({ arr, view }: { arr: Mountain[], view: Function }) {
  const Item = ({ mountain }: { mountain: Mountain }) => (
    <Pressable style={styles.item} onPress={() => {view(mountain.uuid)}}>
      {mountain.image_presigned_url ? (
        <Image
          source={{ uri: mountain.image_presigned_url }}
          style={styles.mountainImage}
          resizeMode="cover"
        />
      ) : (
        <View
          style={[
            styles.mountainImage,
            {
              backgroundColor: c.surfaceMuted,
              justifyContent: 'center',
              alignItems: 'center',
            },
          ]}
        >
          <Text style={styles.emptyImageText}>No Image</Text>
        </View>
      )}
      <View style={styles.itemHeader}>
        <Text style={styles.itemTitle}>{mountain.name}</Text>
      </View>
      <View style={styles.itemBody}>
        <Text style={styles.itemSubtitle}>
          {mountain.location ?? 'Unknown location'}
        </Text>
        <Text style={styles.itemMeta}>
          {mountain.height ?? 0} ft
        </Text>
      </View>
    </Pressable>
  );

  const EmptyItem = (
    <View style={[styles.item, styles.emptyCard]}>
      <Text style={styles.emptyStateText}>No mountains under this category.</Text>
    </View>
  );

  return (
    <FlatList
      data={arr}
      keyExtractor={(item) => item.uuid}
      ListEmptyComponent={EmptyItem}
      renderItem={({ item }) => <Item mountain={item} />}
    />
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: c.background,
  },
  content: {
    flex: 1,
    padding: 16,
    paddingBottom: 24,
  },
  header: {
    marginBottom: 16,
  },
  pageTitle: {
    fontSize: 44,
    fontWeight: '700',
    color: c.heading,
    marginBottom: 2,
  },
  pageSubtitle: {
    fontSize: 18,
    color: c.subtitle,
  },
  infoRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  infoCard: {
    flex: 1,
    backgroundColor: c.surface,
    borderRadius: 14,
    padding: 16,
    shadowColor: c.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  infoValue: {
    fontSize: 32,
    fontWeight: '700',
    color: c.tint,
    marginBottom: 4,
  },
  infoLabel: {
    fontSize: 14,
    color: c.subtitle,
  },
  tabRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  tab: {
    flex: 1,
    minHeight: 44,
    borderRadius: 12,
    backgroundColor: c.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabActive: {
    backgroundColor: c.tint,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '700',
    color: c.subtitle,
  },
  tabTextActive: {
    color: c.onPrimary,
  },
  listShell: {
    flex: 1,
  },
  item: {
    backgroundColor: c.surface,
    marginBottom: 12,
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: c.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  mountainImage: {
    width: '100%',
    height: 168,
  },
  emptyImageText: {
    color: c.subtitle,
    fontSize: 14,
    fontWeight: '600',
  },
  itemHeader: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  itemTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: c.heading,
  },
  itemBody: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
  },
  itemSubtitle: {
    fontSize: 15,
    color: c.subtitle,
    marginBottom: 4,
  },
  itemMeta: {
    fontSize: 14,
    color: c.icon,
  },
  emptyCard: {
    padding: 20,
  },
  emptyStateText: {
    fontSize: 15,
    color: c.icon,
  },
});

export default MountainsList

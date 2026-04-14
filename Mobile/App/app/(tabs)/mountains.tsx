import { StyleSheet, Text, View, FlatList, Pressable, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { Colors } from '@/constants/theme';

const c = Colors.light;

type Mountain = {
  uuid: string;
  name: string;
  location?: string;
  height?: number;
  description?: string;
  image_presigned_url?: string | null;
};

function Mountains() {
  const mountains_url = 'http://10.0.2.2:8002';

  const mountainsClimbed: Mountain[] = [];
  const summits = mountainsClimbed.length;

  const [mountains, setMountains] = useState<Mountain[]>([]);
  const [peakNumber, setPeakNumber] = useState(0);

  const Tabs = {
    all: 0,
    climbed: 1,
    toClimb: 2,
  };

  const [tab, setTab] = useState(Tabs.all);

  async function getMountains() {
    try {
      const res = await fetch(`${mountains_url}/mountains`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (res.status !== 200) {
        console.log('Mountains list failed:', res.status);
        return;
      }

      const data = await res.json();

      const detailPromises = data.map((m: any) =>
        fetch(`${mountains_url}/mountains/${m.uuid}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        }).then(async (r) => {
          if (!r.ok) {
            throw new Error(`Failed to fetch detail for ${m.uuid}: ${r.status}`);
          }
          return r.json();
        })
      );

      const details = await Promise.all(detailPromises);

      const imagePromises = details.map((m: any) =>
        fetch(`${mountains_url}/mountains/${m.uuid}/image-url`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        })
          .then((r) => (r.status === 200 ? r.json() : null))
          .then((j) => (j?.url ? j.url : null))
          .catch(() => null)
      );

      const imageUrls = await Promise.all(imagePromises);

      const newMountains: Mountain[] = details.map((m: any, idx: number) => ({
        ...m,
        image_presigned_url: imageUrls[idx],
      }));

      setPeakNumber(newMountains.length);
      setMountains(newMountains);
    } catch (error) {
      console.log('Failed to get mountains:', error);
    }
  }

  useFocusEffect(
    useCallback(() => {
      getMountains();
    }, [])
  );

  return (
      <SafeAreaView style={styles.screen} edges={['top']}>
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
        {tab === Tabs.all && <MountainList arr={mountains} />}
        {tab === Tabs.climbed && <MountainList arr={mountainsClimbed} />}
        {tab === Tabs.toClimb && <MountainList arr={mountains} />}
      </View>
      </View>
    </SafeAreaView>
  );
}

function MountainList({ arr }: { arr: Mountain[] }) {
  const Item = ({ mountain }: { mountain: Mountain }) => (
    <Pressable style={styles.item}>
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

export default Mountains;

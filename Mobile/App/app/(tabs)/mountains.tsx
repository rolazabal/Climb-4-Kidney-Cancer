import { StyleSheet, Text, View, FlatList, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';

const theme = {
  primary: 'rgb(51, 51, 51)',
  secondary: 'rgb(102, 102, 101)',
  accent: 'rgb(205, 88, 56)',
  accentDark: 'rgb(185, 68, 36)',
  background: '#F9FAFB',
  white: '#FFFFFF',
};

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
    <SafeAreaView style={{ flex: 1, marginHorizontal: 10 }}>
      <View style={{ flex: 1 }}>
        <View style={{ flex: 1, marginBottom: 20 }}>
          <Text style={[styles.label, { color: theme.primary }]}>Mountains</Text>
          <Text style={styles.small}>Explore peaks and track your summits</Text>
        </View>

        <View style={{ flex: 2, marginVertical: 10, flexDirection: 'row' }}>
          <TouchableOpacity style={styles.info} onPress={() => setTab(Tabs.climbed)}>
            <Text style={[styles.label, { color: theme.accent }]}>{summits}</Text>
            <Text style={styles.small}>Summits</Text>
          </TouchableOpacity>

          <View style={{ flex: 1 }} />

          <TouchableOpacity style={styles.info} onPress={() => setTab(Tabs.all)}>
            <Text style={[styles.label, { color: theme.accent }]}>{peakNumber}</Text>
            <Text style={styles.small}>Total peaks</Text>
          </TouchableOpacity>
        </View>

        <View style={{ flex: 1, marginBottom: 10, flexDirection: 'row' }}>
          <TouchableOpacity
            style={[styles.tab, tab === Tabs.all && { backgroundColor: theme.accent }]}
            onPress={() => setTab(Tabs.all)}
          >
            <Text style={[styles.small, tab === Tabs.all && { color: theme.white }]}>All</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, tab === Tabs.climbed && { backgroundColor: theme.accent }]}
            onPress={() => setTab(Tabs.climbed)}
          >
            <Text style={[styles.small, tab === Tabs.climbed && { color: theme.white }]}>
              Climbed
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, tab === Tabs.toClimb && { backgroundColor: theme.accent }]}
            onPress={() => setTab(Tabs.toClimb)}
          >
            <Text style={[styles.small, tab === Tabs.toClimb && { color: theme.white }]}>
              To Climb
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={{ flex: 2 }}>
        {tab === Tabs.all && <MountainList arr={mountains} />}
        {tab === Tabs.climbed && <MountainList arr={mountainsClimbed} />}
        {tab === Tabs.toClimb && <MountainList arr={mountains} />}
      </View>
    </SafeAreaView>
  );
}

function MountainList({ arr }: { arr: Mountain[] }) {
  const Item = ({ mountain }: { mountain: Mountain }) => (
    <TouchableOpacity style={styles.item}>
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
              backgroundColor: '#E5E7EB',
              justifyContent: 'center',
              alignItems: 'center',
            },
          ]}
        >
          <Text style={{ color: theme.secondary }}>No Image</Text>
        </View>
      )}

      <View style={{ padding: 15, backgroundColor: theme.primary }}>
        <Text style={{ fontSize: 24, color: theme.white }}>{mountain.name}</Text>
      </View>

      <View style={{ padding: 15 }}>
        <Text style={{ fontSize: 18, color: theme.secondary }}>
          {mountain.location ?? 'Unknown location'}
        </Text>
        <Text style={{ fontSize: 18, color: theme.secondary }}>
          {mountain.height ?? 0} ft
        </Text>
      </View>
    </TouchableOpacity>
  );

  const EmptyItem = (
    <View style={[styles.item, { padding: 20 }]}>
      <Text style={styles.small}>No mountains under this category.</Text>
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
  label: {
    textAlign: 'center',
    fontSize: 44,
  },
  small: {
    textAlign: 'center',
    color: theme.secondary,
    fontSize: 20,
  },
  info: {
    flex: 20,
    padding: 10,
    backgroundColor: theme.white,
    borderRadius: 10,
  },
  tab: {
    flex: 1,
    padding: 10,
    borderRadius: 10,
  },
  item: {
    flex: 1,
    backgroundColor: theme.white,
    marginBottom: 10,
    borderRadius: 10,
    overflow: 'hidden',
  },
  mountainImage: {
    width: '100%',
    height: 140,
  },
});

export default Mountains;
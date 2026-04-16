import { MOUNTAINS_URL, THEME_COLORS } from '@/constants/api';
import { useAuth } from '@/context/auth';
import { apiFetch } from "@/utils/apiFetch";
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { FlatList, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Mountain } from '../(tabs)/mountains';
import { getConnection } from '../_layout';

function MountainsList({view}: {view: Function}) {
  const mountainsClimbed: Mountain[] = [];
  const summits = mountainsClimbed.length;

  const [mountains, setMountains] = useState<Mountain[]>([]);
  const [peakNumber, setPeakNumber] = useState(0);
  const { logOut } = useAuth();

  const Tabs = {
    all: 0,
    climbed: 1,
    toClimb: 2,
  };

  const [tab, setTab] = useState(Tabs.all);

  async function getMountains() {
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
    } catch (error) {
      console.log('Failed to get mountains:', error);
    }
  }

  useEffect(() => {
    getMountains();
  }, []);

  return (
    <View style={{ flex: 1, marginHorizontal: 10 }}>
      <View style={{ flex: 1 }}>
        <View style={{ flex: 1, marginBottom: 20 }}>
          <Text style={[styles.label, { color: THEME_COLORS.primary }]}>Mountains</Text>
          <Text style={styles.small}>Explore peaks and track your summits</Text>
        </View>
        <View style={{ flex: 2, marginVertical: 10, flexDirection: 'row' }}>
          <TouchableOpacity style={styles.info} onPress={() => setTab(Tabs.climbed)}>
            <Text style={[styles.label, { color: THEME_COLORS.accent }]}>{summits}</Text>
            <Text style={styles.small}>Summits</Text>
          </TouchableOpacity>
          <View style={{ flex: 1 }} />
          <TouchableOpacity style={styles.info} onPress={() => setTab(Tabs.all)}>
            <Text style={[styles.label, { color: THEME_COLORS.accent }]}>{peakNumber}</Text>
            <Text style={styles.small}>Total peaks</Text>
          </TouchableOpacity>
        </View>
        <View style={{ flex: 1, marginBottom: 10, flexDirection: 'row' }}>
          <TouchableOpacity
            style={[styles.tab, tab === Tabs.all && { backgroundColor: THEME_COLORS.accent }]}
            onPress={() => setTab(Tabs.all)}
          >
            <Text style={[styles.small, tab === Tabs.all && { color: THEME_COLORS.white }]}>All</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, tab === Tabs.climbed && { backgroundColor: THEME_COLORS.accent }]}
            onPress={() => setTab(Tabs.climbed)}
          >
            <Text style={[styles.small, tab === Tabs.climbed && { color: THEME_COLORS.white }]}>
              Climbed
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, tab === Tabs.toClimb && { backgroundColor: THEME_COLORS.accent }]}
            onPress={() => setTab(Tabs.toClimb)}
          >
            <Text style={[styles.small, tab === Tabs.toClimb && { color: THEME_COLORS.white }]}>
              To Climb
            </Text>
          </TouchableOpacity>
        </View>
      </View>
      <View style={{ flex: 2 }}>
        {tab === Tabs.all && <MountainList arr={mountains} view={(id: string) => {view(id)}} />}
        {tab === Tabs.climbed && <MountainList arr={mountainsClimbed} view={(id: string) => {view(id)}} />}
        {tab === Tabs.toClimb && <MountainList arr={mountains} view={(id: string) => {view(id)}} />}
      </View>
    </View>
  );
}

function MountainList({ arr, view }: { arr: Mountain[], view: Function }) {
  const Item = ({ mountain }: { mountain: Mountain }) => (
    <TouchableOpacity style={styles.item} onPress={() => {view(mountain.uuid)}}>
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
          <Text style={{ color: THEME_COLORS.secondary }}>No Image</Text>
        </View>
      )}
      <View style={{ padding: 15, backgroundColor: THEME_COLORS.primary }}>
        <Text style={{ fontSize: 24, color: THEME_COLORS.white }}>{mountain.name}</Text>
      </View>
      <View style={{ padding: 15 }}>
        <Text style={{ fontSize: 18, color: THEME_COLORS.secondary }}>
          {mountain.location ?? 'Unknown location'}
        </Text>
        <Text style={{ fontSize: 18, color: THEME_COLORS.secondary }}>
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
    color: THEME_COLORS.secondary,
    fontSize: 20,
  },
  info: {
    flex: 20,
    padding: 10,
    backgroundColor: THEME_COLORS.white,
    borderRadius: 10,
  },
  tab: {
    flex: 1,
    padding: 10,
    borderRadius: 10,
  },
  item: {
    flex: 1,
    backgroundColor: THEME_COLORS.white,
    marginBottom: 10,
    borderRadius: 10,
    overflow: 'hidden',
  },
  mountainImage: {
    width: '100%',
    height: 140,
  },
});

export default MountainsList

import {StyleSheet, Text, View, FlatList, TouchableOpacity} from 'react-native';
import { SafeAreaView } from "react-native-safe-area-context";
import { useState } from 'react';

const theme = {
    primary: 'rgb(51, 51, 51)',
    secondary: 'rgb(102, 102, 101)',
    accent: 'rgb(205, 88, 56)',
    accentDark: 'rgb(185, 68, 36)',
    background: '#F9FAFB',
    white: '#FFFFFF',
};

function Mountains() {

    const mountainData = {
        mountainsClimbed: [],
        mountainsToClimb: [
            {
                name: "Lobuche Peak",
                location: "Himalayan Mountains, Nepal",
                peak: "20,075 ft",
            },
            {
                name: "Mt. Bierstadt",
                location: "Colorado, USA",
                peak: "14,066 ft",
            },
            {
                name: "Lobuche Peak",
                location: "Himalayan Mountains, Nepal",
                peak: "20,075 ft",
            },
            {
                name: "Mt. Bierstadt",
                location: "Colorado, USA",
                peak: "14,066 ft",
            },
            {
                name: "Lobuche Peak",
                location: "Himalayan Mountains, Nepal",
                peak: "20,075 ft",
            },
            {
                name: "Mt. Bierstadt",
                location: "Colorado, USA",
                peak: "14,066 ft",
            },
        ]
    };

    const summits = mountainData.mountainsClimbed.length;
    const totalPeaks = summits + mountainData.mountainsToClimb.length;

    const Tabs = {
        all: 0,
        climbed: 1,
        toClimb: 2
    }
    const [tab, setTab] = useState(Tabs.climbed);

    return (
        <SafeAreaView style={{flex: 1, marginHorizontal: 10}}>
            <View style={{flex: 1}}>
                <View style={{flex: 1, marginBottom: 20}}>
                    <Text style={[styles.label, {color: theme.primary}]}>
                        Mountains
                    </Text>
                    <Text style={styles.small}>
                        Explore peaks and track your summits
                    </Text>
                </View>
                <View style={{flex: 2, marginVertical: 10, flexDirection: 'row'}}>
                    <View style={styles.info}>
                        <Text style={[styles.label, {color: theme.accent}]}>
                            {summits}
                        </Text>
                        <Text style={styles.small}>
                            Summits
                        </Text>
                    </View>
                    <View style={{flex: 1}}></View>
                    <View style={styles.info}>
                        <Text style={[styles.label, {color: theme.accent}]}>
                            {totalPeaks}
                        </Text>
                        <Text style={styles.small}>
                            Total peaks
                        </Text>
                    </View>
                </View>
                <View style={{flex: 1, marginBottom: 10, flexDirection: 'row'}}>
                    <TouchableOpacity style={[styles.tab, tab === Tabs.all && {backgroundColor: theme.accent}]} onPress={() => setTab(Tabs.all)}>
                        <Text style={[styles.small, tab === Tabs.all && {color: theme.white}]}>
                            All
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.tab, tab === Tabs.climbed && {backgroundColor: theme.accent}]} onPress={() => setTab(Tabs.climbed)}>
                        <Text style={[styles.small, tab === Tabs.climbed && {color: theme.white}]}>
                            Climbed
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.tab, tab === Tabs.toClimb && {backgroundColor: theme.accent}]} onPress={() => setTab(Tabs.toClimb)}>
                        <Text style={[styles.small, tab === Tabs.toClimb && {color: theme.white}]}>
                            To Climb
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>
            <View style={{flex: 2}}>
                {tab === Tabs.all &&
                    <MountainList arr={mountainData.mountainsToClimb.concat(mountainData.mountainsClimbed)} />
                }
                {tab === Tabs.climbed &&
                    <MountainList arr={mountainData.mountainsClimbed} />
                }
                {tab === Tabs.toClimb &&
                    <MountainList arr={mountainData.mountainsToClimb} />
                }
            </View>
        </SafeAreaView>
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

function MountainList({arr}) {

    const Item = ({mountain}) => (
        <View style={styles.item}>
            <View style={{flex: 1, padding: 10, backgroundColor: theme.primary, borderTopStartRadius: 10, borderTopEndRadius: 10}}>
                <Text style={{fontSize: 24, color: theme.white}}>{mountain.name}</Text>
            </View>
            <View style={{flex: 3, padding: 10}}>
                <Text style={{fontSize: 18, color: theme.secondary}}>{mountain.location}</Text>
                <Text style={{fontSize: 18, color: theme.secondary}}>{mountain.peak}</Text>
            </View>
        </View>
    );

    const EmptyItem = (
        <View style={styles.item}>
            <Text style={styles.small}>
                No mountains under this category.
            </Text>
        </View>
    );

    return (
        <FlatList
            data={arr}
            ListEmptyComponent={EmptyItem}
            renderItem={({item}) => <Item mountain={item} />}
        />
    );
}

const styles = StyleSheet.create({
    label: {
        textAlign: 'center',
        fontSize: 32,
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
    }
});

export default Mountains;
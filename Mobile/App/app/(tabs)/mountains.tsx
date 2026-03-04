import {StyleSheet, Text, View, FlatList, TouchableOpacity} from 'react-native';
import { SafeAreaView } from "react-native-safe-area-context";
import { useState, useEffect } from 'react';

const theme = {
    primary: 'rgb(51, 51, 51)',
    secondary: 'rgb(102, 102, 101)',
    accent: 'rgb(205, 88, 56)',
    accentDark: 'rgb(185, 68, 36)',
    background: '#F9FAFB',
    white: '#FFFFFF',
};

function Mountains() {

    const mountains_url = "http://127.0.0.1:8000";

    const [mountains, setMountains] = useState(null);

    async function getMoutains() {
        let res = await fetch(mountains_url, {
            method: 'GET',
            headers: {'Content-Type': 'application/json'},
        });
        if (res.status === 200) {
            let data = await res.json();
            setMountains(data);
        } else {
            console.log(res.status.toString());
        }
    }

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

    useEffect(() => {
        if (mountains === null) {
            getMoutains();
        }
    }, []);

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
                    <MountainList arr={mountains} />
                }
                {tab === Tabs.climbed &&
                    <MountainList arr={mountains} />
                }
                {tab === Tabs.toClimb &&
                    <MountainList arr={mountains} />
                }
            </View>
        </SafeAreaView>
    );
}

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
import {StyleSheet, Text, View, FlatList, TouchableOpacity, Pressable} from 'react-native';
import { SafeAreaView } from "react-native-safe-area-context";
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

function Mountains() {

    const mountains_url = "http://10.0.2.2:8000";

    const mountainsClimbed = new Array();

    const summits = mountainsClimbed.length;

    const [mountains, setMountains] = useState(new Array());
    const [peakNumber, setPeakNumber] = useState(0);

    const Tabs = {
        all: 0,
        climbed: 1,
        toClimb: 2
    }
    const [tab, setTab] = useState(Tabs.all);

    async function getMoutains() {
        let res = await fetch(mountains_url + "/mountains", {
            method: 'GET',
            headers: {'Content-Type': 'application/json'},
        });
        if (res.status === 200) {
            let data = await res.json();
            let promises = [];
            // create array of promise fetch requests for each mountain's data
            for (let x in data) {
                let req_str = mountains_url + "/mountains/" + data[x].uuid;
                promises.push(fetch(req_str, {
                    method: 'GET',
                    headers: {'Content-Type': 'application/json'},
                }));
            }
            let new_mountains = new Array();
            // resolve each promise in the array
            Promise.all(promises)
                // map each response to data array with json contents
                .then(res_arr => Promise.all(res_arr.map(res => res.json())))
                .then(data => {
                    // append mountain data to mountains list
                    for (let x in data) {
                        new_mountains.push(data[x]);
                    }
                    setPeakNumber(new_mountains.length);
                    setMountains(new_mountains);
                })
                .catch(error => {
                    console.log("Failed to get individual mountain data!");
                }
            );
        } else {
            console.log(res.status.toString());
        }
    }

    /* old mock data
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
    */

    // load mountain data on page mount
    useFocusEffect(
        useCallback(() => {
            getMoutains();
        }, [])
    );

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
                    <TouchableOpacity style={styles.info} onPress={() => setTab(Tabs.climbed)}>
                        <Text style={[styles.label, {color: theme.accent}]}>
                            {summits}
                        </Text>
                        <Text style={styles.small}>
                            Summits
                        </Text>
                    </TouchableOpacity>
                    <View style={{flex: 1}}></View>
                    <TouchableOpacity style={styles.info} onPress={() => setTab(Tabs.all)}>
                        <Text style={[styles.label, {color: theme.accent}]}>
                            {peakNumber}
                        </Text>
                        <Text style={styles.small}>
                            Total peaks
                        </Text>
                    </TouchableOpacity>
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
                    <MountainList arr={mountainsClimbed} />
                }
                {tab === Tabs.toClimb &&
                    <MountainList arr={mountains} />
                }
            </View>
        </SafeAreaView>
    );
}

function MountainList({arr}: {arr: Array<{uuid: string; name: string; location: string; height: number}>}) {

    const Item = ({mountain}: {mountain: {uuid: string; name: string; location: string; height: number}}) => (
        <TouchableOpacity style={styles.item} id={mountain.uuid}>
            <View style={{flex: 1, padding: 15, backgroundColor: theme.primary, borderTopStartRadius: 10, borderTopEndRadius: 10}}>
                <Text style={{fontSize: 24, color: theme.white}}>{mountain.name}</Text>
            </View>
            <View style={{flex: 3, padding: 15}}>
                <Text style={{fontSize: 18, color: theme.secondary}}>{mountain.location}</Text>
                <Text style={{fontSize: 18, color: theme.secondary}}>{mountain.height} ft</Text>
            </View>
        </TouchableOpacity>
    );

    const EmptyItem = (
        <View style={[styles.item, {padding: 20}]}>
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
    }
});

export default Mountains;
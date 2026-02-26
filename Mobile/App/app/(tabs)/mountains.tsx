import {StyleSheet, ScrollView, Text, View, FlatList, TouchableOpacity} from 'react-native';
import { SafeAreaView } from "react-native-safe-area-context";
import { useState } from 'react';

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
                    <Text style={styles.label}>
                        Mountains
                    </Text>
                    <Text style={styles.small}>
                        Explore peaks and track your summits
                    </Text>
                </View>
                <View style={{flex: 2, marginVertical: 10, flexDirection: 'row'}}>
                    <View style={styles.info}>
                        <Text style={styles.label}>
                            {summits}
                        </Text>
                        <Text style={styles.small}>
                            Summits
                        </Text>
                    </View>
                    <View style={{flex: 1}}></View>
                    <View style={styles.info}>
                        <Text style={styles.label}>
                            {totalPeaks}
                        </Text>
                        <Text style={styles.small}>
                            Total peaks
                        </Text>
                    </View>
                </View>
                <View style={{flex: 1, marginBottom: 10, flexDirection: 'row'}}>
                    <TouchableOpacity style={[styles.tab, tab == Tabs.all && {backgroundColor: 'orange'}]} onPress={() => setTab(Tabs.all)}>
                        <Text style={styles.small}>
                            All
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.tab, tab == Tabs.climbed && {backgroundColor: 'orange'}]} onPress={() => setTab(Tabs.climbed)}>
                        <Text style={styles.small}>
                            Climbed
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.tab, tab == Tabs.toClimb && {backgroundColor: 'orange'}]} onPress={() => setTab(Tabs.toClimb)}>
                        <Text style={styles.small}>
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

function MountainList({arr}) {

    const Item = ({mountain}) => (
        <View style={[styles.item, {flex: 1, backgroundColor: 'powderblue'}]}>
            <View style={{flex: 1, padding: 10, backgroundColor: 'grey', borderTopStartRadius: 10, borderTopEndRadius: 10}}>
                <Text style={{fontSize: 24}}>{mountain.name}</Text>
            </View>
            <View style={{flex: 3, padding: 10}}>
                <Text style={{fontSize: 18}}>{mountain.location}</Text>
                <Text style={{fontSize: 18}}>{mountain.peak}</Text>
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
        fontSize: 20,
    },
    info: {
        flex: 20,
        padding: 10,
        backgroundColor: 'powderblue',
        borderRadius: 10,

    },
    tab: {
        flex: 1,
        padding: 10,
        borderRadius: 10,
    },
    item: {
        marginBottom: 10,
        borderRadius: 10,
    }
});

export default Mountains;
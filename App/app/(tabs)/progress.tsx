import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from "react-native-safe-area-context";
import { insertElevationRecord, readElevationRecords } from '@/lib/health';
import { syncHealthClimbs } from '@/lib/healthSync';

const theme = {
    primary: 'rgb(51, 51, 51)',
    secondary: 'rgb(102, 102, 101)',
    accent: 'rgb(205, 88, 56)',
    accentDark: 'rgb(185, 68, 36)',
    background: '#F9FAFB',
    white: '#FFFFFF',
};

function Progress() {

    const [elevation, setElevation] = useState(0);

    const lastDate = useRef(new Date());

    async function getProgress() {
        console.log("Getting progress");
        try {
            await syncHealthClimbs();
        } catch (error) {
            console.log("Health sync skipped while loading progress:", error);
        }

        let endDate = new Date();
        let startDate = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());

        console.log(startDate);

        const { records } = await readElevationRecords(startDate.toISOString(), endDate.toISOString());

        //console.log(records);

        if (records.length < 1) {
            return;
        }

        let elevation = 0;

        records.forEach((record) => {
            elevation += record.elevation.inFeet;
        });

        setElevation(elevation);
    }

    async function recordProgress() {
        console.log("Recording progress");

        let date = new Date();

        let ids = await insertElevationRecord({
            startTime: lastDate.current.toISOString(),
            endTime: date.toISOString(),
            feet: 10,
        });

        lastDate.current = date;

        console.log(ids);

        await getProgress();
    }

    useFocusEffect(useCallback(() => {
        getProgress();
    }, []));

    return (
        <SafeAreaView style={{flex: 1, marginHorizontal: 10}}>
            <TouchableOpacity onPress={() => {recordProgress()}}>
                <Text>
                    {Platform.OS === 'android' ? 'Register 10 ft' : 'Refresh Health Data'}
                </Text>
            </TouchableOpacity>
            <View style={{flex: 2}}>
                <Text style={styles.label}>
                    Progress
                </Text>
                <Text style={styles.small}>
                    Track your progress
                </Text>
            </View>
            <View style={{flex: 8}}>
                <View style={styles.card}>
                    <View style={styles.card_head}>
                        <Text style={styles.card_head_text}>
                            Activity
                        </Text>
                    </View>
                    <View style={{flex: 3, padding: 50}}>
                        <Text style={[styles.label, {color: theme.accent}]}>
                            {elevation}
                        </Text>
                        <Text style={styles.small}>
                            ft climbed today
                        </Text>
                    </View>
                </View>
                <View style={styles.card}>
                    <View style={styles.card_head}>
                        <Text style={styles.card_head_text}>
                            Daily Quest
                        </Text>
                    </View>
                    <View style={{flex: 3, padding: 50}}>
                        <Text style={styles.small}>
                            Some quest info
                        </Text>
                    </View>
                </View>
            </View>
        </SafeAreaView>
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
    card: {
        flex: 1,
        backgroundColor: theme.white,
        marginBottom: 10,
        borderRadius: 10,
    },
    card_head: {
        flex: 1,
        padding: 10,
        backgroundColor: theme.primary,
        borderTopStartRadius: 10,
        borderTopEndRadius: 10,
    },
    card_head_text: {
        fontSize: 24,
        color: theme.white,
    }
});

export default Progress;

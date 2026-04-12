import {StyleSheet, Text, View, FlatList, TouchableOpacity} from 'react-native';
import { SafeAreaView } from "react-native-safe-area-context";
import { useState } from 'react';
import { TextAlignCenter } from 'lucide-react-native';
//import { MOUNTAINS_URL, PROGRESS_URL } from '@/constants/api';

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

    return (
        <SafeAreaView style={{flex: 1, marginHorizontal: 10}}>
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
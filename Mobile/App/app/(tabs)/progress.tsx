import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from "react-native-safe-area-context";
import { useState } from 'react';
import { Colors } from '@/constants/theme';

const c = Colors.light;

function Progress() {
    const [elevation] = useState(0);

    return (
        <SafeAreaView style={styles.screen} edges={["top"]}>
            <View style={styles.content}>
                <Text style={styles.pageTitle}>
                    Progress
                </Text>
                <Text style={styles.pageSubtitle}>
                    Track your progress and stay consistent.
                </Text>

                <View style={styles.highlightsRow}>
                    <View style={styles.highlightCard}>
                        <Text style={styles.highlightValue}>{elevation}</Text>
                        <Text style={styles.highlightLabel}>ft climbed today</Text>
                    </View>
                    <View style={styles.highlightCard}>
                        <Text style={styles.highlightValue}>0</Text>
                        <Text style={styles.highlightLabel}>active goals</Text>
                    </View>
                </View>

                <View style={styles.card}>
                    <Text style={styles.cardTitle}>
                            Activity
                    </Text>
                    <View style={styles.cardBody}>
                        <Text style={styles.metricValue}>
                            {elevation}
                        </Text>
                        <Text style={styles.metricLabel}>
                            ft climbed today
                        </Text>
                    </View>
                </View>
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>
                            Daily Quest
                    </Text>
                    <View style={styles.questPanel}>
                        <Text style={styles.questHeadline}>
                            Climb 500 ft today
                        </Text>
                        <Text style={styles.questCopy}>
                            Complete a short stair or hill session to keep your streak moving.
                        </Text>
                    </View>
                </View>
            </View>
        </SafeAreaView>
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
        paddingBottom: 32,
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
        marginBottom: 16,
    },
    highlightsRow: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 16,
    },
    highlightCard: {
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
    highlightValue: {
        fontSize: 28,
        fontWeight: '700',
        color: c.tint,
        marginBottom: 4,
    },
    highlightLabel: {
        fontSize: 14,
        color: c.subtitle,
    },
    card: {
        backgroundColor: c.surface,
        borderRadius: 14,
        padding: 16,
        marginBottom: 12,
        shadowColor: c.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 2,
    },
    cardTitle: {
        fontSize: 28,
        fontWeight: '700',
        color: c.heading,
        marginBottom: 12,
    },
    cardBody: {
        minHeight: 168,
        borderRadius: 12,
        backgroundColor: c.surfaceMuted,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
    },
    metricValue: {
        fontSize: 44,
        fontWeight: '700',
        color: c.tint,
        marginBottom: 8,
    },
    metricLabel: {
        fontSize: 18,
        color: c.subtitle,
        textAlign: 'center',
    },
    questPanel: {
        borderRadius: 12,
        backgroundColor: c.surfaceWarm,
        padding: 20,
    },
    questHeadline: {
        fontSize: 20,
        fontWeight: '700',
        color: c.heading,
        marginBottom: 8,
    },
    questCopy: {
        fontSize: 15,
        lineHeight: 22,
        color: c.subtitle,
    },
});

export default Progress;

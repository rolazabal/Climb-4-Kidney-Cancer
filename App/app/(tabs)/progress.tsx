import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from "react-native-safe-area-context";
import { Colors } from '@/constants/theme';
import { addSampleElevation, getHealthData, HealthProvider } from '@/lib/healthData';

const c = Colors.light;

function Progress() {
    const [elevation, setElevation] = useState(0);
    const [provider, setProvider] = useState<HealthProvider>('unsupported');
    const [statusMessage, setStatusMessage] = useState<string | null>(null);

    async function getProgress() {
        const result = await getHealthData();
        setElevation(result.elevationFt);
        setProvider(result.provider);
        setStatusMessage(result.permissionGranted ? null : result.message ?? "Health data permission was denied.");
    }

    async function recordProgress() {
        const result = await addSampleElevation(10);
        setElevation(result.elevationFt);
        setProvider(result.provider);
        setStatusMessage(result.permissionGranted ? null : result.message ?? "Unable to update health data.");

        if (result.provider !== 'health-connect') {
            Alert.alert(
                "Read-only on this device",
                "Sample health writes are only available through Health Connect on Android. iOS will still read Apple Health data."
            );
            return;
        }
    }

    useFocusEffect(useCallback(() => {
        getProgress();
    }, []));

    const providerLabel =
        provider === 'health-connect'
            ? 'Health Connect'
            : provider === 'healthkit'
              ? 'Apple Health'
              : 'Health data';

    return (
        <SafeAreaView style={styles.screen} edges={["top"]}>
            <View style={styles.content}>
                <Pressable style={styles.startButton} onPress={() => {recordProgress()}}>
                    <Text style={styles.startButtonText}>
                        Register 10 ft
                    </Text>
                </Pressable>

                <Text style={styles.pageTitle}>
                    Progress
                </Text>
                <Text style={styles.pageSubtitle}>
                    Track your progress and stay consistent.
                </Text>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Today</Text>
                    <View style={styles.card}>
                        <View style={styles.metricPanel}>
                            <Text style={styles.metricValue}>
                                {Math.round(elevation)}
                            </Text>
                            <Text style={styles.metricLabel}>
                                ft climbed today
                            </Text>
                        </View>
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Activity</Text>
                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>{providerLabel}</Text>
                        <Text style={styles.cardSubtitle}>
                            {provider === 'healthkit'
                                ? 'Your elevation total is estimated from Apple Health flights climbed data.'
                                : 'Your elevation total is pulled from recorded `ElevationGained` entries.'}
                        </Text>
                        <Text style={styles.cardMeta}>
                            Total tracked today: {Math.round(elevation).toLocaleString()} ft
                        </Text>
                        {statusMessage ? (
                            <Text style={styles.statusText}>{statusMessage}</Text>
                        ) : null}
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Daily Quest</Text>
                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>Climb 500 ft today</Text>
                        <Text style={styles.cardSubtitle}>
                            Keep your momentum going with a short stair, hill, or incline session.
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
    startButton: {
        backgroundColor: c.tint,
        borderRadius: 14,
        minHeight: 56,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    startButtonText: {
        color: c.onPrimary,
        fontSize: 18,
        fontWeight: '700',
    },
    section: {
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 28,
        fontWeight: '700',
        color: c.heading,
        marginBottom: 12,
    },
    card: {
        backgroundColor: c.surface,
        borderRadius: 14,
        padding: 14,
        shadowColor: c.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 2,
    },
    metricPanel: {
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
    cardTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: c.heading,
        marginBottom: 4,
    },
    cardSubtitle: {
        fontSize: 15,
        color: c.subtitle,
        lineHeight: 22,
    },
    cardMeta: {
        fontSize: 14,
        color: c.icon,
        marginTop: 10,
    },
    statusText: {
        fontSize: 14,
        color: c.error,
        marginTop: 10,
        lineHeight: 20,
    },
});

export default Progress;

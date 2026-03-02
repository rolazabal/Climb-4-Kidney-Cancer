import React, { useMemo, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/constants/theme';
import { readTodayHealthData, requestHealthAccess } from '@/services/health-connect';

export default function ProgressScreen() {
  const c = Colors.light;
  const [loading, setLoading] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [steps, setSteps] = useState<number | null>(null);
  const [distanceMeters, setDistanceMeters] = useState<number | null>(null);
  const [status, setStatus] = useState(
    Platform.select({
      ios: 'Connect to Apple Health to load today’s movement data.',
      android: 'Connect to Health Connect to load today’s movement data.',
      default: 'Health data is not available on this platform.',
    }) ?? 'Health data is not available on this platform.'
  );

  const distanceMiles = useMemo(() => {
    if (distanceMeters == null) {
      return null;
    }

    return distanceMeters * 0.000621371;
  }, [distanceMeters]);

  const connect = async () => {
    setLoading(true);
    const result = await requestHealthAccess();
    setLoading(false);

    if (!result.ok) {
      setPermissionGranted(false);
      setStatus(result.reason);
      return;
    }

    setPermissionGranted(true);
    setStatus('Connected. Tap Refresh to pull today’s data.');
  };

  const refreshData = async () => {
    setLoading(true);
    const result = await readTodayHealthData();
    setLoading(false);

    if (!result.ok) {
      setStatus(result.reason);
      return;
    }

    setSteps(result.data.steps);
    setDistanceMeters(result.data.distanceMeters);
    setStatus('Health data updated.');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.background }]} edges={['top']}>
      <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
        <Text style={[styles.title, { color: c.heading }]}>Health Progress</Text>
        <Text style={[styles.subtitle, { color: c.subtitle }]}>{status}</Text>

        <View style={styles.metricRow}>
          <Text style={[styles.metricLabel, { color: c.subtitle }]}>Steps Today</Text>
          <Text style={[styles.metricValue, { color: c.heading }]}>
            {steps == null ? '--' : steps.toLocaleString()}
          </Text>
        </View>

        <View style={styles.metricRow}>
          <Text style={[styles.metricLabel, { color: c.subtitle }]}>Distance Today</Text>
          <Text style={[styles.metricValue, { color: c.heading }]}>
            {distanceMiles == null ? '--' : `${distanceMiles.toFixed(2)} mi`}
          </Text>
        </View>

        <View style={styles.buttons}>
          <Pressable
            style={[
              styles.button,
              { backgroundColor: c.tint },
              loading ? { opacity: 0.6 } : null,
            ]}
            disabled={loading}
            onPress={connect}>
            <Text style={[styles.buttonText, { color: c.onPrimary }]}>
              {loading ? 'Working...' : permissionGranted ? 'Reconnect' : 'Connect'}
            </Text>
          </Pressable>

          <Pressable
            style={[
              styles.button,
              { backgroundColor: c.surfaceMuted, borderColor: c.border, borderWidth: 1 },
              loading ? { opacity: 0.6 } : null,
            ]}
            disabled={loading || !permissionGranted}
            onPress={refreshData}>
            <Text style={[styles.buttonText, { color: c.heading }]}>Refresh</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 22,
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  metricLabel: {
    fontSize: 16,
  },
  metricValue: {
    fontSize: 22,
    fontWeight: '700',
  },
  buttons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
  },
});

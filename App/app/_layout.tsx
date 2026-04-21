import { AuthProvider } from '@/context/auth';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { initializeHealthTracking, isHealthTrackingAvailable, requestHealthTrackingPermissions } from '@/lib/health';
import { getConnection } from '@/lib/database';
import { ensureHealthSyncState, syncHealthClimbs } from '@/lib/healthSync';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import * as BackgroundTask from 'expo-background-task';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as TaskManager from 'expo-task-manager';
import { useEffect, useRef } from 'react';
import { AppState, Platform } from 'react-native';
import 'react-native-reanimated';

export const unstable_settings = {
  anchor: '(tabs)',
};

function RootLayout() {
  const colorScheme = useColorScheme();

  // define background task
  const DATA_TASK_ID = 'data_task';

  if (!TaskManager.isTaskDefined(DATA_TASK_ID)) {
    TaskManager.defineTask(DATA_TASK_ID, async () => {
      console.log("Executing task");
      try {
        await syncHealthClimbs();
      } catch (error) {
        console.error("Error executing task", error);
      }
      return BackgroundTask.BackgroundTaskResult.Success;
    });
  }

  async function registerBackgroundTaskAsync() {
    console.log("Registering task");
    return BackgroundTask.registerTaskAsync(DATA_TASK_ID);
  }

  async function triggerTask() {
    await BackgroundTask.triggerTaskWorkerForTestingAsync();
  }

  // app database setup
  async function initializeDatabase() {
    let db = await getConnection();
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS times (time INTEGER, climb_id TEXT, is_start BOOLEAN);
      CREATE TABLE IF NOT EXISTS climbs (id TEXT, mountain_id TEXT, elevation INTEGER DEFAULT 0, is_active BOOLEAN DEFAULT 1);
      CREATE TABLE IF NOT EXISTS mountains (id TEXT, name TEXT, location TEXT, height INTEGER, summited BOOLEAN DEFAULT 0);
      CREATE TABLE IF NOT EXISTS notifications (id INTEGER, message TEXT, date INTEGER);
      CREATE TABLE IF NOT EXISTS sync (mountains BOOLEAN, climbs BOOLEAN);
    `);
    await ensureHealthSyncState();

    const syncRows = await db.getAllAsync('SELECT rowid FROM sync LIMIT 1');

    if (syncRows.length === 0) {
      let statement = await db.prepareAsync('INSERT INTO sync VALUES ($mountains, $climbs)');
      try {
        await statement.executeAsync({ $mountains: false, $climbs: false });
      } finally {
        await statement.finalizeAsync();
      }
    }
  }

  const appState = useRef(AppState.currentState);

  useEffect(() => {
    const initTask = async () => {
      // initialize db, permissions, and background task
      await initializeDatabase();

      if (isHealthTrackingAvailable()) {
        await initializeHealthTracking();
        await requestHealthTrackingPermissions();
        await syncHealthClimbs();
      }

      if (Platform.OS === 'android') {
        await registerBackgroundTaskAsync();
        await BackgroundTask.getStatusAsync();
        await TaskManager.isTaskRegisteredAsync(DATA_TASK_ID);
      }
    };
    console.log("Root Loaded!");
    initTask();

    // create listener for change in appState, capture new state in nextAppState
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (appState.current.match(/inactive|background/) &&
      nextAppState === 'active') {
        // app went from background to foreground
        console.log("Welcome back!");
        syncHealthClimbs().catch((error) => {
          console.error("Failed to sync Health data on foreground:", error);
        });
      } else {
        console.log("byebye");
        if (Platform.OS === 'android') {
          triggerTask();
        }
      }
      // apply the change
      appState.current = nextAppState;
    });

    // remove the listener on unmount
    return () => {
      subscription.remove();
    };
  }, []);

  return (
    <AuthProvider>
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
    </AuthProvider>
  );
}

export default RootLayout;

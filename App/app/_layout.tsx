import { AuthProvider } from '@/context/auth';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { initializeHealthTracking, isHealthTrackingAvailable, readElevationRecords, requestHealthTrackingPermissions } from '@/lib/health';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import * as BackgroundTask from 'expo-background-task';
import { Stack } from 'expo-router';
import * as SQLite from 'expo-sqlite';
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
      // get current time
      let date = new Date();

      let db = await getConnection();
      // these rows need to be deleted upon being read
      let rows = await db.getAllAsync('SELECT * from times');
      
      let ranges = new Array();
      let activeClimbs = new Array();
      let lastDate = new Date();

      // process historic climb data ==========================================
      rows.forEach((row) => {
        // get time
        let curDate = new Date(row.time);

        // if we have active climbs, create a range
        if (activeClimbs.length > 0) {
          ranges.push({
            climbs: activeClimbs,
            startTime: lastDate.toISOString(),
            endTime: curDate.toISOString()
          });
        }

        lastDate = curDate;

        if (row.is_start) {
          // add new climb to active climbs
          activeClimbs.push(row.climb_id);
        } else {
          // remove climb from active climbs
          let index = activeClimbs.indexOf(row.climb_id);
          let temp = activeClimbs.slice(0, index);
          if (index < activeClimbs.length - 1) {
            temp.concat(activeClimbs.slice(index + 1, activeClimbs.length));
          }
          activeClimbs = temp;
        }

        console.log(ranges);
      });

      // get health data from ranges
      await Promise.all(ranges.map((range) =>
        readElevationRecords(range.startTime, range.endTime).then((record) => {
          // distribute elevation across active climbs in range
          console.log(record);
          // TODO: distribute recorded elevation across active climbs.
        })
      ));

      // process currently active climbs ======================================
      let { records } = await readElevationRecords(lastDate.toISOString(), date.toISOString());
      if (records.length > 0) {
        console.log(`Read ${records.length} current elevation records`);
      }
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

export async function getConnection() {
    return dbPromise;
}

const dbPromise = SQLite.openDatabaseAsync("app", { useNewConnection: false });

export default RootLayout;

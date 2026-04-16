import { useColorScheme } from '@/hooks/use-color-scheme';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import * as BackgroundTask from 'expo-background-task';
import { Stack } from 'expo-router';
import * as SQLite from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import * as TaskManager from 'expo-task-manager';
import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { initialize, readRecords, requestPermission } from 'react-native-health-connect';
import 'react-native-reanimated';

export const unstable_settings = {
  anchor: '(tabs)',
};

function RootLayout() {
  const colorScheme = useColorScheme();

  // permissions
  async function requestPerms() {
    await requestPermission([
      {
        accessType: 'read',
        recordType: 'BackgroundAccessPermission'
      },
      {
        accessType: 'read',
        recordType: 'ElevationGained'
      },
      {
        accessType: 'write',
        recordType: 'ElevationGained'
      }
    ]);
  }

  // define background task
  const DATA_TASK_ID = 'data_task';
  const [taskRegistered, setTaskRegistered] = useState<boolean>(false);
  const [taskStatus, setTaskStatus] = useState<BackgroundTask.BackgroundTaskStatus | null>(null);

  TaskManager.defineTask(DATA_TASK_ID, async () => {
    console.log("Executing task");
    try {
      let date = new Date();

      let db = await getConnection();
      let rows = await db.getAllAsync('SELECT * from times');
      
      if (rows.length < 1) {
        return BackgroundTask.BackgroundTaskResult.Success;
      }

      let ranges = new Array();
      let activeClimbs = new Array();
      let lastDate = new Date();

      rows.forEach((row) => {
        //console.log(row);

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
          if (index !== activeClimbs.length - 1) {
            temp.concat(activeClimbs.slice(index + 1, activeClimbs.length));
          }
          activeClimbs = temp;
        }

        console.log(ranges);
      });

      let recordPromises = ranges.map((range) =>
        readRecords('ElevationGained', {
          timeRangeFilter: {
            operator: 'between',
            startTime: range.startTime,
            endTime: range.endTime
          }
        }).then((record) => {
          console.log(record);
        })
      );
    } catch (error) {
      console.error("Error executing task", error);
    }
    return BackgroundTask.BackgroundTaskResult.Success;
  });

  async function registerBackgroundTaskAsync() {
    console.log("Registering task");
    return BackgroundTask.registerTaskAsync(DATA_TASK_ID);
  }

  async function updateAsync() {
    const status = await BackgroundTask.getStatusAsync();
    setTaskStatus(status);
    const isRegistered = await TaskManager.isTaskRegisteredAsync(DATA_TASK_ID);
    setTaskRegistered(isRegistered);
  }

  async function triggerTask() {
    await BackgroundTask.triggerTaskWorkerForTestingAsync();
  }

  // app database setup
  async function initializeDatabase() {
    let db = await getConnection();
    await db.execAsync(`
      DROP TABLE IF EXISTS times;
      CREATE TABLE times (time INTEGER, climb_id TEXT, is_start BOOLEAN);
      CREATE TABLE IF NOT EXISTS climbs (id TEXT, mountain_id TEXT, elevation INTEGER, is_active BOOLEAN);
      DROP TABLE IF EXISTS mountains;
      CREATE TABLE mountains (id TEXT, name TEXT, location TEXT, height INTEGER, summited BOOLEAN);
      CREATE TABLE IF NOT EXISTS notifications (id INTEGER, message TEXT, date INTEGER);
      DROP TABLE IF EXISTS sync;
      CREATE TABLE sync (mountains BOOLEAN, climbs BOOLEAN);
    `);
    let statement = await db.prepareAsync('INSERT INTO times VALUES ($time, $climb, $start)');
    try {
      // test dates
      let date = new Date();
      let date1 = new Date(date);
      date1.setMinutes(date.getMinutes() + 10);
      let date2 = new Date(date1);
      date2.setMinutes(date1.getMinutes() + 10);
      let date3 = new Date(date2);
      date3.setMinutes(date2.getMinutes() + 10);

      // insert test climb time data
      await statement.executeAsync({$time: date.getTime(), $climb: "0", $start: true});
      await statement.executeAsync({$time: date1.getTime(), $climb: "1", $start: true});
      await statement.executeAsync({$time: date2.getTime(), $climb: "1", $start: false});
      await statement.executeAsync({$time: date3.getTime(), $climb: "0", $start: false});

      // setup sync table
      statement = await db.prepareAsync('INSERT INTO sync VALUES ($1, $2)');
      await statement.executeAsync({$1: false, $2: false});
    } finally {
      await statement.finalizeAsync();
    }
  }

  const appState = useRef(AppState.currentState);

  useEffect(() => {
    const initTask = async () => {
      await initializeDatabase();
      initialize();
      await requestPerms();
      await registerBackgroundTaskAsync();
      await updateAsync();
    };
    console.log("Root Loaded!");
    // register background task
    initTask();
    // create listener for change in appState, capture new state in nextAppState
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (appState.current.match(/inactive|background/) &&
      nextAppState === 'active') {
        // app went from background to foreground
        console.log("Welcome back!");
      } else {
        console.log("byebye");
        triggerTask();
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
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}

export async function getConnection() {
    let db = await SQLite.openDatabaseAsync("app", {useNewConnection: true});
    return db;
}

export default RootLayout;
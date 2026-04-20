import { AuthProvider } from '@/context/auth';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import * as BackgroundTask from 'expo-background-task';
import { Stack } from 'expo-router';
import * as SQLite from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import * as TaskManager from 'expo-task-manager';
import { useEffect, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import 'react-native-reanimated';

let connectionPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export const unstable_settings = {
  anchor: '(tabs)',
};

function RootLayout() {
  const colorScheme = useColorScheme();

  // permissions
  async function getPermissions() {
    if (Platform.OS !== 'android') {
      return;
    }
    const healthConnect = await import('react-native-health-connect');
    await healthConnect.requestPermission([
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

  // helper methods
  async function assignElevationToClimbs(ids: string[], feet: number) {
    let distributed = feet / ids.length;

    let db = await getConnection();
    let statement = await db.prepareAsync('UPDATE climbs SET elevation = elevation + $feet WHERE id = $id');

    ids.forEach(async (id) => {
      await statement.executeAsync({$feet: distributed, $id: id});
    });

    await statement.finalizeAsync();
  }

  async function summitClimbs(ids: string[]) {
    // check ids, process summits, and return new array of active climb ids
    //'SELECT * FROM climbs as c JOIN mountains as m ON c.mountain_id = m.id WHERE c.elevation >= m.height'
  }

  TaskManager.defineTask(DATA_TASK_ID, async () => {
    console.log("Executing task");
    try {
      if (Platform.OS !== 'android') {
        return BackgroundTask.BackgroundTaskResult.Success;
      }

      const healthConnect = await import('react-native-health-connect');

      // get current time
      let date = new Date();

      let db = await getConnection();
      // these rows need to be deleted upon being read
      type TimeRow = {
        time: number;
        climb_id: string;
        is_start: number; // SQLite stores booleans as 0/1
      };

      let rows = await db.getAllAsync<TimeRow>('SELECT * from times');
      
      let ranges = new Array();
      // active climbs will be tracked in memory, with time ranges created for each unique set of active climbs
      let activeClimbs = new Array();
      let lastDate = new Date();

      // process historic climb data ==========================================
      rows.forEach((row: TimeRow) => {
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

        if (row.is_start === 1) {
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
      let recordPromises = ranges.map((range) =>
        healthConnect.readRecords('ElevationGained', {
          timeRangeFilter: {
            operator: 'between',
            startTime: range.startTime,
            endTime: range.endTime
          }
        }).then((record) => {
          // distribute elevation across active climbs in range
          console.log(record);
          //await assignElevationToClimbs(activeClimbs, record.elevation.inFeet);
        })
      );

      // process currently active climbs ======================================
      // 1 check if any active climbs have completed
      //activeClimbs = summitClimbs(activeClimbs);
      // 2 get elevation data from lastDate to date
      let { records } = await healthConnect.readRecords('ElevationGained', {
        timeRangeFilter: {
          operator: 'between',
          startTime: lastDate.toISOString(),
          endTime: date.toISOString()
        }
      });
      // 3 check if this completes any climbs
      //assignElevationToClimbs();
      //activeClimbs = summitClimbs(activeClimbs);
      // 4 create time table entries for non-completed climbs
      /*
      let statement = await db.prepareAsync();
      let dbPromises = activeClimbs.map((id) => 
        
      );
      */
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

      if (Platform.OS === 'android') {
        const healthConnect = await import('react-native-health-connect');
        await healthConnect.initialize();
        await registerBackgroundTaskAsync();
      }

      await getPermissions();
      await updateAsync();
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
  if (!connectionPromise) {
    connectionPromise = SQLite.openDatabaseAsync("app");
  }
  return connectionPromise;
}

export default RootLayout;

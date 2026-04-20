import { AuthProvider } from '@/context/auth';
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
  async function getPermissions() {
    let granted = await requestPermission([
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
  const launch = useRef(false);
  const database = useRef(null);

  // helper methods
  async function assignElevationToClimbs(ids: string[], feet: number) {
    let distributed = feet / ids.length;

    console.log("assign " + feet.toString() + " ft to these ids:");
    console.log(ids);

    let db = await getConnection();
    let statement = await db.prepareAsync('UPDATE climbs SET elevation = elevation + $feet WHERE id = $id');

    for (const id of ids) {
      await statement.executeAsync({$feet: distributed, $id: id});
    }

    await statement.finalizeAsync();

    await db.closeAsync();
  }

  async function summitClimbs(ids: string[]) {
    // check ids, process summits, and return new array of active climb ids
    let db = await getConnection();

    let rows = await db.getAllAsync(`
      DELETE FROM climbs WHERE id IN (
        SELECT c.id FROM climbs AS c JOIN mountains AS m ON c.mountain_id = m.id
        WHERE m.height <= c.elevation
      ) RETURNING mountain_id
    `);

    let statement = await db.prepareAsync("UPDATE mountains SET summited = true WHERE id = $id");

    for (const row of rows) {
      await statement.executeAsync({$id: row.id});
    }
    
    await statement.finalizeAsync();

    rows = await db.getAllAsync('SELECT id FROM climbs WHERE is_active = true');
    console.log(rows);

    let newIds = new Array();

    rows.forEach((row) => {
      newIds.push(row.id);
    });

    await db.closeAsync();

    return newIds;
  }

  async function dataCollect() {
      let db = await getConnection();

      console.log("got connection");

      // get current time
      let date = new Date();

      // these rows need to be deleted upon being read
      let rows = await db.getAllAsync('DELETE FROM times RETURNING *');

      console.log("got times data");

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

        lastDate = new Date(curDate);

        if (row.is_start) {
          // add new climb to active climbs
          activeClimbs.push(row.climb_id);
        } else {
          // remove climb from active climbs
          let index = activeClimbs.indexOf(row.climb_id);
          let temp = activeClimbs.slice(0, index);
          if (index < activeClimbs.length - 1) {
            temp = temp.concat(activeClimbs.slice(index + 1, activeClimbs.length));
          }
          activeClimbs = temp;
        }
      });

      // if we have active climbs, create a range
      if (activeClimbs.length > 0) {
        ranges.push({
          climbs: activeClimbs,
          startTime: lastDate.toISOString(),
          endTime: date.toISOString()
        });
      }
      //console.log(ranges);

      // get health data from ranges
      let recordPromises = ranges.map((range) =>
        readRecords('ElevationGained', {
          timeRangeFilter: {
            operator: 'between',
            startTime: range.startTime,
            endTime: range.endTime
          }
        }).then(async (record) => {
          // distribute elevation across active climbs in range
          if (record) {
            for (const rec of record.records) {
              await assignElevationToClimbs(activeClimbs, rec.elevation.inFeet);
            }
          }
        })
      );

      console.log("elevation was assigned");

      // process currently active climbs ======================================
      // check if any active climbs have completed
      activeClimbs = await summitClimbs(activeClimbs);
      console.log(activeClimbs);

      console.log("climbs were checked");

      if (activeClimbs.length > 0 && lastDate < date) {
        // get elevation data from lastDate to date
        let { records } = await readRecords('ElevationGained', {
          timeRangeFilter: {
            operator: 'between',
            startTime: lastDate.toISOString(),
            endTime: date.toISOString()
          }
        });

        console.log("got most recent data");

        // check if this completes any climbs
        for (const record of records) {
          //console.log(record);
          if (!record) {
            return;
          }
          await assignElevationToClimbs(activeClimbs, record.elevation.inFeet);
        }
      }

      console.log("recent elevation was assigned");

      activeClimbs = await summitClimbs(activeClimbs);

      console.log("currently active climbs checked");

      // create time table entries for non-completed climbs
      let statement = await db.prepareAsync('INSERT INTO times VALUES ($time, $id, $start)');

      for (const id of activeClimbs) {
        await statement.executeAsync({$time: date.getTime(), $id: id, $start: true});
      }

      await statement.finalizeAsync();
      console.log("times table updated");

      await db.closeAsync();
  }

  TaskManager.defineTask(DATA_TASK_ID, async () => {
    console.log("Executing task");
    
    try {
      await dataCollect();
    } catch (error) {
      console.error("Error executing task", error);
      return BackgroundTask.BackgroundTaskResult.Failed;
    }

    console.log("Task done!");
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
      CREATE TABLE IF NOT EXISTS times (time INTEGER, climb_id TEXT, is_start BOOLEAN);
      CREATE TABLE IF NOT EXISTS climbs (id TEXT, mountain_id TEXT, elevation INTEGER, is_active BOOLEAN);
      CREATE TABLE IF NOT EXISTS mountains (id TEXT, name TEXT, location TEXT, height INTEGER, summited BOOLEAN);
      CREATE TABLE IF NOT EXISTS notifications (id INTEGER, message TEXT, date INTEGER);
      DROP TABLE IF EXISTS sync;
    `);
    await db.closeAsync();
  }

  const appState = useRef(AppState.currentState);

  useEffect(() => {
    const initTask = async () => {
      // initialize db, permissions, and background task
      await initialize();
      await initializeDatabase();
      await getPermissions();
      await registerBackgroundTaskAsync();
      await updateAsync();
    };
    initTask();
    // create listener for change in appState, capture new state in nextAppState
    const subscription = AppState.addEventListener('change', nextAppState => {
      console.log(appState.current);
      console.log(nextAppState);
      if (appState.current.match(/inactive|background/) &&
      nextAppState === 'active') {
        // app went from background to foreground
        console.log("Welcome back!");
        launch.current = true;
        dataCollect();
      } else if (launch.current && appState.current === 'active' &&
      nextAppState.match(/inactive|background/)){
        //console.log("Bye!");
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
          <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
        </Stack>
        <StatusBar style="auto" />
      </ThemeProvider>
    </AuthProvider>
  );
}

export async function getConnection() {
  const db = await SQLite.openDatabaseAsync('app');
  return db;
}

export default RootLayout;

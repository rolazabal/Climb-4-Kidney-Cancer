import { useColorScheme } from '@/hooks/use-color-scheme';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import * as BackgroundTask from 'expo-background-task';
import { Stack } from 'expo-router';
import * as SQLite from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import * as TaskManager from 'expo-task-manager';
import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import 'react-native-reanimated';

export const unstable_settings = {
  anchor: '(tabs)',
};

function RootLayout() {
  const colorScheme = useColorScheme();

  // define background task
  const DATA_TASK_ID = 'data_task';
  const [taskRegistered, setTaskRegistered] = useState<boolean>(false);
  const [taskStatus, setTaskStatus] = useState<BackgroundTask.BackgroundTaskStatus | null>(null);

  const [test, setTest] = useState<number>(0);

  TaskManager.defineTask(DATA_TASK_ID, async () => {
    console.log("Executing task");
    setTest(test + 1);
    try {
      let db = await getConnection();
      let date = new Date();
      let statement = await db.prepareAsync('INSERT INTO times VALUES ($time, $climb, $start)');
      try {
        await statement.executeAsync({$time: date.getTime(), $climb: 0, $start: false});
      } finally {
        await statement.finalizeAsync();
      }
      let row = await db.getFirstAsync('SELECT * from times');
      console.log(row);
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
  async function getConnection() {
      let db = await SQLite.openDatabaseAsync("app", {useNewConnection: true});
      return db;
  }

  async function initializeDatabase() {
    let db = await getConnection();
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS times (time INTEGER, climb_id INTEGER, is_start BOOLEAN);
      CREATE TABLE IF NOT EXISTS climbs (id INTEGER, mountain_id INTEGER, elevation INTEGER, is_active BOOLEAN);
      CREATE TABLE IF NOT EXISTS mountains (id INTEGER, summited BOOLEAN);
    `);
    let date = new Date();
    let statement = await db.prepareAsync('INSERT INTO times VALUES ($time, $climb, $start)');
    try {
      await statement.executeAsync({$time: date.getTime(), $climb: 0, $start: true});
    } finally {
      await statement.finalizeAsync();
    }
  }

  const appState = useRef(AppState.currentState);

  useEffect(() => {
    const initTask = async () => {
      await registerBackgroundTaskAsync();
      await updateAsync();
    };
    console.log("Root Loaded!");
    initializeDatabase();
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

export default RootLayout;
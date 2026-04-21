import * as SQLite from "expo-sqlite";

const dbPromise = SQLite.openDatabaseAsync("app", { useNewConnection: false });

export function getConnection() {
  return dbPromise;
}

import { Platform } from "react-native";

import { getConnection } from "./database";
import { readElevationRecords } from "./health";

type TimeRow = {
  time: number;
  climb_id: string;
  is_start: number;
};

type SyncStateRow = {
  last_synced_at: number | null;
};

type SyncInterval = {
  startTime: string;
  endTime: string;
  climbIds: string[];
};

type SyncSummary = {
  lastSyncedAt: string;
  syncedFeet: number;
  intervalsProcessed: number;
};

const HEALTH_SYNC_ROW_ID = 1;

export async function ensureHealthSyncState() {
  const db = await getConnection();

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS health_sync_state (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      last_synced_at INTEGER
    );
  `);

  await db.runAsync(
    "INSERT OR IGNORE INTO health_sync_state (id, last_synced_at) VALUES (?, ?)",
    [HEALTH_SYNC_ROW_ID, null]
  );
}

export async function getLastHealthSyncAt() {
  const db = await getConnection();
  const row = await db.getFirstAsync<SyncStateRow>(
    "SELECT last_synced_at FROM health_sync_state WHERE id = ?",
    [HEALTH_SYNC_ROW_ID]
  );

  return typeof row?.last_synced_at === "number" ? row.last_synced_at : null;
}

export async function syncHealthClimbs(now = new Date()): Promise<SyncSummary | null> {
  if (Platform.OS !== "ios" && Platform.OS !== "android") {
    return null;
  }

  await ensureHealthSyncState();

  const db = await getConnection();
  const nowMs = now.getTime();
  const lastSyncedAt = await getLastHealthSyncAt();
  const syncStartMs = await resolveSyncStartMs(lastSyncedAt, nowMs);

  const rows = await db.getAllAsync<TimeRow>(
    "SELECT time, climb_id, is_start FROM times WHERE time <= ? ORDER BY time ASC",
    [nowMs]
  );

  const intervals = buildSyncIntervals(rows, syncStartMs, nowMs);
  let syncedFeet = 0;

  for (const interval of intervals) {
    const { records } = await readElevationRecords(interval.startTime, interval.endTime);
    const intervalFeet = Math.round(
      records.reduce((total, record) => total + Number(record.elevation.inFeet ?? 0), 0)
    );

    if (intervalFeet <= 0 || interval.climbIds.length === 0) {
      continue;
    }

    const distribution = splitFeetAcrossClimbs(intervalFeet, interval.climbIds.length);

    for (let index = 0; index < interval.climbIds.length; index += 1) {
      const climbId = interval.climbIds[index];
      const feet = distribution[index];

      if (feet <= 0) {
        continue;
      }

      await db.runAsync(
        "UPDATE climbs SET elevation = elevation + ? WHERE mountain_id = ?",
        [feet, climbId]
      );
    }

    syncedFeet += intervalFeet;
  }

  await db.runAsync(
    "UPDATE health_sync_state SET last_synced_at = ? WHERE id = ?",
    [nowMs, HEALTH_SYNC_ROW_ID]
  );

  return {
    lastSyncedAt: new Date(nowMs).toISOString(),
    syncedFeet,
    intervalsProcessed: intervals.length,
  };
}

async function resolveSyncStartMs(lastSyncedAt: number | null, nowMs: number) {
  if (typeof lastSyncedAt === "number") {
    return lastSyncedAt;
  }

  const db = await getConnection();
  const firstEvent = await db.getFirstAsync<{ time: number }>(
    "SELECT time FROM times ORDER BY time ASC LIMIT 1"
  );

  return typeof firstEvent?.time === "number" ? firstEvent.time : nowMs;
}

function buildSyncIntervals(rows: TimeRow[], syncStartMs: number, nowMs: number) {
  const activeClimbs = new Set<string>();
  const intervals: SyncInterval[] = [];
  let cursor = syncStartMs;

  for (const row of rows) {
    const eventTime = Number(row.time);

    if (eventTime <= syncStartMs) {
      applyClimbEvent(activeClimbs, row);
      continue;
    }

    if (activeClimbs.size > 0 && eventTime > cursor) {
      intervals.push({
        startTime: new Date(cursor).toISOString(),
        endTime: new Date(eventTime).toISOString(),
        climbIds: Array.from(activeClimbs),
      });
    }

    applyClimbEvent(activeClimbs, row);
    cursor = eventTime;
  }

  if (activeClimbs.size > 0 && nowMs > cursor) {
    intervals.push({
      startTime: new Date(cursor).toISOString(),
      endTime: new Date(nowMs).toISOString(),
      climbIds: Array.from(activeClimbs),
    });
  }

  return intervals;
}

function applyClimbEvent(activeClimbs: Set<string>, row: TimeRow) {
  if (Boolean(row.is_start)) {
    activeClimbs.add(row.climb_id);
    return;
  }

  activeClimbs.delete(row.climb_id);
}

function splitFeetAcrossClimbs(totalFeet: number, climbCount: number) {
  const baseShare = Math.floor(totalFeet / climbCount);
  const remainder = totalFeet % climbCount;

  return Array.from({ length: climbCount }, (_, index) =>
    baseShare + (index < remainder ? 1 : 0)
  );
}

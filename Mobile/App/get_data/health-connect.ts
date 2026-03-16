import { Platform } from 'react-native';

type HealthConnectModule = {
  initialize?: () => Promise<void> | void;
  requestPermission?: (permissions: Array<{ accessType: 'read' | 'write'; recordType: string }>) => Promise<unknown>;
  readRecords?: (recordType: string, options: { timeRangeFilter: { operator: 'between'; startTime: string; endTime: string } }) => Promise<{ records?: Array<Record<string, unknown>> }>;
};

type AppleHealthKitModule = {
  initHealthKit?: (
    permissions: { permissions: { read: string[]; write: string[] } },
    callback: (error: string | null) => void
  ) => void;
  getStepCount?: (
    options: { startDate: string; endDate: string },
    callback: (error: string | null, result: { value?: number } | null) => void
  ) => void;
  getDistanceWalkingRunning?: (
    options: { startDate: string; endDate: string },
    callback: (error: string | null, result: { value?: number } | null) => void
  ) => void;
  Constants?: {
    Permissions?: {
      StepCount?: string;
      DistanceWalkingRunning?: string;
    };
  };
};

export type DailyHealthSnapshot = {
  steps: number;
  distanceMeters: number;
};

function getHealthConnectModule(): HealthConnectModule | null {
  if (Platform.OS !== 'android') {
    return null;
  }

  try {
    // Load lazily so the app can still run before native dependency installation.
    return require('react-native-health-connect') as HealthConnectModule;
  } catch {
    return null;
  }
}

function getAppleHealthKitModule(): AppleHealthKitModule | null {
  if (Platform.OS !== 'ios') {
    return null;
  }

  try {
    return require('react-native-health') as AppleHealthKitModule;
  } catch {
    return null;
  }
}

function getTodayRangeIso() {
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);

  return {
    startTime: start.toISOString(),
    endTime: now.toISOString(),
  };
}

function getTodayRangeForAppleHealth() {
  const { startTime, endTime } = getTodayRangeIso();
  return {
    startDate: startTime,
    endDate: endTime,
  };
}

async function requestAppleHealthAccess() {
  const appleHealth = getAppleHealthKitModule();
  if (!appleHealth) {
    return { ok: false as const, reason: 'Apple Health is unavailable.' };
  }

  if (!appleHealth.initHealthKit) {
    return { ok: false as const, reason: 'Apple Health module is not fully available.' };
  }

  const constants = appleHealth.Constants?.Permissions;
  const stepPermission = constants?.StepCount ?? 'StepCount';
  const distancePermission = constants?.DistanceWalkingRunning ?? 'DistanceWalkingRunning';

  return await new Promise<{ ok: true } | { ok: false; reason: string }>((resolve) => {
    appleHealth.initHealthKit?.(
      {
        permissions: {
          read: [stepPermission, distancePermission],
          write: [],
        },
      },
      (error) => {
        if (error) {
          resolve({ ok: false, reason: error });
          return;
        }

        resolve({ ok: true });
      }
    );
  });
}

async function readTodayAppleHealthData(): Promise<{ ok: true; data: DailyHealthSnapshot } | { ok: false; reason: string }> {
  const appleHealth = getAppleHealthKitModule();
  if (!appleHealth) {
    return { ok: false, reason: 'Apple Health is unavailable.' };
  }

  if (!appleHealth.getStepCount || !appleHealth.getDistanceWalkingRunning) {
    return { ok: false, reason: 'Apple Health read APIs are unavailable.' };
  }

  const options = getTodayRangeForAppleHealth();

  try {
    const [steps, distanceKm] = await Promise.all([
      new Promise<number>((resolve, reject) => {
        appleHealth.getStepCount?.(options, (error, result) => {
          if (error) {
            reject(new Error(error));
            return;
          }
          resolve(typeof result?.value === 'number' ? result.value : 0);
        });
      }),
      new Promise<number>((resolve, reject) => {
        appleHealth.getDistanceWalkingRunning?.(options, (error, result) => {
          if (error) {
            reject(new Error(error));
            return;
          }
          resolve(typeof result?.value === 'number' ? result.value : 0);
        });
      }),
    ]);

    return {
      ok: true,
      data: {
        steps,
        distanceMeters: distanceKm * 1000,
      },
    };
  } catch (error) {
    return {
      ok: false,
      reason: error instanceof Error ? error.message : 'Failed to read Apple Health data.',
    };
  }
}

export async function requestHealthAccess() {
  if (Platform.OS === 'ios') {
    return requestAppleHealthAccess();
  }

  const healthConnect = getHealthConnectModule();
  if (!healthConnect) {
    return { ok: false as const, reason: 'Health platform module is unavailable.' };
  }

  if (!healthConnect.initialize || !healthConnect.requestPermission) {
    return { ok: false as const, reason: 'Health Connect module is not fully available.' };
  }

  try {
    await healthConnect.initialize();
    await healthConnect.requestPermission([
      { accessType: 'read', recordType: 'Steps' },
      { accessType: 'read', recordType: 'Distance' },
    ]);

    return { ok: true as const };
  } catch (error) {
    return {
      ok: false as const,
      reason: error instanceof Error ? error.message : 'Health Connect permission request failed.',
    };
  }
}

export async function readTodayHealthData(): Promise<{ ok: true; data: DailyHealthSnapshot } | { ok: false; reason: string }> {
  if (Platform.OS === 'ios') {
    return readTodayAppleHealthData();
  }

  const healthConnect = getHealthConnectModule();
  if (!healthConnect) {
    return { ok: false, reason: 'Health platform module is unavailable.' };
  }

  if (!healthConnect.readRecords) {
    return { ok: false, reason: 'Health Connect read API is unavailable.' };
  }

  const timeRangeFilter = {
    operator: 'between' as const,
    ...getTodayRangeIso(),
  };

  try {
    const [stepsResult, distanceResult] = await Promise.all([
      healthConnect.readRecords('Steps', { timeRangeFilter }),
      healthConnect.readRecords('Distance', { timeRangeFilter }),
    ]);

    const steps = (stepsResult.records ?? []).reduce((total, record) => {
      const count = typeof record.count === 'number' ? record.count : 0;
      return total + count;
    }, 0);

    const distanceMeters = (distanceResult.records ?? []).reduce((total, record) => {
      const distanceValue = (record as { distance?: unknown }).distance;
      const distanceObject = distanceValue as { inMeters?: unknown; meters?: unknown } | undefined;

      const meters =
        typeof distanceObject?.inMeters === 'number'
          ? distanceObject.inMeters
          : typeof distanceObject?.meters === 'number'
            ? distanceObject.meters
            : typeof distanceValue === 'number'
              ? distanceValue
              : 0;

      return total + meters;
    }, 0);

    return {
      ok: true,
      data: {
        steps,
        distanceMeters,
      },
    };
  } catch (error) {
    return {
      ok: false,
      reason: error instanceof Error ? error.message : 'Failed to read health data.',
    };
  }
}

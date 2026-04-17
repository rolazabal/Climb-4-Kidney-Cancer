import { Platform } from "react-native";

const FEET_PER_FLIGHT = 10;

export type HealthProvider = "health-connect" | "healthkit" | "unsupported";

export type HealthDataResult = {
  elevationFt: number;
  permissionGranted: boolean;
  provider: HealthProvider;
  supported: boolean;
  message?: string;
};

function getTodayRange() {
  const endDate = new Date();
  const startDate = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());

  return {
    startDate,
    endDate,
  };
}

async function readAndroidElevation(): Promise<HealthDataResult> {
  try {
    const healthConnect = await import("react-native-health-connect");

    await healthConnect.initialize();
    await healthConnect.requestPermission([
      {
        accessType: "read",
        recordType: "ElevationGained",
      },
      {
        accessType: "write",
        recordType: "ElevationGained",
      },
    ]);

    const { startDate, endDate } = getTodayRange();
    const { records } = await healthConnect.readRecords("ElevationGained", {
      timeRangeFilter: {
        operator: "between",
        startTime: startDate.toISOString(),
        endTime: endDate.toISOString(),
      },
    });

    const elevationFt = records.reduce((total, record) => total + record.elevation.inFeet, 0);

    return {
      elevationFt,
      permissionGranted: true,
      provider: "health-connect",
      supported: true,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Health Connect is unavailable.";
    return {
      elevationFt: 0,
      permissionGranted: false,
      provider: "health-connect",
      supported: true,
      message,
    };
  }
}

async function recordAndroidElevation(feet: number) {
  const healthConnect = await import("react-native-health-connect");
  const now = new Date();

  return healthConnect.insertRecords([
    {
      recordType: "ElevationGained",
      elevation: { unit: "feet", value: feet },
      startTime: now.toISOString(),
      endTime: now.toISOString(),
      metadata: {
        recordingMethod: healthConnect.RecordingMethod.RECORDING_METHOD_MANUAL_ENTRY,
        device: {
          manufacturer: "Apple",
          model: Platform.OS === "android" ? "Android" : "iPhone",
          type: healthConnect.DeviceType.TYPE_PHONE,
        },
      },
    },
  ]);
}

function getAppleHealthKit() {
  const module = require("react-native-health");
  return module.default?.initHealthKit ? module.default : module;
}

async function readIosElevation(): Promise<HealthDataResult> {
  try {
    const AppleHealthKit = getAppleHealthKit();
    const permissions = {
      permissions: {
        read: [AppleHealthKit.Constants.Permissions.FlightsClimbed],
        write: [],
      },
    };

    await new Promise<void>((resolve, reject) => {
      AppleHealthKit.initHealthKit(permissions, (error: unknown) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });

    const { startDate, endDate } = getTodayRange();
    const results = await new Promise<{ value?: number }>((resolve, reject) => {
      AppleHealthKit.getFlightsClimbed(
        {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        },
        (error: unknown, value: { value?: number }) => {
          if (error) {
            reject(error);
            return;
          }
          resolve(value ?? {});
        }
      );
    });

    return {
      elevationFt: (results.value ?? 0) * FEET_PER_FLIGHT,
      permissionGranted: true,
      provider: "healthkit",
      supported: true,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Apple Health is unavailable.";
    return {
      elevationFt: 0,
      permissionGranted: false,
      provider: "healthkit",
      supported: true,
      message,
    };
  }
}

export async function getHealthData(): Promise<HealthDataResult> {
  if (Platform.OS === "android") {
    return readAndroidElevation();
  }

  if (Platform.OS === "ios") {
    return readIosElevation();
  }

  return {
    elevationFt: 0,
    permissionGranted: false,
    provider: "unsupported",
    supported: false,
    message: "Health data is only supported on Android and iOS.",
  };
}

export async function addSampleElevation(feet: number): Promise<HealthDataResult> {
  if (Platform.OS !== "android") {
    return getHealthData();
  }

  try {
    await recordAndroidElevation(feet);
    return getHealthData();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to write Health Connect data.";
    return {
      elevationFt: 0,
      permissionGranted: false,
      provider: "health-connect",
      supported: true,
      message,
    };
  }
}

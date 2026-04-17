import { Platform } from "react-native";
import { getFlightsClimbed, initHealthKit } from "./healthkitService";

type ElevationRecord = {
  startTime: string;
  endTime: string;
  elevation: {
    inFeet: number;
  };
};

type ElevationReadResult = {
  records: ElevationRecord[];
};

type ElevationWriteInput = {
  startTime: string;
  endTime: string;
  feet: number;
};

const FEET_PER_FLIGHT = 10;

export function isHealthTrackingAvailable() {
  return Platform.OS === "android" || Platform.OS === "ios";
}

export async function initializeHealthTracking() {
  if (Platform.OS === "android") {
    const healthConnect = require("react-native-health-connect");
    await healthConnect.initialize();
    return;
  }

  if (Platform.OS === "ios") {
    await initHealthKit();
  }
}

export async function requestHealthTrackingPermissions() {
  if (Platform.OS === "android") {
    const healthConnect = require("react-native-health-connect");
    await healthConnect.requestPermission([
      {
        accessType: "read",
        recordType: "BackgroundAccessPermission",
      },
      {
        accessType: "read",
        recordType: "ElevationGained",
      },
      {
        accessType: "write",
        recordType: "ElevationGained",
      },
    ]);
  }
}

export async function readElevationRecords(
  startTime: string,
  endTime: string
): Promise<ElevationReadResult> {
  if (Platform.OS === "android") {
    const healthConnect = require("react-native-health-connect");
    return healthConnect.readRecords("ElevationGained", {
      timeRangeFilter: {
        operator: "between",
        startTime,
        endTime,
      },
    });
  }

  if (Platform.OS === "ios") {
    const flights = (await getFlightsClimbed(startTime, endTime)) as Array<{
      startDate?: string;
      endDate?: string;
      value?: number;
    }>;

    return {
      records: flights.map((flight) => ({
        startTime: flight.startDate ?? startTime,
        endTime: flight.endDate ?? endTime,
        elevation: {
          inFeet: Number(flight.value ?? 0) * FEET_PER_FLIGHT,
        },
      })),
    };
  }

  return { records: [] };
}

export async function insertElevationRecord({ startTime, endTime, feet }: ElevationWriteInput) {
  if (Platform.OS !== "android") {
    return [];
  }

  const healthConnect = require("react-native-health-connect");
  const { DeviceType, RecordingMethod } = healthConnect;

  return healthConnect.insertRecords([
    {
      recordType: "ElevationGained",
      elevation: { unit: "feet", value: feet },
      startTime,
      endTime,
      metadata: {
        recordingMethod: RecordingMethod.RECORDING_METHOD_AUTOMATICALLY_RECORDED,
        device: {
          manufacturer: "Google",
          model: "Pixel 9",
          type: DeviceType.TYPE_PHONE,
        },
      },
    },
  ]);
}

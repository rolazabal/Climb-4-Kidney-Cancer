import { Platform } from "react-native";

type HealthSample = {
  value?: number;
  startDate?: string;
  endDate?: string;
};

function getAppleHealthKit() {
  if (Platform.OS !== "ios") {
    throw new Error("Apple HealthKit is only available on iOS.");
  }

  const healthKitModule = require("react-native-health");

  return healthKitModule.default?.initHealthKit ? healthKitModule.default : healthKitModule;
}

export async function initHealthKit() {
  const AppleHealthKit = getAppleHealthKit();
  const permissions = {
    permissions: {
      read: [AppleHealthKit.Constants.Permissions.FlightsClimbed],
      write: [],
    },
  };

  return new Promise<boolean>((resolve, reject) => {
    AppleHealthKit.initHealthKit(permissions, (error: string) => {
      if (error) {
        reject(new Error(error));
        return;
      }

      resolve(true);
    });
  });
}

export async function getDailyFlightsClimbedSamples(startDate: string, endDate: string) {
  const AppleHealthKit = getAppleHealthKit();

  return new Promise<HealthSample[]>((resolve, reject) => {
    AppleHealthKit.getDailyFlightsClimbedSamples(
      {
        startDate,
        endDate,
        ascending: true,
      },
      (error: string, results: HealthSample[]) => {
        if (error) {
          reject(new Error(error));
          return;
        }

        resolve(results ?? []);
      }
    );
  });
}

//import AppleHealthKit from 'react-native-health';
const HealthKitModule = require('react-native-health');
const AppleHealthKit = 
    HealthKitModule.default?.initHealthKit
    ? HealthKitModule.default
    : HealthKitModule;

console.log("HealthKit object:", AppleHealthKit);

const permissions = {
  permissions: {
    read: [
      AppleHealthKit.Constants.Permissions.FlightsClimbed,
    ],
    write: [],
  },
};

export const initHealthKit = () => {
  return new Promise((resolve, reject) => {
    AppleHealthKit.initHealthKit(permissions, (err: any) => {
      if (err) reject(err);
      else resolve(true);
    });
  });
};

export const getFlightsClimbed = (startDate: string, endDate: string) => {
  return new Promise((resolve, reject) => {
    AppleHealthKit.getFlightsClimbed(
      { startDate, endDate },
      (err: any, results: any) => {
        if (err) reject(err);
        else resolve(results);
      }
    );
  });
};
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {

  return (
    <>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ title: "Log In" }} />
        <Stack.Screen name="create-account" options={{ title: "Create Account" }} />
      </Stack>
      <StatusBar style="auto" />
    </>
  );
}

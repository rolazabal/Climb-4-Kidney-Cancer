import { ActivityIndicator, View } from "react-native";
import { Redirect } from "expo-router";
import { useAuth } from "@/context/auth";

export default function RootIndex() {
  const { isLoggedIn, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size = "large" />
      </View>
    );
  }

  return <Redirect href={isLoggedIn ? "/(tabs)/climbs" : "/login"} />;
}
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

  //const isLoggedIn = true; // TEMPORARY - REMOVE THIS TO SEE THE LOGIN SCREEN AND MESS WITH AUTHENTICATION
  return <Redirect href={isLoggedIn ? "/(tabs)/climbs" : "/login"} />;
}
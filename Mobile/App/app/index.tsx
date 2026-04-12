import { Redirect } from "expo-router";
import { useAuth } from "@/context/auth";

export default function RootIndex() {
  //const { isLoggedIn } = useAuth();
  const isLoggedIn = true; // TEMPORARY - REMOVE THIS TO SEE THE LOGIN SCREEN AND MESS WITH AUTHENTICATION
  return <Redirect href={isLoggedIn ? "/(tabs)/climbs" : "/login"} />;
}

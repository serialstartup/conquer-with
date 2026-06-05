import "../global.css";
import { useEffect } from "react";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { AuthContext, useAuthProvider } from "@/hooks/useAuth";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const auth = useAuthProvider();

  useEffect(() => {
    if (!auth.loading) {
      SplashScreen.hideAsync();
    }
  }, [auth.loading]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthContext.Provider value={auth}>
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: "#0f172a" } }} />
      </AuthContext.Provider>
    </GestureHandlerRootView>
  );
}

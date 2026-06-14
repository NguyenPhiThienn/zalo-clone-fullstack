import "react-native-get-random-values";
import "react-native-gesture-handler";
import "react-native-reanimated";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { LogBox } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import "../global.css";
import "@/lib/i18n";
import { AuthProvider } from "@/context/AuthContext";
import { SocketProvider } from "@/context/SocketContext";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import FlashMessage from "react-native-flash-message";

const queryClient = new QueryClient();

SplashScreen.preventAutoHideAsync();

LogBox.ignoreLogs(["new NativeEventEmitter"]);

export default function RootLayout() {
  const [loaded] = useFonts({
    "Jakarta-Bold": require("../src/assets/fonts/PlusJakartaSans-Bold.ttf"),
    "Jakarta-ExtraBold": require("../src/assets/fonts/PlusJakartaSans-ExtraBold.ttf"),
    "Jakarta-ExtraLight": require("../src/assets/fonts/PlusJakartaSans-ExtraLight.ttf"),
    "Jakarta-Light": require("../src/assets/fonts/PlusJakartaSans-Light.ttf"),
    "Jakarta-Medium": require("../src/assets/fonts/PlusJakartaSans-Medium.ttf"),
    Jakarta: require("../src/assets/fonts/PlusJakartaSans-Regular.ttf"),
    "Jakarta-SemiBold": require("../src/assets/fonts/PlusJakartaSans-SemiBold.ttf"),
  });

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <SocketProvider>
            <Stack>
              <Stack.Screen name="index" options={{ headerShown: false }} />
              <Stack.Screen name="(auth)" options={{ headerShown: false }} />
              <Stack.Screen name="(root)" options={{ headerShown: false }} />
              <Stack.Screen name="+not-found" />
            </Stack>
          </SocketProvider>
        </AuthProvider>
      </QueryClientProvider>
      <FlashMessage position="top" />
    </GestureHandlerRootView>
  );
}

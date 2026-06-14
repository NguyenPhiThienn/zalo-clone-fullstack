import { Stack } from "expo-router";

const Layout = () => {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="tabs" />
      <Stack.Screen name="chat/[id]" />
      <Stack.Screen name="user/[id]" />
      <Stack.Screen name="search" />
      <Stack.Screen name="create-group" />
      <Stack.Screen name="friend-requests" />
      <Stack.Screen name="personal-wall" />
      <Stack.Screen name="personal-setting" />
    </Stack>
  );
};

export default Layout;

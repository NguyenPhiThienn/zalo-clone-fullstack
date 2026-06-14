import { Tabs } from "expo-router";
import { View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const Layout = () => {
    const insets = useSafeAreaInsets();

    return (
        <Tabs screenOptions={{
            tabBarActiveTintColor: "#0091FF",
            tabBarInactiveTintColor: "#94a3b8",
            tabBarShowLabel: true,
            tabBarLabelStyle: {
                fontSize: 12,
                fontFamily: "Jakarta-Medium",
                marginBottom: 5,
            },
            tabBarStyle: {
                backgroundColor: "#ffffff",
                height: 60 + insets.bottom,
                borderTopWidth: 1,
                borderTopColor: "#F3F4F6",
                paddingTop: 8,
                paddingBottom: insets.bottom > 0 ? insets.bottom : 8,
            }
        }}>
            <Tabs.Screen
                name="home"
                options={{
                    title: "Tin nhắn",
                    headerShown: false,
                    tabBarIcon: ({ focused, color }) => (
                        <Ionicons name={focused ? "chatbubble-ellipses" : "chatbubble-ellipses-outline"} size={24} color={color} />
                    )
                }}
            />
            <Tabs.Screen
                name="activities"
                options={{
                    title: "Danh bạ",
                    headerShown: false,
                    tabBarIcon: ({ focused, color }) => (
                        <Ionicons name={focused ? "people" : "people-outline"} size={24} color={color} />
                    )
                }}
            />
            <Tabs.Screen
                name="notifications"
                options={{
                    title: "Khám phá",
                    headerShown: false,
                    tabBarIcon: ({ focused, color }) => (
                        <Ionicons name={focused ? "grid" : "grid-outline"} size={24} color={color} />
                    )
                }}
            />
            <Tabs.Screen
                name="profile"
                options={{
                    title: "Cá nhân",
                    headerShown: false,
                    tabBarIcon: ({ focused, color }) => (
                        <Ionicons name={focused ? "person-circle" : "person-circle-outline"} size={24} color={color} />
                    )
                }}
            />
        </Tabs>
    );
};

export default Layout;
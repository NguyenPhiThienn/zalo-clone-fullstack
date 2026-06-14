import { useAuth } from '@/context/AuthContext';
import { useRouter, useRootNavigationState } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { useEffect } from 'react';

const Home = () => {
  const { token, hasHydrated, user } = useAuth();
  const rootNavigationState = useRootNavigationState();
  const router = useRouter();

  useEffect(() => {
    if (!hasHydrated || !rootNavigationState?.key) return;

    // Small timeout ensures navigation is fully mounted
    const timer = setTimeout(() => {
      if (token) {
        router.replace('/(root)/tabs/home');
      } else {
        router.replace('/(auth)/welcome');
      }
    }, 0);

    return () => clearTimeout(timer);
  }, [hasHydrated, rootNavigationState?.key, token, user, router]);

  // Wait for auth to hydrate AND for Expo Router's root navigation container to be ready
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'white' }}>
      <ActivityIndicator size="large" color="#0068FF" />
    </View>
  );
};

export default Home;
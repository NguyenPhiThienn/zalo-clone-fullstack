import { Link, Stack } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Oops!' }} />
      <View style={styles.container}>
        <Text className="mb-4 text-2xl font-bold text-center">This screen does not exist.</Text>
        <Link href="/" style={styles.link}>
          <Text className="text-green-600 underline">Go to home screen!</Text>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  link: {
    marginTop: 15,
    paddingVertical: 15,
  },
});

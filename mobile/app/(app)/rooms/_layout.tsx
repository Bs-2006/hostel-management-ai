import { Stack } from 'expo-router';
import { useTheme } from '../../../src/context/ThemeContext';

export default function RoomsStackLayout() {
  const { colors } = useTheme();
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.bg },
        headerShadowVisible: false,
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: '700' },
        headerBackButtonDisplayMode: 'minimal',
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Rooms' }} />
      <Stack.Screen name="[id]" options={{ title: 'Room Details' }} />
    </Stack>
  );
}
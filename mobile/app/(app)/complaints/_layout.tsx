import { Stack } from 'expo-router';
import { useTheme } from '../../../src/context/ThemeContext';

export default function ComplaintsStackLayout() {
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
      <Stack.Screen name="index" options={{ title: 'Complaints' }} />
      <Stack.Screen name="create" options={{ title: 'New Complaint' }} />
    </Stack>
  );
}
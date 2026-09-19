import { Stack } from 'expo-router';
import { Provider } from 'react-redux';
import { StatusBar } from 'expo-status-bar';
import { store } from '../src/store/store';
import { AuthProvider } from '../src/context/AuthContext';
import { ThemeProvider, useTheme } from '../src/context/ThemeContext';

function ThemedStatusBar() {
  const { isDark } = useTheme();
  return <StatusBar style={isDark ? 'light' : 'dark'} />;
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <Provider store={store}>
        <AuthProvider>
          <ThemedStatusBar />
          <Stack screenOptions={{ headerShown: false }} />
        </AuthProvider>
      </Provider>
    </ThemeProvider>
  );
}
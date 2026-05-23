import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useColorScheme } from 'react-native';

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerLargeTitle: true,
          headerTransparent: true,
          headerBlurEffect: 'systemChromeMaterial',
          headerShadowVisible: false,
        }}>
        <Stack.Screen
          name="index"
          options={{
            title: 'ShelfCheck',
            headerBackVisible: false,
          }}
        />
      </Stack>
    </ThemeProvider>
  );
}

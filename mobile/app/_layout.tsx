import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import 'react-native-reanimated';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, firebaseInitialized, initError } from '../lib/firebase';
import { useMobileCounters } from '../store/mobileCounters';

import { useColorScheme } from '@/components/useColorScheme';

export {
  ErrorBoundary,
} from 'expo-router';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return <RootLayoutNav />;
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const [user, setUser] = useState<User | null>(null);
  const [authInitialized, setAuthInitialized] = useState(false);
  const router = useRouter();
  const segments = useSegments();
  const { subscribeToCounters, cleanup } = useMobileCounters();

  useEffect(() => {
    if (!firebaseInitialized) {
      setAuthInitialized(true);
      return;
    }
    const subscriber = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthInitialized(true);
      if (currentUser) {
        subscribeToCounters(currentUser.uid);
      } else {
        cleanup();
      }
    });
    return subscriber;
  }, []);

  useEffect(() => {
    if (!authInitialized || !firebaseInitialized) return;

    const inTabsGroup = segments[0] === '(tabs)';
    
    if (!user && inTabsGroup) {
      router.replace('/login');
    } else if (user && !inTabsGroup) {
      router.replace('/(tabs)/leaks');
    }
  }, [user, authInitialized, segments]);

  if (!firebaseInitialized) {
    return (
      <View style={{ flex: 1, backgroundColor: '#000000', justifyContent: 'center', alignItems: 'center', padding: 24 }}>
        <Text style={{ color: '#ef4444', fontSize: 20, fontWeight: 'bold', marginBottom: 12, textAlign: 'center' }}>
          Error de Inicialización
        </Text>
        <Text style={{ color: '#a1a1aa', fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: 24 }}>
          {initError || "No se pudo conectar con Firebase. Verifica la configuración."}
        </Text>
        <Text style={{ color: '#52525b', fontSize: 11, textAlign: 'center' }}>
          Este error suele deberse a la falta de variables de entorno (.env) durante el empaquetado de la app.
        </Text>
      </View>
    );
  }

  if (!authInitialized) {
    return null; // Can render a splash screen here
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
      </Stack>
    </ThemeProvider>
  );
}

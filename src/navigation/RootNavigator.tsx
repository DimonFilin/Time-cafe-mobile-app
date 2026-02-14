import { createStackNavigator } from '@react-navigation/stack';
import { useMemo } from 'react';

import { t } from '@/i18n';
import { AppTabs } from '@/navigation/AppTabs';
import type { RootStackParamList } from '@/navigation/types';
import { useAuthStore } from '@/store/authStore';
import { BookingCreateScreen } from '@/screens/BookingCreateScreen';
import { CardsScreen } from '@/screens/CardsScreen';
import { DebugScreen } from '@/screens/DebugScreen';
import { LoginScreen } from '@/screens/LoginScreen';
import { RegisterScreen } from '@/screens/RegisterScreen';
import { SettingsScreen } from '@/screens/SettingsScreen';

const Stack = createStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const screenOptions = useMemo(
    () => ({
      headerBackTitleVisible: false,
      headerTitleAlign: 'center' as const,
    }),
    []
  );

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      {isAuthenticated ? (
        <Stack.Screen name="App" component={AppTabs} options={{ headerShown: false }} />
      ) : (
        <>
          <Stack.Screen name="Login" component={LoginScreen} options={{ title: t('auth.login.title') }} />
          <Stack.Screen name="Register" component={RegisterScreen} options={{ title: t('auth.register.title') }} />
        </>
      )}

      <Stack.Screen
        name="BookingCreate"
        component={BookingCreateScreen}
        options={{ title: t('appointments.createTitle') }}
      />
      <Stack.Screen name="Cards" component={CardsScreen} options={{ title: 'Cards' }} />
      <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: 'Settings' }} />
      <Stack.Screen name="Debug" component={DebugScreen} options={{ title: t('debug.title') }} />
    </Stack.Navigator>
  );
}


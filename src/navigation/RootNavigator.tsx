import { createStackNavigator } from '@react-navigation/stack';
import { useMemo } from 'react';

import { t } from '@/i18n';
import { AppTabs } from '@/navigation/AppTabs';
import { stackHeaderScreenOptions } from '@/navigation/stack-header-options';
import type { RootStackParamList } from '@/navigation/types';
import { useAuthStore } from '@/store/authStore';
import { BookingCreateScreen } from '@/screens/BookingCreateScreen';
import { CardsScreen } from '@/screens/CardsScreen';
import { DebugScreen } from '@/screens/DebugScreen';
import { LoginScreen } from '@/screens/LoginScreen';
import { RegisterScreen } from '@/screens/RegisterScreen';
import { SettingsScreen } from '@/screens/SettingsScreen';
import { WalletScreen } from '@/screens/WalletScreen';
import { ProfileDetailsScreen } from '@/screens/ProfileDetailsScreen';
import { ProfileNotificationsScreen } from '@/screens/ProfileNotificationsScreen';
import { ProfileScudScreen } from '@/screens/ProfileScudScreen';

const Stack = createStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const screenOptions = useMemo(() => stackHeaderScreenOptions, []);

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      {isAuthenticated ? (
        <Stack.Screen name="App" component={AppTabs} options={{ headerShown: false }} />
      ) : (
        <>
          <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
          <Stack.Screen name="Register" component={RegisterScreen} options={{ headerShown: false }} />
        </>
      )}

      <Stack.Screen
        name="BookingCreate"
        component={BookingCreateScreen}
        options={{ title: t('appointments.createTitle') }}
      />
      <Stack.Screen name="Cards" component={CardsScreen} options={{ title: t('cards.title') }} />
      <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: t('profile.settings') }} />
      <Stack.Screen name="Wallet" component={WalletScreen} options={{ title: 'Депозит' }} />
      <Stack.Screen
        name="ProfileNotifications"
        component={ProfileNotificationsScreen}
        options={{ title: 'Уведомления' }}
      />
      <Stack.Screen
        name="ProfileDetails"
        component={ProfileDetailsScreen}
        options={{ title: 'Мои данные' }}
      />
      <Stack.Screen name="ProfileScud" component={ProfileScudScreen} options={{ title: 'Карта СКУД' }} />
      <Stack.Screen name="Debug" component={DebugScreen} options={{ title: t('debug.title') }} />
    </Stack.Navigator>
  );
}


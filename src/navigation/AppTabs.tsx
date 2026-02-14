import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import type { NavigatorScreenParams } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';

import { t } from '@/i18n';
import type { BookingsStackParamList, CafesStackParamList } from '@/navigation/stacks';
import { BookingDetailsScreen } from '@/screens/BookingDetailsScreen';
import { BookingsScreen } from '@/screens/BookingsScreen';
import { CafeDetailsScreen } from '@/screens/CafeDetailsScreen';
import { CafesScreen } from '@/screens/CafesScreen';
import { CafeReviewsScreen } from '@/screens/CafeReviewsScreen';
import { ProfileScreen } from '@/screens/ProfileScreen';
import { ReviewCreateScreen } from '@/screens/ReviewCreateScreen';

export type AppTabsParamList = {
  Cafes: NavigatorScreenParams<CafesStackParamList>;
  Bookings: NavigatorScreenParams<BookingsStackParamList>;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<AppTabsParamList>();
const CafesStack = createStackNavigator<CafesStackParamList>();
const BookingsStack = createStackNavigator<BookingsStackParamList>();

function CafesStackNavigator() {
  return (
    <CafesStack.Navigator screenOptions={{ headerTitleAlign: 'center' }}>
      <CafesStack.Screen name="CafesList" component={CafesScreen} options={{ title: t('cafes.listTitle') }} />
      <CafesStack.Screen
        name="CafeDetails"
        component={CafeDetailsScreen}
        options={({ route }) => ({ title: route.params.title ?? t('cafes.detailsTitle') })}
      />
      <CafesStack.Screen
        name="CafeReviews"
        component={CafeReviewsScreen}
        options={({ route }) => ({ title: route.params.cafeName ?? t('cafes.reviews.title') })}
      />
      <CafesStack.Screen
        name="ReviewCreate"
        component={ReviewCreateScreen}
        options={{ title: t('cafes.reviews.write') }}
      />
    </CafesStack.Navigator>
  );
}

function BookingsStackNavigator() {
  return (
    <BookingsStack.Navigator screenOptions={{ headerTitleAlign: 'center' }}>
      <BookingsStack.Screen
        name="BookingsList"
        component={BookingsScreen}
        options={{ title: t('appointments.listTitle') }}
      />
      <BookingsStack.Screen
        name="BookingDetails"
        component={BookingDetailsScreen}
        options={({ route }) => ({ title: route.params.title ?? t('appointments.detailsTitle') })}
      />
    </BookingsStack.Navigator>
  );
}

export function AppTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, size, color }) => {
          const iconSize = Math.min(size, 20);
          const tint = color ?? (focused ? '#111' : '#777');
          const name =
            route.name === 'Cafes'
              ? focused
                ? 'cafe'
                : 'cafe-outline'
              : route.name === 'Bookings'
                ? focused
                  ? 'calendar'
                  : 'calendar-outline'
                : focused
                  ? 'person'
                  : 'person-outline';

          return <Ionicons name={name as any} size={iconSize} color={tint} />;
        },
        tabBarActiveTintColor: '#111',
        tabBarInactiveTintColor: '#777',
      })}
    >
      <Tab.Screen name="Cafes" component={CafesStackNavigator} options={{ title: t('tabs.cafes') }} />
      <Tab.Screen name="Bookings" component={BookingsStackNavigator} options={{ title: t('tabs.bookings') }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: t('auth.profile.title') }} />
    </Tab.Navigator>
  );
}


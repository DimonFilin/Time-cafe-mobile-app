import type { NavigatorScreenParams } from '@react-navigation/native';

import type { AppTabsParamList } from '@/navigation/AppTabs';

export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  App: NavigatorScreenParams<AppTabsParamList>;
  BookingCreate: { cafeId: string; cafeName?: string };
  Debug: undefined;
};


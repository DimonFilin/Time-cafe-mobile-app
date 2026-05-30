import { Platform } from 'react-native';
import type { StackNavigationOptions } from '@react-navigation/stack';

import { Colors, Typography } from '@/utils/theme';

const TITLE_OFFSET_AFTER_BACK = Platform.OS === 'ios' ? 14 : 18;
const HEADER_RIGHT_PADDING = 16;

export const stackHeaderScreenOptions: StackNavigationOptions = {
  headerBackTitleVisible: false,
  headerTitleAlign: 'left',
  headerTintColor: Colors.textPrimary,
  headerStyle: { backgroundColor: Colors.white },
  headerTitleStyle: {
    fontWeight: '700',
    color: Colors.textPrimary,
    fontSize: Typography.lg,
  },
  headerShadowVisible: false,
  headerBackgroundContainerStyle: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerLeftContainerStyle: {
    paddingLeft: Platform.OS === 'ios' ? 6 : 4,
  },
  headerTitleContainerStyle: {
    paddingLeft: TITLE_OFFSET_AFTER_BACK,
    paddingRight: HEADER_RIGHT_PADDING,
  },
};

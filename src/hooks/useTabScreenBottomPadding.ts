import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';

import { Spacing } from '@/utils/theme';

/** Bottom inset for scroll content above the tab bar (includes system nav on edge-to-edge). */
export function useTabScreenBottomPadding(extra = Spacing.md) {
  return useBottomTabBarHeight() + extra;
}

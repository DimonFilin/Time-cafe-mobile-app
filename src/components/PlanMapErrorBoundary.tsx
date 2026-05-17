import { Component, type ErrorInfo, type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { errorBooking } from '@/utils/booking-debug';
import { Colors, Radius, Spacing, Typography } from '@/utils/theme';

type Props = { children: ReactNode; height?: number };

type State = { failed: boolean };

export class PlanMapErrorBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    errorBooking('PlanMap render crash', error, { componentStack: info.componentStack });
  }

  render() {
    if (this.state.failed) {
      return (
        <View style={[styles.wrap, { height: this.props.height ?? 200 }]}>
          <Text style={styles.text}>Не удалось отобразить план</Text>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.md,
  },
  text: { fontSize: Typography.sm, color: Colors.textMuted, textAlign: 'center' },
});

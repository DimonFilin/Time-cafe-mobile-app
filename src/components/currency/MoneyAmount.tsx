import {
  View,
  Text,
  StyleSheet,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { BelarussianRubelIcon } from './BelarussianRubelIcon';

function formatAmount(value: string | number, fractionDigits: number): string {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value.toFixed(fractionDigits);
  }
  const n = Number.parseFloat(String(value).replace(',', '.'));
  if (Number.isFinite(n)) return n.toFixed(fractionDigits);
  return String(value);
}

export function MoneyAmount({
  value,
  iconSize = 14,
  fractionDigits = 2,
  style,
  textStyle,
  gap = 4,
}: {
  value: string | number;
  iconSize?: number;
  fractionDigits?: number;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  gap?: number;
}) {
  const text = formatAmount(value, fractionDigits);
  const flat = textStyle ? StyleSheet.flatten(textStyle) : undefined;
  const iconColor = typeof flat?.color === 'string' ? flat.color : '#111827';

  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center', gap }, style]}>
      <BelarussianRubelIcon size={iconSize} color={iconColor} />
      <Text style={textStyle} accessibilityLabel={`BYN ${text}`}>
        {text}
      </Text>
    </View>
  );
}

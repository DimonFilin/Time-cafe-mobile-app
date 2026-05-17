import { View, Text, StyleSheet, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import { BelarussianRubelIcon } from './BelarussianRubelIcon';

const ICON_SIZE = 14;

/**
 * Belarusian ruble SVG symbol + unit suffix (same glyph as MoneyAmount).
 */
export function CurrencyUnitLabel({
  unit,
  style,
  textStyle,
}: {
  unit: string;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}) {
  const flat = textStyle ? StyleSheet.flatten(textStyle) : undefined;
  const color = typeof flat?.color === 'string' ? flat.color : undefined;

  return (
    <View style={[styles.row, style]} accessibilityLabel={`белорусский рубль за ${unit}`}>
      <BelarussianRubelIcon size={ICON_SIZE} color={color} />
      <Text style={textStyle}>/{unit}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 2 },
});

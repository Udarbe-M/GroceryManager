import { Text, View } from 'react-native';

type SummaryCardProps = {
  eyebrow: string;
  value: string;
  detail: string;
  accent: string;
  surface: string;
  textColor: string;
  secondaryTextColor: string;
};

export function SummaryCard({
  accent,
  detail,
  eyebrow,
  secondaryTextColor,
  surface,
  textColor,
  value,
}: SummaryCardProps) {
  return (
    <View
      style={{
        flex: 1,
        minWidth: 148,
        gap: 10,
        borderRadius: 24,
        borderCurve: 'continuous',
        padding: 18,
        backgroundColor: surface,
        boxShadow: '0 16px 40px rgba(19, 44, 31, 0.08)',
      }}>
      <View
        style={{
          alignSelf: 'flex-start',
          borderRadius: 999,
          borderCurve: 'continuous',
          backgroundColor: accent,
          paddingHorizontal: 10,
          paddingVertical: 5,
        }}>
        <Text
          selectable
          style={{
            color: '#163322',
            fontSize: 11,
            fontWeight: '700',
            letterSpacing: 0.7,
            textTransform: 'uppercase',
          }}>
          {eyebrow}
        </Text>
      </View>

      <Text
        selectable
        style={{
          color: textColor,
          fontSize: 28,
          fontWeight: '800',
          fontVariant: ['tabular-nums'],
        }}>
        {value}
      </Text>

      <Text
        selectable
        style={{
          color: secondaryTextColor,
          fontSize: 13,
          lineHeight: 18,
        }}>
        {detail}
      </Text>
    </View>
  );
}

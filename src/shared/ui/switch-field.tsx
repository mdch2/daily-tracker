import { Switch, View } from 'react-native';
import { useTheme } from '@/shared/theme/use-theme';
import { Text } from './primitives';

export function SwitchField({
  label,
  value,
  onChange,
  disabled = false,
}: {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  const { colors, tokens } = useTheme();
  return (
    <View
      style={{
        minHeight: tokens.minimumTouchTarget,
        flexDirection: 'row',
        alignItems: 'center',
        gap: tokens.spacing.sm,
      }}
    >
      <Text style={{ flex: 1 }}>{label}</Text>
      <Switch
        accessibilityLabel={label}
        value={value}
        onValueChange={onChange}
        disabled={disabled}
        trackColor={{ false: colors.fieldBorder, true: colors.link }}
        thumbColor={colors.surface}
        ios_backgroundColor={colors.fieldBorder}
      />
    </View>
  );
}

import { Pressable, View } from 'react-native';
import { useTheme } from '@/shared/theme/use-theme';
import { Text } from './primitives';
import { Icon } from './icon';

export function ChoiceGroup<T extends string | number>({
  label,
  options,
  value,
  onChange,
  disabled = false,
}: {
  label: string;
  options: readonly { value: T; label: string; disabled?: boolean }[];
  value: T | null;
  onChange: (value: T) => void;
  disabled?: boolean;
}) {
  const { colors, tokens } = useTheme();
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={label}
      style={{ flexDirection: 'row', flexWrap: 'wrap', gap: tokens.spacing.sm }}
    >
      {options.map((option) => {
        const selected = value === option.value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="radio"
            accessibilityLabel={option.label}
            accessibilityState={{
              checked: selected,
              disabled: disabled || !!option.disabled,
            }}
            disabled={disabled || option.disabled}
            onPress={() => onChange(option.value)}
            style={({ pressed }) => ({
              minHeight: tokens.minimumTouchTarget,
              flexGrow: 1,
              flexBasis: 100,
              padding: tokens.spacing.sm,
              borderWidth: 2,
              borderRadius: tokens.radius.control,
              borderColor: selected ? colors.link : colors.fieldBorder,
              backgroundColor: selected
                ? colors.accentSoft
                : pressed
                  ? colors.elevated
                  : colors.surface,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: tokens.spacing.sm,
              opacity: disabled || option.disabled ? 0.55 : 1,
            })}
          >
            {selected && <Icon name="check" color={colors.link} size={18} />}
            <Text
              weight={selected ? 'bold' : 'regular'}
              style={{ flexShrink: 1, textAlign: 'center' }}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

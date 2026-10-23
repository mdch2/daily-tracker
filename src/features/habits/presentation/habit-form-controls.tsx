import { useState, type PropsWithChildren } from 'react';
import { Pressable, View } from 'react-native';
import { useTheme } from '@/shared/theme/use-theme';
import { Icon, type IconName } from '@/shared/ui/icon';
import { Text } from '@/shared/ui/primitives';

export function HabitFormCard({ children }: PropsWithChildren) {
  const { colors, tokens } = useTheme();
  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderRadius: tokens.radius.card,
        padding: tokens.spacing.md,
        gap: tokens.spacing.md,
      }}
    >
      {children}
    </View>
  );
}

export function HabitFormChoice({
  title,
  label = title,
  icon,
  selected,
  disabled,
  onPress,
}: {
  title: string;
  label?: string;
  icon?: IconName;
  selected: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  const { colors, tokens } = useTheme();
  const [focused, setFocused] = useState(false);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={({ pressed }) => ({
        minHeight: tokens.minimumTouchTarget,
        minWidth: tokens.minimumTouchTarget,
        padding: tokens.spacing.sm,
        borderRadius: tokens.radius.control,
        borderWidth: 2,
        borderColor: focused
          ? colors.link
          : selected
            ? colors.action
            : colors.border,
        backgroundColor: selected
          ? pressed
            ? colors.actionPressed
            : colors.action
          : colors.elevated,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: tokens.spacing.sm,
        opacity: disabled ? 0.55 : pressed ? 0.8 : 1,
      })}
    >
      {icon && (
        <Icon
          name={icon}
          size={18}
          color={selected ? colors.onAction : colors.muted}
        />
      )}
      <Text
        weight="semibold"
        style={{
          fontSize: 14,
          textAlign: 'center',
          flexShrink: 1,
          color: selected ? colors.onAction : colors.text,
        }}
      >
        {title}
      </Text>
    </Pressable>
  );
}

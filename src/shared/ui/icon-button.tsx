import { Pressable } from 'react-native';
import { useTheme } from '@/shared/theme/use-theme';
import { Icon, type IconName } from './icon';

export function IconButton({
  label,
  icon,
  onPress,
  disabled = false,
  active = false,
}: {
  label: string;
  icon: IconName;
  onPress: () => void;
  disabled?: boolean;
  active?: boolean;
}) {
  const { colors, tokens } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        minWidth: tokens.minimumTouchTarget,
        minHeight: tokens.minimumTouchTarget,
        padding: tokens.spacing.sm,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: tokens.radius.control,
        opacity: disabled ? 0.5 : pressed ? 0.75 : 1,
        backgroundColor: active ? colors.action : colors.elevated,
      })}
    >
      <Icon name={icon} color={active ? colors.onAction : colors.text} />
    </Pressable>
  );
}

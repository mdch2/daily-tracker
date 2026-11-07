import type { PropsWithChildren } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '@/shared/theme/use-theme';

export function Card({
  children,
  style,
}: PropsWithChildren<{ style?: StyleProp<ViewStyle> }>) {
  const { colors, tokens } = useTheme();
  return (
    <View
      style={[
        {
          backgroundColor: colors.surface,
          borderRadius: tokens.radius.card,
          padding: tokens.spacing.md,
          gap: tokens.spacing.md,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

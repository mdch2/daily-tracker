import type { PropsWithChildren } from 'react';
import { Link, type Href } from 'expo-router';
import { Pressable } from 'react-native';
import { Text } from './primitives';
import { useTheme } from '@/shared/theme/use-theme';

export function RouteLink({
  href,
  children,
  disabled = false,
  centered = false,
}: PropsWithChildren<{ href: Href; disabled?: boolean; centered?: boolean }>) {
  const { colors, tokens } = useTheme();
  return (
    <Link href={href} asChild>
      <Pressable
        accessibilityRole="link"
        accessibilityState={{ disabled }}
        disabled={disabled}
        style={({ pressed }) => ({
          minHeight: tokens.minimumTouchTarget,
          justifyContent: 'center',
          alignItems: centered ? 'center' : 'flex-start',
          paddingVertical: tokens.spacing.sm,
          opacity: disabled ? 0.5 : pressed ? 0.7 : 1,
        })}
      >
        <Text
          weight="semibold"
          style={{
            color: colors.link,
            textAlign: centered ? 'center' : 'left',
          }}
        >
          {children}
        </Text>
      </Pressable>
    </Link>
  );
}

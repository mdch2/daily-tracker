import type { PropsWithChildren } from 'react';
import { Link, type Href } from 'expo-router';
import { Pressable } from 'react-native';
import { Text } from './primitives';
import { useTheme } from '@/shared/theme/use-theme';

export function RouteLink({
  href,
  children,
}: PropsWithChildren<{ href: Href }>) {
  const { tokens } = useTheme();
  return (
    <Link href={href} asChild>
      <Pressable
        accessibilityRole="link"
        style={{
          minHeight: tokens.minimumTouchTarget,
          justifyContent: 'center',
        }}
      >
        <Text style={{ textDecorationLine: 'underline' }}>{children}</Text>
      </Pressable>
    </Link>
  );
}

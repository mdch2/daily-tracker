import { Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/shared/ui/icon';
import { useTheme } from '@/shared/theme/use-theme';
export default function TabsLayout() {
  const { t } = useTranslation();
  const { colors, tokens } = useTheme();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.link,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
        tabBarItemStyle: { minHeight: tokens.minimumTouchTarget },
        tabBarLabelStyle: {
          fontFamily: tokens.fontFamily.medium,
          fontSize: 11,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('navigation.home'),
          tabBarIcon: ({ color, size }) => (
            <Icon
              name="check-circle"
              color={typeof color === 'string' ? color : undefined}
              size={size}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="habits"
        options={{
          title: t('navigation.habits'),
          tabBarIcon: ({ color, size }) => (
            <Icon
              name="grid"
              color={typeof color === 'string' ? color : undefined}
              size={size}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: t('navigation.more'),
          tabBarIcon: ({ color, size }) => (
            <Icon
              name="more-horizontal"
              color={typeof color === 'string' ? color : undefined}
              size={size}
            />
          ),
        }}
      />
    </Tabs>
  );
}

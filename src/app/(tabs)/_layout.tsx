import { Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/shared/ui/icon';
export default function TabsLayout() {
  const { t } = useTranslation();
  return (
    <Tabs screenOptions={{ headerShown: false }}>
      <Tabs.Screen
        name="index"
        options={{
          title: t('navigation.home'),
          tabBarIcon: ({ color, size }) => (
            <Icon
              name="home"
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
              name="check-square"
              color={typeof color === 'string' ? color : undefined}
              size={size}
            />
          ),
        }}
      />
    </Tabs>
  );
}

import { Pressable, ScrollView, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useLocalizedFormatters } from '@/shared/i18n/use-localized-formatters';
import { useTheme } from '@/shared/theme/use-theme';
import { Card } from '@/shared/ui/card';
import { Text } from '@/shared/ui/primitives';
import { addBusinessDays } from '@/features/habits/domain/habit-rules';

export function DashboardWeek({
  start,
  today,
  selected,
  onSelect,
}: {
  start: string;
  today: string;
  selected: string;
  onSelect: (date: string) => void;
}) {
  const { t } = useTranslation();
  const { colors, tokens } = useTheme();
  const format = useLocalizedFormatters();
  return (
    <Card style={{ padding: 4 }}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ flexGrow: 1 }}
      >
        {Array.from({ length: 7 }, (_, index) => {
          const date = addBusinessDays(start, index);
          const active = selected === date;
          const foreground = active
            ? colors.onAction
            : date > today
              ? colors.muted
              : colors.text;
          return (
            <Pressable
              key={date}
              accessibilityRole="button"
              accessibilityLabel={format.businessDate(date, {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
              })}
              accessibilityState={{ selected: active }}
              onPress={() => onSelect(date)}
              style={({ pressed }) => ({
                flex: 1,
                minWidth: tokens.minimumTouchTarget,
                minHeight: 76,
                paddingHorizontal: 4,
                paddingVertical: 10,
                borderRadius: tokens.radius.control,
                alignItems: 'center',
                justifyContent: 'center',
                gap: 2,
                backgroundColor: active
                  ? colors.action
                  : pressed
                    ? colors.elevated
                    : colors.surface,
              })}
            >
              <Text weight="medium" style={{ fontSize: 11, color: foreground }}>
                {date === today
                  ? t('dashboard.todayShort')
                  : format.businessDate(date, { weekday: 'narrow' })}
              </Text>
              <Text weight="bold" style={{ fontSize: 17, color: foreground }}>
                {format.businessDate(date, { day: 'numeric' })}
              </Text>
              <View
                style={{
                  width: 4,
                  height: 4,
                  borderRadius: tokens.radius.pill,
                  backgroundColor:
                    date === today || active ? foreground : colors.border,
                }}
              />
            </Pressable>
          );
        })}
      </ScrollView>
    </Card>
  );
}

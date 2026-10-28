import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/shared/theme/use-theme';
import { Card } from '@/shared/ui/card';
import { Icon } from '@/shared/ui/icon';
import { Text } from '@/shared/ui/primitives';
import { useLocalizedFormatters } from '@/shared/i18n/use-localized-formatters';

export function DailySummaryCard({
  completed,
  scheduled,
  future,
  isToday,
}: {
  completed: number;
  scheduled: number;
  future: boolean;
  isToday: boolean;
}) {
  const { t } = useTranslation();
  const { colors, tokens } = useTheme();
  const format = useLocalizedFormatters();
  const summary = t('dashboard.completedCount', {
    completed: format.number(completed),
    total: format.number(scheduled),
  });
  return (
    <Card style={{ padding: 20, gap: 16 }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          flexWrap: 'wrap',
        }}
      >
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            backgroundColor: colors.elevated,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name="trending-up" color={colors.text} />
        </View>
        <View style={{ flex: 1, minWidth: 100 }}>
          <Text style={{ fontSize: 11, color: colors.muted }}>
            {t('dashboard.dailyProgress')}
          </Text>
          <Text
            accessibilityRole="header"
            weight="bold"
            style={{ fontSize: 18 }}
          >
            {t(isToday ? 'dashboard.todaySummary' : 'dashboard.daySummary')}
          </Text>
        </View>
        {!future && scheduled > 0 && (
          <Text
            weight="bold"
            style={{ fontSize: 28, fontVariant: ['tabular-nums'] }}
          >
            {t('dashboard.countRatio', {
              completed: format.number(completed),
              total: format.number(scheduled),
            })}
          </Text>
        )}
      </View>
      {!future && scheduled > 0 && (
        <>
          <View
            accessible
            accessibilityRole="progressbar"
            accessibilityLabel={t('dashboard.dailyProgress')}
            accessibilityValue={{
              min: 0,
              max: scheduled,
              now: completed,
              text: summary,
            }}
            style={{
              height: 10,
              borderRadius: tokens.radius.pill,
              backgroundColor: colors.elevated,
              overflow: 'hidden',
            }}
          >
            <View
              style={{
                height: '100%',
                width: `${(completed / scheduled) * 100}%`,
                borderRadius: tokens.radius.pill,
                backgroundColor: colors.action,
              }}
            />
          </View>
          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: 8,
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Text style={{ fontSize: 13 }}>{summary}</Text>
            <View
              style={{
                backgroundColor: colors.accentSoft,
                borderRadius: tokens.radius.pill,
                paddingHorizontal: 10,
                paddingVertical: 4,
              }}
            >
              <Text
                weight="semibold"
                style={{ color: colors.link, fontSize: 12 }}
              >
                {t(
                  completed === scheduled
                    ? 'dashboard.allDone'
                    : 'dashboard.remaining',
                  {
                    count: scheduled - completed,
                    value: format.number(scheduled - completed),
                  },
                )}
              </Text>
            </View>
          </View>
        </>
      )}
      {(future || scheduled === 0) && (
        <Text style={{ color: colors.muted, fontSize: 14 }}>
          {t(future ? 'dashboard.futureDay' : 'dashboard.noScheduled')}
        </Text>
      )}
      <Text style={{ color: colors.muted, fontSize: 12 }}>
        {t('dashboard.summaryScope')}
      </Text>
    </Card>
  );
}

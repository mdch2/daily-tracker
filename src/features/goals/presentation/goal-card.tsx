import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Card } from '@/shared/ui/card';
import { Button, Text } from '@/shared/ui/primitives';
import { Icon } from '@/shared/ui/icon';
import { useTheme } from '@/shared/theme/use-theme';
import { useLocalizedFormatters } from '@/shared/i18n/use-localized-formatters';
import type { GoalRead } from '../domain/goal';

export function GoalProgress({ goal }: { goal: GoalRead }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const format = useLocalizedFormatters();
  const d = goal.definition;
  const p = goal.progress;
  const unit =
    d.linkedMetric === 'completed_days'
      ? t('goals.completedDays')
      : (d.unitLabel ?? '');
  const amount = (value: number) =>
    format.number(value / 1000, { maximumFractionDigits: 3 });
  const summary = p.available
    ? t('goals.progress', {
        value:
          d.mode === 'amount'
            ? amount(p.accumulatedMilliunits ?? 0)
            : format.number(p.completedMilestones ?? 0),
        target:
          d.mode === 'amount'
            ? amount(d.targetMilliunits ?? 0)
            : format.number(p.totalMilestones ?? 0),
        unit: d.mode === 'amount' ? unit : t('goals.milestones'),
      })
    : t('goals.errors.amountLimit');
  return (
    <>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          flexWrap: 'wrap',
        }}
      >
        <Text weight="semibold" style={{ flex: 1 }}>
          {summary}
        </Text>
        {p.available && (
          <Text weight="bold" style={{ color: colors.link }}>
            {format.number(p.percentage / 100, {
              style: 'percent',
              maximumFractionDigits: 0,
            })}
          </Text>
        )}
      </View>
      {p.available && (
        <View
          accessible
          accessibilityRole="progressbar"
          accessibilityLabel={d.name}
          accessibilityValue={{
            min: 0,
            max: 100,
            now: p.percentage,
            text: summary,
          }}
          style={{
            height: 8,
            borderRadius: 8,
            overflow: 'hidden',
            backgroundColor: colors.elevated,
          }}
        >
          <View
            style={{
              width: `${p.percentage}%`,
              height: 8,
              backgroundColor: colors.action,
              borderRadius: 8,
            }}
          />
        </View>
      )}
      {d.mode === 'milestones' &&
        d.progressSource === 'habit' &&
        p.available && (
          <Text style={{ color: colors.muted, fontSize: 13 }}>
            {t('goals.contribution', {
              value: amount(p.accumulatedMilliunits ?? 0),
              unit,
            })}
          </Text>
        )}
    </>
  );
}
export function GoalCard({
  goal,
  onOpen,
}: {
  goal: GoalRead;
  onOpen?: () => void;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const format = useLocalizedFormatters();
  const d = goal.definition;
  const date = (value: string) =>
    format.businessDate(value, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  return (
    <Card>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ flex: 1, gap: 4 }}>
          <Text weight="semibold" style={{ color: colors.link, fontSize: 12 }}>
            {t(`goals.states.${goal.state}`)}
          </Text>
          <Text
            weight="bold"
            accessibilityRole="header"
            style={{ fontSize: 20 }}
          >
            {d.name}
          </Text>
        </View>
        <Icon
          name={goal.state === 'achieved' ? 'check-circle' : 'flag'}
          size={24}
          color={colors.link}
        />
      </View>
      <GoalProgress goal={goal} />
      {goal.source && (
        <View
          style={{
            backgroundColor: colors.elevated,
            borderRadius: 12,
            padding: 12,
            gap: 4,
          }}
        >
          <Text weight="semibold">{goal.source.name}</Text>
          <Text style={{ color: colors.muted, fontSize: 13 }}>
            {t(
              d.linkedMetric === 'completed_days'
                ? 'goals.completedDays'
                : 'goals.accumulated',
            )}
          </Text>
        </View>
      )}
      <Text style={{ color: colors.muted, fontSize: 13 }}>
        {t('goals.starts', { date: date(d.startDate) })}
      </Text>
      <Text style={{ color: colors.muted, fontSize: 13 }}>
        {d.deadline
          ? t('goals.due', { date: date(d.deadline) })
          : t('goals.noDeadline')}
      </Text>
      {onOpen && (
        <Button
          title={t('goals.details', { name: d.name })}
          variant="secondary"
          onPress={onOpen}
        />
      )}
    </Card>
  );
}

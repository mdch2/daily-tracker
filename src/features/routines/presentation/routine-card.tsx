import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Button, Text } from '@/shared/ui/primitives';
import { Card } from '@/shared/ui/card';
import { Icon } from '@/shared/ui/icon';
import { useTheme } from '@/shared/theme/use-theme';
import { useLocalizedFormatters } from '@/shared/i18n/use-localized-formatters';
import type { Routine, RoutineWindow } from '../domain/routine';
import { evaluateRoutine } from '../domain/routine-rules';

export function RoutineCard({
  routine,
  date,
  today,
  window,
  onOpen,
  expanded = false,
}: {
  routine: Routine;
  date: string;
  today: string;
  window: RoutineWindow;
  onOpen: () => void;
  expanded?: boolean;
}) {
  const { t } = useTranslation();
  const { colors, tokens } = useTheme();
  const format = useLocalizedFormatters();
  const result = evaluateRoutine(routine, date, today, window);
  return (
    <Card>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View
          style={{
            padding: 12,
            borderRadius: tokens.radius.control,
            backgroundColor: colors.accentSoft,
          }}
        >
          <Icon name="layers" color={colors.link} />
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={{ fontSize: 12, color: colors.link }}>
            {routine.archivedAt
              ? t('routines.archived')
              : t(`routines.status.${result.status}`)}
          </Text>
          <Text
            accessibilityRole="header"
            weight="bold"
            style={{ fontSize: expanded ? 22 : 18 }}
          >
            {routine.name}
          </Text>
          <Text style={{ fontSize: 13, color: colors.muted }}>
            {t('routines.stepCount', {
              count: result.steps.length,
              value: format.number(result.steps.length),
            })}
          </Text>
        </View>
      </View>
      <RoutineProgress result={result} />
      {expanded &&
        result.steps.map(({ step, eligible, completed, required, habit }) => (
          <View
            key={step.id}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              padding: 12,
              borderRadius: tokens.radius.control,
              backgroundColor: colors.elevated,
            }}
          >
            <Icon
              name={completed && eligible ? 'check-circle' : 'circle'}
              color={completed && eligible ? colors.link : colors.muted}
            />
            <View style={{ flex: 1 }}>
              <Text weight="semibold" style={{ fontSize: 14 }}>
                {step.kind === 'own' ? step.title : habit!.name}
              </Text>
              <Text style={{ fontSize: 12, color: colors.muted }}>
                {!eligible
                  ? t('routines.status.notScheduled')
                  : t(required ? 'routines.required' : 'routines.optional')}
              </Text>
            </View>
          </View>
        ))}
      <Button
        title={t(
          routine.archivedAt || date !== today
            ? 'routines.view'
            : 'routines.openToday',
        )}
        icon="arrow-right"
        variant={expanded ? 'primary' : 'secondary'}
        onPress={onOpen}
      />
    </Card>
  );
}
export function RoutineProgress({
  result,
}: {
  result: ReturnType<typeof evaluateRoutine>;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const format = useLocalizedFormatters();
  return (
    <View style={{ gap: 8 }}>
      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          gap: 8,
        }}
      >
        <Text style={{ fontSize: 13, color: colors.muted }}>
          {t('routines.requiredProgress')}
        </Text>
        <Text weight="bold" style={{ fontSize: 13, color: colors.link }}>
          {result.percent === null
            ? t('routines.status.notEvaluable')
            : t('routines.progress', {
                completed: format.number(result.completed),
                total: format.number(result.total),
                percent: format.number(result.percent),
              })}
        </Text>
      </View>
      {result.percent !== null && (
        <View
          accessible
          accessibilityRole="progressbar"
          accessibilityLabel={t('routines.requiredProgress')}
          accessibilityValue={{
            min: 0,
            max: result.total,
            now: result.completed,
            text: t('routines.progress', {
              completed: format.number(result.completed),
              total: format.number(result.total),
              percent: format.number(result.percent),
            }),
          }}
          style={{
            height: 8,
            borderRadius: 4,
            backgroundColor: colors.elevated,
            overflow: 'hidden',
          }}
        >
          <View
            style={{
              height: 8,
              width: `${result.percent}%`,
              borderRadius: 4,
              backgroundColor: colors.action,
            }}
          />
        </View>
      )}
    </View>
  );
}

import { useTranslation } from 'react-i18next';
import { Button, ErrorMessage, Text } from '@/shared/ui/primitives';
import type { OperationErrorCode } from '@/shared/domain/operation-error';

export function RoutineWriteFeedback({
  error,
  notice,
  pending,
  busy,
  review,
  onRetry,
  onReload,
}: {
  error: OperationErrorCode | null;
  notice: 'saved' | 'savedRefreshFailed' | 'reviewed' | null;
  pending: boolean;
  busy: boolean;
  review: boolean;
  onRetry: () => void;
  onReload: () => void;
}) {
  const { t } = useTranslation();
  return (
    <>
      {error && <ErrorMessage message={t(`routines.errors.${error}`)} />}
      {notice && (
        <Text accessibilityLiveRegion="polite">{t(`habits.${notice}`)}</Text>
      )}
      {pending && error && (
        <>
          <Text>{t('habits.uncertain')}</Text>
          <Button
            title={t('habits.retrySave')}
            loading={busy}
            onPress={onRetry}
          />
        </>
      )}
      {!pending && (review || error) && (
        <Button
          title={t('habits.reload')}
          variant="secondary"
          loading={busy}
          onPress={onReload}
        />
      )}
    </>
  );
}

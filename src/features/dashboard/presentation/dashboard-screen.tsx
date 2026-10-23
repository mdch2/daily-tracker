import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/features/auth/presentation/auth-provider';
import { useProfileRepository } from '@/features/profile/presentation/profile-context';
import { Button, ErrorMessage, Screen, Text } from '@/shared/ui/primitives';
import { PreferencesControls } from '@/shared/preferences/preferences-controls';
import { useTheme } from '@/shared/theme/use-theme';
import { RouteLink } from '@/shared/ui/route-link';

export function DashboardScreen() {
  const { t } = useTranslation();
  const { tokens } = useTheme();
  const { state, repository: auth } = useAuth();
  const profiles = useProfileRepository();
  const [error, setError] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const userId = state.session?.userId;
  const profile = useQuery({
    queryKey: ['profile', userId],
    queryFn: () => profiles.findByUserId(userId!),
    enabled: !!userId,
  });
  return (
    <Screen>
      <Text
        accessibilityRole="header"
        style={{ fontSize: tokens.typography.title }}
      >
        {t('common.appName')}
      </Text>
      <Text>{t('dashboard.intro')}</Text>
      {profile.isPending ? (
        <Text>{t('dashboard.loadingProfile')}</Text>
      ) : profile.isError ? (
        <>
          <ErrorMessage message={t('errors.profile')} />
          <Button
            title={t('dashboard.retryProfile')}
            onPress={() => {
              void profile.refetch();
            }}
          />
        </>
      ) : (
        <Text>
          {profile.data?.displayName
            ? t('dashboard.greeting', { name: profile.data.displayName })
            : profile.data
              ? t('dashboard.signedIn')
              : t('dashboard.noProfile')}
        </Text>
      )}
      <Text>{t('dashboard.noHabits')}</Text>
      <RouteLink href="/(tabs)/habits">{t('habits.title')}</RouteLink>
      <PreferencesControls />
      {error && <ErrorMessage message={t('errors.signOut')} />}
      <Button
        title={t('auth.signOut')}
        loading={signingOut}
        onPress={() => {
          setSigningOut(true);
          setError(false);
          void auth
            .signOut()
            .catch(() => setError(true))
            .finally(() => setSigningOut(false));
        }}
      />
    </Screen>
  );
}

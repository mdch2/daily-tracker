import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/features/auth/presentation/auth-provider';
import { useProfileRepository } from '@/features/profile/presentation/profile-context';
import { Button, ErrorMessage, Screen, Text } from '@/shared/ui/primitives';
import { useThemePreference } from '@/shared/theme/use-theme';

export function DashboardScreen() {
  const { state, repository: auth } = useAuth();
  const profiles = useProfileRepository();
  const setTheme = useThemePreference((value) => value.setPreference);
  const theme = useThemePreference((value) => value.preference);
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
      <Text accessibilityRole="header" style={{ fontSize: 26 }}>
        Daily Tracker
      </Text>
      <Text>
        Base técnica del MVP. Los módulos se incorporarán progresivamente.
      </Text>
      {profile.isPending ? (
        <Text>Cargando perfil…</Text>
      ) : profile.isError ? (
        <>
          <ErrorMessage message="No se pudo cargar el perfil." />
          <Button
            title="Reintentar perfil"
            onPress={() => {
              void profile.refetch();
            }}
          />
        </>
      ) : (
        <Text>
          {profile.data?.displayName
            ? `Hola, ${profile.data.displayName}`
            : profile.data
              ? 'Sesión iniciada.'
              : 'Todavía no hay un perfil disponible.'}
        </Text>
      )}
      <Text>
        No hay hábitos ni métricas implementados en esta configuración inicial.
      </Text>
      <Button
        title={`Tema: ${theme}`}
        onPress={() =>
          setTheme(
            theme === 'system'
              ? 'light'
              : theme === 'light'
                ? 'dark'
                : 'system',
          )
        }
      />
      {error && (
        <ErrorMessage message="No se pudo cerrar la sesión. Vuelve a intentarlo." />
      )}
      <Button
        title="Cerrar sesión en este dispositivo"
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

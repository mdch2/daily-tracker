import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, ErrorMessage } from '@/shared/ui/primitives';
import { useAuth } from './auth-provider';

export function SignOutButton() {
  const { t } = useTranslation();
  const { repository } = useAuth();
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  return (
    <>
      {error && <ErrorMessage message={t('errors.signOut')} />}
      <Button
        title={t('auth.signOut')}
        variant="secondary"
        loading={busy}
        onPress={() => {
          setBusy(true);
          setError(false);
          void repository
            .signOut()
            .catch(() => setError(true))
            .finally(() => setBusy(false));
        }}
      />
    </>
  );
}
